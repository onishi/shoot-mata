function cloneSnapshot(snapshot) {
  return JSON.parse(JSON.stringify(snapshot));
}

function snapshotKey(snapshot) {
  return JSON.stringify(snapshot);
}

export function automaticCombatCommand(simulation) {
  const activeHazard = (behaviorId) => simulation.schedule.hazards.find(({ behaviorId: id, startTick, endTick }) => (
    id === behaviorId && simulation.tick >= startTick && simulation.tick < endTick
  ));
  const heatwave = activeHazard("periodic-heatwave");
  const safeZone = activeHazard("destruction-safe-zone");
  const stellarFurnace = simulation.schedule.hazards.some(({ behaviorId }) => behaviorId === "periodic-heatwave");
  const livingTissue = simulation.schedule.hazards.some(({ behaviorId, startTick, endTick }) => (
    ["reactive-tissue", "growth-source", "contracting-tissue"].includes(behaviorId)
      && simulation.tick >= startTick
      && simulation.tick < endTick
  ));
  const incomingShot = simulation.enemyShots
    .filter(({ x }) => x > simulation.player.x && x - simulation.player.x < 0.24)
    .sort((left, right) => left.x - right.x)[0];
  if (stellarFurnace) {
    let targetY = simulation.boss?.y ?? simulation.enemies[0]?.y ?? 0.5;
    if (simulation.tick >= 1620 && simulation.tick < 1680) targetY = 0.24;
    if (heatwave) {
      const elapsed = simulation.tick - heatwave.startTick;
      const nextWave = Math.ceil(elapsed / 180);
      const approachingPulse = nextWave * 180 - elapsed <= 50;
      const waveIndex = approachingPulse ? nextWave : Math.floor(elapsed / 180);
      targetY = waveIndex % 2 === 0 ? 0.24 : 0.76;
    }
    if (simulation.tick >= 2340 && simulation.tick < 2400) {
      targetY = [0.26, 0.5, 0.74][simulation.destroyedEnemyCount % 3];
    }
    if (safeZone) {
      const center = [0.26, 0.5, 0.74][simulation.destroyedEnemyCount % 3];
      const elapsed = simulation.tick - safeZone.startTick;
      const ticksToPulse = Math.ceil(elapsed / 120) * 120 - elapsed;
      targetY = ticksToPulse <= 35 || ticksToPulse === 120
        ? center
        : incomingShot
          ? (incomingShot.y >= simulation.player.y ? 0.18 : 0.82)
          : center;
    } else if (heatwave && incomingShot) {
      targetY += incomingShot.y >= simulation.player.y ? -0.14 : 0.14;
    } else if (!simulation.boss && incomingShot) {
      targetY = incomingShot.y >= simulation.player.y ? 0.3 : 0.7;
    }
    const safeDelta = targetY - simulation.player.y;
    return { moveY: Math.abs(safeDelta) < 0.025 ? 0 : Math.sign(safeDelta), fire: true };
  }
  if (livingTissue) {
    const targetY = simulation.boss || !incomingShot
      ? 0.5
      : (incomingShot.y >= simulation.player.y ? 0.38 : 0.62);
    const safeDelta = targetY - simulation.player.y;
    return { moveY: Math.abs(safeDelta) < 0.025 ? 0 : Math.sign(safeDelta), fire: true };
  }
  const shutter = simulation.schedule.hazards.find(({ behaviorId, startTick, endTick }) => (
    behaviorId === "shutter-cover" && simulation.tick >= startTick && simulation.tick < endTick
  ));
  const chargedCloud = simulation.schedule.hazards.find(({ behaviorId, startTick, endTick }) => (
    behaviorId === "charged-cloud" && simulation.tick >= startTick && simulation.tick < endTick
  ));
  if (shutter) {
    const openingY = Math.floor((simulation.tick - shutter.startTick) / 240) % 2 === 0 ? 0.3 : 0.7;
    const safeY = chargedCloud
      ? (Math.floor((simulation.tick - chargedCloud.startTick) / 180) % 2 === 0
        ? Math.max(openingY, 0.51)
        : Math.min(openingY, 0.49))
      : openingY;
    const safeDelta = safeY - simulation.player.y;
    return { moveY: Math.abs(safeDelta) < 0.02 ? 0 : Math.sign(safeDelta), fire: true };
  }
  const target = simulation.boss && !simulation.boss.defeated
    ? simulation.boss
    : simulation.enemies[0];
  const delta = (target?.y ?? 0.5) - simulation.player.y;
  return {
    moveY: Math.abs(delta) < 0.025 ? 0 : Math.sign(delta),
    fire: true,
  };
}

export function createAutomaticPlaythrough(options = {}) {
  const targetAttempts = options.targetAttempts ?? 2;
  const screenHoldTicks = options.screenHoldTicks ?? 30;
  const stageIndex = options.stageIndex ?? 0;
  if (!Number.isInteger(targetAttempts) || targetAttempts < 1) {
    throw new TypeError("targetAttempts must be a positive integer");
  }
  if (!Number.isInteger(screenHoldTicks) || screenHoldTicks < 0) {
    throw new TypeError("screenHoldTicks must be a non-negative integer");
  }
  if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex > 3) {
    throw new TypeError("stageIndex must be an integer from 0 to 3");
  }

  const milestones = new Set();
  const completedRuns = [];
  let previousScreen = null;
  let screenAge = 0;
  let stopped = false;
  let failure = null;

  function markSimulationMilestones(simulation) {
    if (!simulation) return;
    if (simulation.tick >= 180) milestones.add("normal-combat");
    if (simulation.tick >= 1500) milestones.add([
      "closing-corridor",
      "charged-shutters",
      "living-tissue",
      "stellar-heatwave",
    ][stageIndex] ?? "stage-setpiece");
    for (const event of simulation.events ?? []) {
      if (event.type === "hazard-growth-pulsed") milestones.add("growth-source");
      if (event.type === "hazard-tissue-contracted") milestones.add("contracting-tissue");
      if (event.type === "hazard-heatwave-pulsed") milestones.add("periodic-heatwave");
      if (event.type === "hazard-safe-zone-changed") milestones.add("destruction-safe-zone");
      if (event.type === "boss-entered") milestones.add(`boss:${simulation.boss.phases[0].id}`);
      if (event.type === "boss-phase-changed") milestones.add(`boss:${event.phaseId}`);
      if (event.type === "boss-defeated") milestones.add("boss-defeated");
      if (event.type === "stage-cleared") milestones.add("stage-cleared");
    }
  }

  function observe(session) {
    markSimulationMilestones(session.simulation);
    if (session.flow.screen === "gameOver") {
      failure = `attempt ${session.flow.attempt} ended in gameOver`;
      stopped = true;
    }
    if (session.flow.screen === "result"
      && completedRuns.length < session.flow.attempt
      && session.lastRun) {
      completedRuns.push(cloneSnapshot(session.lastRun));
      milestones.add(`result:${session.flow.attempt}`);
      if (completedRuns.length >= targetAttempts) stopped = true;
    }
  }

  function nextCommand(session) {
    observe(session);
    const screen = session.flow.screen;
    if (screen !== previousScreen) {
      previousScreen = screen;
      screenAge = 0;
    } else {
      screenAge += 1;
    }
    if (stopped) return {};

    if (screen === "playing") return automaticCombatCommand(session.simulation);
    if (screen === "title" && stageIndex > 0 && screenAge >= screenHoldTicks) {
      return { openStageSelect: true };
    }
    if (screen === "stageSelect" && screenAge >= screenHoldTicks) {
      return { stageIndex };
    }
    if (["title", "tutorial", "stageIntro", "result"].includes(screen)
      && screenAge >= screenHoldTicks) {
      if (screen === "result") milestones.add("retry-requested");
      return { confirm: true };
    }
    return {};
  }

  function status(session) {
    const replayMatches = completedRuns.length < 2
      ? null
      : completedRuns.slice(1).every((run) => snapshotKey(run) === snapshotKey(completedRuns[0]));
    return Object.freeze({
      active: true,
      stopped,
      failure,
      screen: session.flow.screen,
      attempt: session.flow.attempt,
      tick: session.simulation?.tick ?? session.lastRun?.tick ?? 0,
      completedAttempts: completedRuns.length,
      targetAttempts,
      replayMatches,
      milestones: Object.freeze([...milestones]),
    });
  }

  return Object.freeze({ nextCommand, observe, status });
}

export function createAutomaticCampaignPlaythrough(options = {}) {
  const screenHoldTicks = options.screenHoldTicks ?? 30;
  if (!Number.isInteger(screenHoldTicks) || screenHoldTicks < 0) {
    throw new TypeError("screenHoldTicks must be a non-negative integer");
  }
  const milestones = new Set();
  let previousScreen = null;
  let screenAge = 0;
  let stopped = false;
  let failure = null;

  function observe(session) {
    if (session.flow.screen === "result" && session.lastRun) {
      milestones.add(`stage-${session.flow.stageIndex + 1}-clear`);
    }
    if (session.flow.screen === "ending") milestones.add("ending");
    if (session.flow.screen === "credits") {
      milestones.add("credits");
      stopped = true;
    }
    if (session.flow.screen === "gameOver") {
      failure = `stage ${session.flow.stageIndex + 1} ended in gameOver`;
      stopped = true;
    }
  }

  function nextCommand(session) {
    observe(session);
    const screen = session.flow.screen;
    if (screen !== previousScreen) {
      previousScreen = screen;
      screenAge = 0;
    } else {
      screenAge += 1;
    }
    if (stopped || screenAge < screenHoldTicks) return {};
    if (screen === "playing") return automaticCombatCommand(session.simulation);
    if (["title", "tutorial", "stageIntro", "ending"].includes(screen)) return { confirm: true };
    if (screen === "result") return { advance: true };
    return {};
  }

  function status(session) {
    return Object.freeze({
      active: true,
      mode: "campaign",
      stopped,
      failure,
      screen: session.flow.screen,
      attempt: session.flow.attempt,
      tick: session.simulation?.tick ?? session.lastRun?.tick ?? 0,
      completedAttempts: session.campaignRuns.filter(Boolean).length,
      replayMatches: null,
      milestones: Object.freeze([...milestones]),
    });
  }

  return Object.freeze({ nextCommand, observe, status });
}

export function createAutomaticFailureReview(options = {}) {
  const screenHoldTicks = options.screenHoldTicks ?? 30;
  if (!Number.isInteger(screenHoldTicks) || screenHoldTicks < 0) {
    throw new TypeError("screenHoldTicks must be a non-negative integer");
  }
  const milestones = new Set();
  let previousScreen = null;
  let screenAge = 0;
  let stopped = false;
  let failure = null;

  function observe(session) {
    if (session.flow.screen !== "gameOver" || stopped) return;
    const record = session.lastRun?.failure;
    if (!record || typeof record.reason !== "string" || !Array.isArray(record.coreQueueBefore)) {
      failure = "gameOver did not retain a failure review";
    } else {
      milestones.add(`failure:${record.reason}`);
      milestones.add("core-queue-recorded");
      milestones.add("retry-available");
    }
    stopped = true;
  }

  function nextCommand(session) {
    observe(session);
    const screen = session.flow.screen;
    if (screen !== previousScreen) {
      previousScreen = screen;
      screenAge = 0;
    } else {
      screenAge += 1;
    }
    if (stopped || screenAge < screenHoldTicks) return {};
    if (["title", "tutorial", "stageIntro"].includes(screen)) return { confirm: true };
    return {};
  }

  function status(session) {
    return Object.freeze({
      active: true,
      mode: "failure-review",
      stopped,
      failure,
      screen: session.flow.screen,
      attempt: session.flow.attempt,
      tick: session.simulation?.tick ?? session.lastRun?.tick ?? 0,
      completedAttempts: stopped && failure === null ? 1 : 0,
      replayMatches: null,
      milestones: Object.freeze([...milestones]),
    });
  }

  return Object.freeze({ nextCommand, observe, status });
}
