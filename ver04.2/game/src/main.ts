import './style.css';
import { advance, autoPause, createAppState, transition, type AppAction } from './app/app';
import { TICK_RATE, type InputFrame } from './core/types';
import { renderApp } from './render/render';
import { assetsReady } from './render/visual-assets';
import { createPilot } from './simulation/autopilot';
import { apocryphaTwinPoint, createInitialState, eelSegmentPoint } from './simulation/game';
import { STAGE_01_BOSS_START_TICK, STAGE_01_SPAWNS } from './content/stage-01';
import { STAGE_02_BOSS_START_TICK, STAGE_02_SPAWNS } from './content/stage-02';
import { STAGE_03_BOSS_START_TICK, STAGE_03_SPAWNS } from './content/stage-03';
import { STAGE_04_BOSS_START_TICK, STAGE_04_SPAWNS, stageFourCoolingCenter } from './content/stage-04';
import { STAGE_05_BOSS_START_TICK, STAGE_05_DURATION_TICKS, STAGE_05_SPAWNS } from './content/stage-05';
import { STAGE_06_BOSS_START_TICK, STAGE_06_SPAWNS, STAGE_06_SYNTHESIS_START_TICK } from './content/stage-06';
import { StageOneAudio } from './audio/stage-01-audio';
import { clearCampaign, loadCampaign, saveCampaign, type StorageLike } from './app/save';
import { defaultSettings, loadSettings, saveSettings, type GameSettings } from './app/settings';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const status = document.querySelector<HTMLElement>('#status');
if (!canvas || !status) throw new Error('Required game elements are missing');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D is unavailable');

const browserStorage = (): StorageLike | null => {
  try { return window.localStorage; } catch { return null; }
};
const storage = browserStorage();
const TUTORIAL_KEY = 'palimpsest-wake:v4.2:first-wake-complete';
const tutorialCompleted = (() => {
  if (!storage) return false;
  try { return storage.getItem(TUTORIAL_KEY) === '1'; } catch { return false; }
})();
const loaded = storage ? loadCampaign(storage) : { status: 'unavailable' as const, state: null };
let savedApp = loaded.state;
const initialSettings = storage ? (loadSettings(storage) ?? defaultSettings()) : defaultSettings();
let app = createAppState(404, initialSettings, !tutorialCompleted);
app.saveAvailable = savedApp !== null;
app.saveWarning = loaded.status === 'unavailable' || loaded.status === 'quarantined';
const audio = new StageOneAudio();
const applyAudioSettings = (settings: GameSettings): void => {
  const bgm = settings.bgm / 100; const se = settings.se / 100;
  audio.setBusLevel('music', bgm); audio.setBusLevel('environment', bgm);
  audio.setBusLevel('se', se); audio.setBusLevel('ui', se);
};
applyAudioSettings(app.settings);
let accumulator = 0;
let previousTime = performance.now();
const held = new Set<string>();
const pulses = { collate: false, retrace: false };
const matches = (code: string, values: string[]): boolean => values.includes(code);

const applyAction = (action: AppAction): void => {
  const before = app.screen;
  const beforeCheckpoint = app.checkpointName;
  const beforeContinues = app.continuesRemaining;
  app = transition(app, action);
  if (app.saveWarning && before !== app.screen) app.saveWarning = false;
  const shouldSave = (app.screen === 'stage-intro'
    && (before === 'title' || app.checkpointName !== beforeCheckpoint || app.continuesRemaining !== beforeContinues))
    || (before === 'marginalia' && app.screen === 'playing' && action === 'confirm');
  if (shouldSave) persistCheckpoint();
  if (app.screen === 'ending' && storage) {
    clearCampaign(storage); savedApp = null; app.saveAvailable = false;
  }
  if (before !== app.screen) {
    audio.playUi(action === 'back');
    audio.setScreen(app.screen, app.game.tick, app.game.stageId);
    held.clear();
    pulses.collate = false;
    pulses.retrace = false;
    accumulator = 0;
  }
};

const persistCheckpoint = (): void => {
  if (!storage || !saveCampaign(storage, app)) {
    app.saveAvailable = savedApp !== null;
    if (!app.saveWarning) app.saveWarning = true;
    return;
  }
  const refreshed = loadCampaign(storage);
  savedApp = refreshed.state;
  app.saveAvailable = savedApp !== null;
};

const continueSavedVoyage = (): void => {
  if (!savedApp) return;
  app = { ...savedApp, settings: app.settings };
  const refreshed = storage ? loadCampaign(storage) : null;
  if (refreshed?.state) savedApp = refreshed.state;
  app.saveAvailable = true; app.saveWarning = false;
  audio.playUi(false); audio.setScreen(app.screen, app.game.tick, app.game.stageId);
  held.clear(); pulses.collate = false; pulses.retrace = false; accumulator = 0;
};

const settingKeys: Array<keyof GameSettings> = ['bgm', 'se', 'screenShake', 'reducedFlash', 'difficulty'];
const changeSetting = (direction: -1 | 1): void => {
  const key = settingKeys[app.settingsIndex];
  const settings = { ...app.settings };
  if (key === 'bgm' || key === 'se') settings[key] = Math.max(0, Math.min(100, settings[key] + direction * 5));
  else if (key === 'screenShake' || key === 'reducedFlash') settings[key] = !settings[key];
  else {
    const values: GameSettings['difficulty'][] = ['echo', 'normal', 'proof'];
    settings.difficulty = values[(values.indexOf(settings.difficulty) + direction + values.length) % values.length];
  }
  app = { ...app, settings, settingsWarning: false };
  applyAudioSettings(settings);
  if (!storage || !saveSettings(storage, settings)) app.settingsWarning = true;
  audio.playUi(false);
};

window.addEventListener('keydown', (event) => {
  void audio.ensureStarted();
  const { code } = event;
  if (!event.repeat) {
    if (app.screen === 'title' && code === 'KeyG') applyAction('guide');
    else if (app.screen === 'title' && code === 'KeyS') applyAction('settings');
    else if (app.screen === 'title' && code === 'KeyC') continueSavedVoyage();
    else if (app.screen === 'title' && matches(code, ['Enter', 'Space', 'KeyN'])) applyAction('start');
    else if (app.screen === 'guide' && matches(code, ['Enter', 'Escape', 'Backspace'])) applyAction(code === 'Enter' ? 'confirm' : 'back');
    else if (app.screen === 'settings' && matches(code, ['Escape', 'Backspace'])) applyAction('back');
    else if (app.screen === 'settings' && code === 'ArrowUp') { app.settingsIndex = (app.settingsIndex + settingKeys.length - 1) % settingKeys.length; audio.playUi(false); }
    else if (app.screen === 'settings' && code === 'ArrowDown') { app.settingsIndex = (app.settingsIndex + 1) % settingKeys.length; audio.playUi(false); }
    else if (app.screen === 'settings' && matches(code, ['ArrowLeft', 'ArrowRight', 'Enter', 'Space'])) changeSetting(code === 'ArrowLeft' ? -1 : 1);
    else if (app.screen === 'stage-intro' && matches(code, ['Enter', 'Space'])) applyAction('confirm');
    else if (app.screen === 'stage-intro' && code === 'Escape') applyAction('back');
    else if (app.screen === 'playing' && matches(code, ['Escape', 'KeyP'])) applyAction('pause');
    else if (app.screen === 'paused' && matches(code, ['Escape', 'KeyP', 'Enter'])) applyAction(code === 'Enter' ? 'confirm' : 'pause');
    else if (app.screen === 'paused' && code === 'KeyS') applyAction('settings');
    else if (app.screen === 'paused' && code === 'Backspace') applyAction('back');
    else if (app.screen === 'continue' && code === 'Enter') applyAction('confirm');
    else if (app.screen === 'continue' && code === 'Escape') applyAction('back');
    else if (app.screen === 'result' && matches(code, ['Enter', 'Escape'])) applyAction(code === 'Enter' ? 'confirm' : 'back');
    else if (app.screen === 'marginalia' && matches(code, ['ArrowLeft', 'ArrowUp'])) { app.marginaliaIndex = (app.marginaliaIndex + 2) % 3; audio.playUi(false); }
    else if (app.screen === 'marginalia' && matches(code, ['ArrowRight', 'ArrowDown'])) { app.marginaliaIndex = (app.marginaliaIndex + 1) % 3; audio.playUi(false); }
    else if (app.screen === 'marginalia' && matches(code, ['Enter', 'Space', 'Escape'])) applyAction(code === 'Escape' ? 'back' : 'confirm');
    else if ((app.screen === 'ending' || app.screen === 'campaign-result') && matches(code, ['Enter', 'Escape'])) applyAction(code === 'Enter' ? 'confirm' : 'back');
    else if (app.screen === 'playing' && matches(code, ['KeyX', 'KeyK'])) pulses.collate = true;
    else if (app.screen === 'playing' && matches(code, ['KeyC', 'KeyL'])) pulses.retrace = true;
  }
  if (app.screen === 'playing') held.add(code);
  if (matches(code, ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'])) event.preventDefault();
});
window.addEventListener('keyup', (event) => held.delete(event.code));
const pauseForFocusLoss = (): void => {
  app = autoPause(app);
  audio.setScreen(app.screen, app.game.tick, app.game.stageId);
  held.clear();
  pulses.collate = false;
  pulses.retrace = false;
};
window.addEventListener('blur', pauseForFocusLoss);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseForFocusLoss(); });

const input = (): InputFrame => ({
  up: held.has('ArrowUp') || held.has('KeyW'),
  down: held.has('ArrowDown') || held.has('KeyS'),
  left: held.has('ArrowLeft') || held.has('KeyA'),
  right: held.has('ArrowRight') || held.has('KeyD'),
  fire: held.has('KeyZ') || held.has('KeyJ'),
  collate: pulses.collate,
  retrace: pulses.retrace
});

const runStep = (frameInput: InputFrame): void => {
  const checkpointBefore = app.checkpointName;
  const tutorialProgressBefore = [app.tutorial.movedAt, app.tutorial.firedAt, app.tutorial.collatedAt, app.tutorial.reflectedAt].filter((tick) => tick !== null).length;
  const result = advance(app, frameInput);
  app = result.state;
  if (app.checkpointName !== checkpointBefore) persistCheckpoint();
  for (const event of result.events) audio.playEvent(event, app.game.stageId);
  const tutorialProgressAfter = [app.tutorial.movedAt, app.tutorial.firedAt, app.tutorial.collatedAt, app.tutorial.reflectedAt].filter((tick) => tick !== null).length;
  if (tutorialProgressAfter > tutorialProgressBefore) {
    audio.playUi(false);
    status.textContent = app.tutorial.feedback === 'FIRE RETURNED'
      ? 'First Wake complete. Captured fire returns to its source.'
      : `${app.tutorial.feedback ?? 'First Wake progress'}. Keep writing.`;
    if (app.tutorial.completedAt !== null && storage) {
      try { storage.setItem(TUTORIAL_KEY, '1'); } catch { /* The voyage remains playable without preference storage. */ }
    }
  }
  audio.setScreen(app.screen, app.game.tick, app.game.stageId);
  if (result.events.some((event) => event.type === 'loop-collated')) status.textContent = 'COLLATE succeeded. Captured fire has been returned.';
  if (app.screen === 'continue') status.textContent = 'The wake broke. Continue from the checkpoint or return to title.';
  if (app.screen === 'result') status.textContent = app.game.stageId === 'stage-01'
    ? 'Stage 1 complete. Continue into the Crosswind Index.'
    : app.game.stageId === 'stage-02'
      ? 'Stage 2 complete. Continue into the Rain-Annotated Gallery.'
      : app.game.stageId === 'stage-03'
        ? 'Stage 3 complete. Continue into the Burnt Footnote.'
        : app.game.stageId === 'stage-04'
          ? 'Stage 4 complete. Continue into the Mirror Chamber.'
          : app.game.stageId === 'stage-05'
            ? 'Stage 5 complete. Continue into Dawn of the Original.'
            : 'Stage 6 complete. Continue into the first unwritten dawn.';
  if (app.screen === 'marginalia') status.textContent = 'Choose one marginal note. The simulation remains paused while you decide.';
};

const frame = (now: number): void => {
  const elapsed = Math.min(250, now - previousTime);
  previousTime = now;
  if (app.screen === 'playing') {
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= 1000 / TICK_RATE && steps < 8 && app.screen === 'playing') {
      runStep(input());
      pulses.collate = false;
      pulses.retrace = false;
      accumulator -= 1000 / TICK_RATE;
      steps += 1;
    }
    if (steps === 8) accumulator = 0;
  } else accumulator = 0;
  renderApp(ctx, app);
  if (app.screen === 'playing') audio.updateMix(app.game);
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

Object.assign(window, {
  __PALIMPSEST_ASSETS_READY__: assetsReady,
  __PALIMPSEST_AUDIO_READY__: () => audio.ensureStarted(),
  __PALIMPSEST_AUDIO_STATE__: () => audio.snapshot(),
  __PALIMPSEST_AUDIO_BUS__: (bus: 'music' | 'se' | 'ui' | 'environment', level: number) => audio.setBusLevel(bus, level),
  __PALIMPSEST_STATE__: () => app.game,
  __PALIMPSEST_APP_STATE__: () => app,
  __PALIMPSEST_ADVANCE__: (ticks: number) => {
    const count = Math.max(0, Math.min(36000, Math.floor(ticks)));
    for (let index = 0; index < count && app.screen === 'playing'; index += 1) runStep({});
    renderApp(ctx, app);
    return app.game.tick;
  },
  __PALIMPSEST_AUTOPLAY__: (ticks: number) => {
    const count = Math.max(0, Math.min(36000, Math.floor(ticks)));
    const pilot = createPilot('stitch');
    for (let index = 0; index < count && app.screen === 'playing'; index += 1) runStep(pilot(app.game));
    renderApp(ctx, app);
    return app.game.tick;
  },
  __PALIMPSEST_RENDER_BENCHMARK__: (frames: number) => {
    const count = Math.max(1, Math.min(3600, Math.floor(frames)));
    const samples: number[] = [];
    for (let index = 0; index < count; index += 1) {
      const started = performance.now();
      renderApp(ctx, app);
      samples.push(performance.now() - started);
    }
    return samples;
  },
  __PALIMPSEST_QA_SCENARIO__: (scenario: 'damage' | 'setpiece' | 'stage-02-combat' | 'stage-02-setpiece' | 'stage-03-combat' | 'stage-03-setpiece' | 'stage-03-boss' | 'stage-04-combat' | 'stage-04-setpiece' | 'stage-04-boss' | 'stage-05-combat' | 'stage-05-setpiece' | 'stage-05-boss' | 'stage-06-combat' | 'stage-06-setpiece' | 'stage-06-boss' | 'boss-gate' | 'boss-defeat' | 'stage-02-boss') => {
    if (app.screen !== 'playing') return app.screen;
    if (scenario === 'stage-06-boss') {
      app.game = createInitialState(3622, 'stage-06');
      app.game.player.invulnerableUntil = 100000;
      app.game.tick = STAGE_06_BOSS_START_TICK - 1;
      app.game.encounterIndex = STAGE_06_SPAWNS.length;
      app.game.enemies = []; app.game.player.x = 560 * 256;
      runStep({});
      const editor = app.game.boss!;
      editor.phase = 1;
      editor.health = editor.maxHealth;
      editor.phaseStartedAt = app.game.tick;
      editor.cycleStartedAt = app.game.tick;
      editor.editorRule = 4;
      editor.editorRulesMask = 0;
      app.game.metrics.editor.phaseReached = [true, false, false];
      app.game.bullets = [{
        id: app.game.nextId++, x: 900 * 256, y: 300 * 256, vx: 0, vy: 0,
        radius: 9, kind: 'enemy', annotated: false, capturable: true, sourceAttack: 'editor-mirror'
      }];
      // The audio audit shares this scenario but must not mutate the captured
      // phase. Exercise the two interaction-only cues explicitly, then leave
      // the returned state at the real phase-1 boundary above.
      audio.playEvent({ type: 'editor-rule-rewritten', rule: 4 }, 'stage-06');
      audio.playEvent({ type: 'editor-signature-closed' }, 'stage-06');
    } else if (scenario === 'stage-06-combat' || scenario === 'stage-06-setpiece') {
      app.game = createInitialState(3601, 'stage-06');
      // These QA scenarios jump beyond the campaign midpoint. Mark its choice
      // as consumed so advance() keeps simulating instead of pausing after the
      // first injected tick on the marginalia screen.
      app.midpointMarginaliaTaken = true;
      app.game.player.invulnerableUntil = 50000;
      if (scenario === 'stage-06-setpiece') {
        const setpieceIndex = STAGE_06_SPAWNS.findIndex((spawn) => spawn.tick === STAGE_06_SYNTHESIS_START_TICK);
        app.game.tick = STAGE_06_SYNTHESIS_START_TICK - 1; app.game.encounterIndex = setpieceIndex;
      }
      const pilot = createPilot('stitch');
      if (scenario === 'stage-06-setpiece') {
        for (let attempt = 0; attempt < 8 && app.game.metrics.original!.bindingLinks === 0; attempt += 1) {
          const wasp = app.game.enemies.find((enemy) => enemy.kind === 'binding-wasp');
          if (!wasp) { runStep({}); continue; }
          app.game.trail = [
            { x: 300 * 256, y: 240 * 256, bornTick: app.game.tick, segmentId: 1 },
            { x: 620 * 256, y: 480 * 256, bornTick: app.game.tick, segmentId: 1 }
          ];
          app.game.candidate = null; wasp.fireCooldown = 0; runStep({});
        }
        // Emit the choir response before the synchronous QA fast-forward can
        // fill the environment voice pool with later synthesis effects.
        app.game.enemies.push({
          id: app.game.nextId++, kind: 'null-choir', x: 1160 * 256, y: 360 * 256,
          health: 118, maxHealth: 118, markedUntil: app.game.tick + 120, fireCooldown: -1,
          radius: 34, baseY: 360, amplitude: 46, phase: 0, spawnedAt: app.game.tick - 100,
          expiresAt: app.game.tick + 3180, spawnX: 1160 * 256, lane: 1, groupId: 5,
          state: 'active', stateTick: app.game.tick
        });
        runStep({});
      }
      const ticks = scenario === 'stage-06-combat' ? 5200 : 2050;
      for (let index = 0; index < ticks; index += 1) {
        const choir = app.game.enemies.find((enemy) => enemy.kind === 'null-choir');
        if (scenario === 'stage-06-setpiece' && choir && app.game.metrics.original!.choirHoles === 0) {
          choir.markedUntil = app.game.tick + 120; choir.fireCooldown = -1;
          runStep({});
          continue;
        }
        runStep(pilot(app.game));
      }
    } else if (scenario === 'stage-05-boss') {
      app.game = createInitialState(3517, 'stage-05');
      app.game.player.invulnerableUntil = 80000;
      app.game.tick = STAGE_05_BOSS_START_TICK - 1;
      app.game.encounterIndex = STAGE_05_SPAWNS.length;
      app.game.enemies = []; app.game.player.x = 620 * 256;
      runStep({});
      app.game.candidate = { polygon: [
        { x: 850 * 256, y: 190 * 256 }, { x: 1210 * 256, y: 190 * 256 },
        { x: 1210 * 256, y: 530 * 256 }, { x: 850 * 256, y: 530 * 256 }
      ], intersection: { x: 850 * 256, y: 190 * 256 }, startIndex: 0, area: 122400, expiresTick: app.game.tick + 60 };
      runStep({ collate: true });
      const vulnerable = apocryphaTwinPoint(app.game.boss!, app.game.tick + 1, app.game.boss!.vulnerableTwin);
      app.game.bullets.push({ id: app.game.nextId++, ...vulnerable, vx: 0, vy: 0, radius: 5, kind: 'player', annotated: true, falseAnnotated: true, capturable: false });
      runStep({});
      for (let index = 0; index < 140; index += 1) runStep({});
    } else if (scenario === 'stage-05-combat' || scenario === 'stage-05-setpiece') {
      app.game = createInitialState(3501, 'stage-05');
      app.game.player.invulnerableUntil = 40000;
      if (scenario === 'stage-05-setpiece') {
        const setpieceIndex = STAGE_05_SPAWNS.findIndex((spawn) => spawn.tick === 14040);
        app.game.tick = 14039; app.game.encounterIndex = setpieceIndex;
      }
      const pilot = createPilot('stitch');
      const ticks = scenario === 'stage-05-combat' ? 5600 : 620;
      for (let index = 0; index < ticks; index += 1) {
        if (app.game.metrics.mirror!.illusoryShots === 0) {
          const source = app.game.enemies.find((enemy) => enemy.kind === 'false-witness' || enemy.kind === 'silver-obelisk');
          if (source) {
            source.fireCooldown = -1;
            runStep({});
            continue;
          }
        }
        runStep(pilot(app.game));
      }
    } else if (scenario === 'stage-04-boss') {
      app.game = createInitialState(3412, 'stage-04');
      app.game.player.invulnerableUntil = 80000;
      app.game.tick = STAGE_04_BOSS_START_TICK - 1;
      app.game.encounterIndex = STAGE_04_SPAWNS.length;
      app.game.enemies = []; app.game.player.x = 620 * 256;
      runStep({});
      const pilot = createPilot('stitch');
      for (let index = 0; index < 720; index += 1) runStep(pilot(app.game));
      app.game.bullets.push({ id: app.game.nextId++, x: 825 * 256, y: 300 * 256, vx: 4 * 256, vy: 0, radius: 10, kind: 'return', annotated: true, cooledEmber: true, capturable: false });
    } else if (scenario === 'stage-04-combat' || scenario === 'stage-04-setpiece') {
      app.game = createInitialState(3401, 'stage-04');
      app.game.player.invulnerableUntil = 30000;
      if (scenario === 'stage-04-setpiece') {
        const setpieceIndex = STAGE_04_SPAWNS.findIndex((spawn) => spawn.tick === 10620);
        app.game.tick = 10619; app.game.encounterIndex = setpieceIndex;
      }
      const pilot = createPilot('stitch');
      const ticks = scenario === 'stage-04-combat' ? 5600 : 520;
      for (let index = 0; index < ticks; index += 1) {
        runStep(pilot(app.game));
        if (scenario === 'stage-04-setpiece' && app.game.metrics.heat.courierConversions === 0) {
          const courier = app.game.enemies.find((enemy) => enemy.kind === 'ember-courier');
          if (!courier) continue;
          const radius = 70 * 256;
          app.game.candidate = { polygon: [
            { x: courier.x - radius, y: courier.y - radius }, { x: courier.x + radius, y: courier.y - radius },
            { x: courier.x + radius, y: courier.y + radius }, { x: courier.x - radius, y: courier.y + radius }
          ], intersection: { x: courier.x, y: courier.y }, startIndex: 0, area: 19600, expiresTick: app.game.tick + 60 };
          runStep({ collate: true });
        }
      }
      if (scenario === 'stage-04-combat' && app.game.metrics.heat.coolingCollates === 0) {
        const cooling = stageFourCoolingCenter(app.game.tick);
        const radius = 82 * 256;
        app.game.candidate = { polygon: [
          { x: cooling.x * 256 - radius, y: cooling.y * 256 - radius }, { x: cooling.x * 256 + radius, y: cooling.y * 256 - radius },
          { x: cooling.x * 256 + radius, y: cooling.y * 256 + radius }, { x: cooling.x * 256 - radius, y: cooling.y * 256 + radius }
        ], intersection: { x: cooling.x * 256, y: cooling.y * 256 }, startIndex: 0, area: 26896, expiresTick: app.game.tick + 60 };
        runStep({ collate: true });
      }
    } else if (scenario === 'stage-03-boss') {
      app.game = createInitialState(3307, 'stage-03');
      app.game.player.invulnerableUntil = 80000;
      app.game.tick = STAGE_03_BOSS_START_TICK - 1;
      app.game.encounterIndex = STAGE_03_SPAWNS.length;
      app.game.enemies = []; app.game.player.x = 650 * 256;
      runStep({});
      const boss = app.game.boss!; const segment = eelSegmentPoint(boss, app.game.tick, boss.activeSegment);
      app.game.candidate = { polygon: [
        { x: segment.x - 55 * 256, y: segment.y - 55 * 256 }, { x: segment.x + 55 * 256, y: segment.y - 55 * 256 },
        { x: segment.x + 55 * 256, y: segment.y + 55 * 256 }, { x: segment.x - 55 * 256, y: segment.y + 55 * 256 }
      ], intersection: segment, startIndex: 0, area: 12100, expiresTick: app.game.tick + 60 };
      runStep({ collate: true });
      const marked = eelSegmentPoint(app.game.boss!, app.game.tick + 1, app.game.boss!.activeSegment);
      app.game.bullets.push({ id: app.game.nextId++, ...marked, vx: 0, vy: 0, radius: 5, kind: 'player', annotated: true, wetAnnotated: true, capturable: false });
      runStep({});
      for (let index = 0; index < 140; index += 1) runStep({});
    } else if (scenario === 'stage-03-combat' || scenario === 'stage-03-setpiece') {
      app.game = createInitialState(3301, 'stage-03');
      app.game.player.invulnerableUntil = 30000;
      if (scenario === 'stage-03-setpiece') {
        const setpieceIndex = STAGE_03_SPAWNS.findIndex((spawn) => spawn.tick === 10620);
        app.game.tick = 10619; app.game.encounterIndex = setpieceIndex;
      }
      const pilot = createPilot('stitch');
      const ticks = scenario === 'stage-03-combat' ? 5200 : 420;
      for (let index = 0; index < ticks; index += 1) {
        if (app.game.metrics.rain.basinSurges === 0) {
          const bell = app.game.enemies.find((enemy) => enemy.kind === 'basin-bell');
          if (bell) bell.fireCooldown = 0;
        }
        runStep(pilot(app.game));
      }
    } else if (scenario === 'stage-02-boss') {
      app.game = createInitialState(3202, 'stage-02');
      app.game.player.invulnerableUntil = 50000;
      app.game.tick = STAGE_02_BOSS_START_TICK - 1;
      app.game.encounterIndex = STAGE_02_SPAWNS.length;
      app.game.enemies = [];
      app.game.player.x = 700 * 256;
      runStep({});
      const pilot = createPilot('stitch');
      for (let index = 0; index < 1500 && app.game.metrics.compiler.windLocks === 0; index += 1) runStep(pilot(app.game));
    } else if (scenario === 'stage-02-combat') {
      app.game = createInitialState(3202, 'stage-02');
      app.game.player.invulnerableUntil = 5000;
      const pilot = createPilot('stitch');
      for (let index = 0; index < 4800; index += 1) runStep(pilot(app.game));
      app.game.player.invulnerableUntil = 0;
    } else if (scenario === 'stage-02-setpiece') {
      app.game = createInitialState(3202, 'stage-02');
      const setpieceIndex = STAGE_02_SPAWNS.findIndex((spawn) => spawn.tick === 6840);
      app.game.tick = 6839;
      app.game.encounterIndex = setpieceIndex;
      runStep({});
      const pilot = createPilot('stitch');
      for (let index = 0; index < 240; index += 1) runStep(pilot(app.game));
    } else if (scenario === 'damage') {
      app.game.player.health = 1;
      app.game.player.invulnerableUntil = 0;
      app.game.bullets.push({ id: app.game.nextId++, x: app.game.player.x, y: app.game.player.y, vx: 0, vy: 0, radius: 8, kind: 'enemy', annotated: false, capturable: true });
    } else if (scenario === 'setpiece') {
      const setpieceIndex = STAGE_01_SPAWNS.findIndex((spawn) => spawn.tick === 6840);
      app.game.tick = 6839;
      app.game.encounterIndex = setpieceIndex;
      app.game.enemies = [];
      app.game.bullets = [];
      runStep({});
      app.game.tick = 8279;
      runStep({});
      const pilot = createPilot('stitch');
      for (let index = 0; index < 180 && app.screen === 'playing'; index += 1) runStep(pilot(app.game));
    } else if (scenario === 'boss-gate') {
      const bossStarts = { 'stage-01': STAGE_01_BOSS_START_TICK, 'stage-02': STAGE_02_BOSS_START_TICK, 'stage-03': STAGE_03_BOSS_START_TICK, 'stage-04': STAGE_04_BOSS_START_TICK, 'stage-05': STAGE_05_DURATION_TICKS, 'stage-06': STAGE_06_BOSS_START_TICK };
      const spawnCounts = { 'stage-01': STAGE_01_SPAWNS.length, 'stage-02': STAGE_02_SPAWNS.length, 'stage-03': STAGE_03_SPAWNS.length, 'stage-04': STAGE_04_SPAWNS.length, 'stage-05': STAGE_05_SPAWNS.length, 'stage-06': STAGE_06_SPAWNS.length };
      app.game.tick = bossStarts[app.game.stageId] - 1;
      app.game.encounterIndex = spawnCounts[app.game.stageId];
      app.game.enemies = [];
      app.game.bullets = [];
      runStep({});
    } else if (app.game.boss?.kind === 'last-editor') {
      app.game.boss.phase = 3;
      app.game.boss.phaseStartedAt = app.game.tick - 25 * TICK_RATE;
      app.game.boss.editorRulesMask = 0b11111;
      app.game.boss.signatureExposedUntil = app.game.tick + 60;
      app.game.boss.health = 1;
      app.game.bullets.push({ id: app.game.nextId++, x: app.game.boss.x, y: app.game.boss.y, vx: 0, vy: 0, radius: 5, kind: 'return', annotated: true, capturable: false });
    } else if (app.game.boss?.kind === 'cinder-advocate') {
      app.game.boss.health = 1;
      app.game.bullets.push({ id: app.game.nextId++, x: app.game.boss.x, y: app.game.boss.y, vx: 0, vy: 0, radius: 10, kind: 'return', annotated: true, cooledEmber: true, capturable: false });
    } else if (app.game.boss) {
      app.game.boss.armorLayers = 0;
      app.game.boss.health = 1;
      app.game.bullets.push({ id: app.game.nextId++, x: app.game.boss.x, y: app.game.boss.y, vx: 0, vy: 0, radius: 5, kind: 'return', annotated: true, capturable: false });
    }
    if (scenario !== 'boss-gate' && scenario !== 'setpiece' && scenario !== 'stage-02-combat' && scenario !== 'stage-02-setpiece' && scenario !== 'stage-03-combat' && scenario !== 'stage-03-setpiece' && scenario !== 'stage-03-boss' && scenario !== 'stage-04-combat' && scenario !== 'stage-04-setpiece' && scenario !== 'stage-04-boss' && scenario !== 'stage-05-combat' && scenario !== 'stage-05-setpiece' && scenario !== 'stage-06-combat' && scenario !== 'stage-06-setpiece' && scenario !== 'stage-06-boss' && scenario !== 'stage-02-boss') runStep({});
    renderApp(ctx, app);
    return app.screen;
  }
});
