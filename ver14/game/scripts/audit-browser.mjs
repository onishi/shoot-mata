import { writeFile } from "node:fs/promises";

const port = Number(process.env.TIDEBREAK_DEBUG_PORT || 9314);
const base = `http://127.0.0.1:${port}`;
const artifactPrefix = process.env.TIDEBREAK_AUDIT_PREFIX || "m1";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function target() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const targets = await fetch(`${base}/json`).then(response => response.json());
      const page = targets.find(item => item.type === "page");
      if (page) return page;
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome debugging target was not available");
}

const page = await target();
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id); pending.delete(message.id);
  message.error ? reject(new Error(message.error.message)) : resolve(message.result);
};
function send(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function key(key, code) {
  const virtualCodes = { Enter: 13, " ": 32, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Escape: 27, S: 83, P: 80, A: 65, D: 68, W: 87 };
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code, windowsVirtualKeyCode: virtualCodes[key] ?? 0, nativeVirtualKeyCode: virtualCodes[key] ?? 0 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code });
}
async function holdKey(key, code, milliseconds) {
  const virtualKey = key === "ArrowRight" ? 39 : key === "ArrowLeft" ? 37 : key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0;
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey });
  await sleep(milliseconds);
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: virtualKey });
}
async function screenshot(name) {
  const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(new URL(`../../docs/${name}`, import.meta.url), Buffer.from(shot.data, "base64"));
}

await send("Page.enable");
await send("Runtime.enable");
if (process.argv.includes("--product-only")) {
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "http://127.0.0.1:4314/" }); await sleep(700);
  const currentTitle = await evaluate("document.title");
  if (currentTitle !== "TIDEBREAK 95 v14.0") throw new Error(`Wrong target: ${currentTitle}`);
  await key("Enter", "Enter"); await sleep(300);
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37, nativeVirtualKeyCode: 37 });
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40, nativeVirtualKeyCode: 40 });
  await sleep(100);
  const beforeBlur = await evaluate("({state:window.__TIDEBREAK__.getState(),inputs:window.__TIDEBREAK__.getInputs()})");
  await evaluate("window.dispatchEvent(new Event('blur'))"); await sleep(350);
  const onHold = await evaluate("({state:window.__TIDEBREAK__.getState(),inputs:window.__TIDEBREAK__.getInputs(),runtime:window.__TIDEBREAK__.getRuntime(),audio:window.__TIDEBREAK__.getAudioState()})");
  await screenshot(`${artifactPrefix}-focus-hold-1280x720.png`);
  if (!beforeBlur.inputs.left || !beforeBlur.inputs.dive || !onHold.runtime.paused || onHold.runtime.pauseReason !== "blur") throw new Error("Focus loss did not enter rescue hold with active controls");
  if (Object.values(onHold.inputs).some(Boolean)) throw new Error("Controls remained latched during rescue hold");
  if (onHold.state.time - beforeBlur.state.time > 0.08) throw new Error("Authored time advanced while focus hold was active");
  if (onHold.audio.playing) throw new Error("Continuous audio remained active during rescue hold");
  await send("Page.bringToFront");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true }); await sleep(120);
  await key("P", "KeyP"); await sleep(250);
  const resumed = await evaluate("({state:window.__TIDEBREAK__.getState(),inputs:window.__TIDEBREAK__.getInputs(),runtime:window.__TIDEBREAK__.getRuntime()})");
  if (resumed.runtime.paused || Object.values(resumed.inputs).some(Boolean)) throw new Error(`Explicit resume retained stale input: ${JSON.stringify(resumed)}`);
  const targetAuthoredTime = resumed.state.time + 60;
  let observed = resumed.state;
  let steering = 0;
  async function steerProduct(direction) {
    if (direction === steering) return;
    if (steering) { const name=steering<0?"ArrowLeft":"ArrowRight"; await send("Input.dispatchKeyEvent",{type:"keyUp",key:name,code:name,windowsVirtualKeyCode:steering<0?37:39}); }
    steering=direction;
    if (steering) { const name=steering<0?"ArrowLeft":"ArrowRight"; await send("Input.dispatchKeyEvent",{type:"rawKeyDown",key:name,code:name,windowsVirtualKeyCode:steering<0?37:39}); }
  }
  const deadline = Date.now() + 150000;
  while (observed.mode === "playing" && observed.time < targetAuthoredTime && Date.now() < deadline) {
    const next=observed.entities.filter(entity=>!entity.hit&&entity.z>0&&entity.z<.58).sort((a,b)=>a.z-b.z)[0]; let targetX=0;
    if(next){const breakable=next.type==="driftwood"&&(observed.surgeTime>0||(observed.cooldown<=0&&observed.surge>=.34));targetX=(next.type==="survivor"||next.type==="gate"||breakable)?next.x:(next.x>0?-.46:.46);if((next.type==="survivor"||next.type==="driftwood")&&next.z<.25&&observed.cooldown<=0&&observed.surge>=.34)await key(" ","Space");}
    const desired=Math.max(-1.1,Math.min(1.1,(targetX-observed.boatX)*2.5));const delta=desired-observed.boatV;await steerProduct(Math.abs(delta)<.12?0:delta<0?-1:1);await sleep(80);observed=await evaluate("window.__TIDEBREAK__.getState()");
  }
  await steerProduct(0);
  const runtime = await evaluate("window.__TIDEBREAK__.getRuntime()");
  if (observed.time < targetAuthoredTime) throw new Error(`Performance audit ended early at ${observed.time.toFixed(2)}s`);
  if (runtime.frameStats.samples < 2500 || runtime.frameStats.averageMs > 18 || runtime.frameStats.maxMs > 80) throw new Error(`Frame budget failed: ${JSON.stringify(runtime.frameStats)}`);
  const audit={title:currentTitle,beforeBlur,onHold,resumed,after60Seconds:observed,runtime};
  await writeFile(new URL(`../../docs/${artifactPrefix}-audit.json`,import.meta.url),`${JSON.stringify(audit,null,2)}\n`);
  console.log(JSON.stringify({title:currentTitle,pauseReason:onHold.runtime.pauseReason,timeHeld:onHold.state.time-beforeBlur.state.time,afterTime:observed.time,frameStats:runtime.frameStats}));socket.close();process.exit(0);
}
if (process.argv.includes("--settings-only")) {
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "http://127.0.0.1:4314/" });
  await sleep(600);
  const currentTitle = await evaluate("document.title");
  if (currentTitle !== "TIDEBREAK 95 v14.0") throw new Error(`Wrong target: ${currentTitle}`);
  await evaluate("localStorage.setItem('tidebreak95.settings.v1', '{broken')");
  await send("Page.reload"); await sleep(500);
  await send("Page.bringToFront");
  const recovered = await evaluate("window.__TIDEBREAK__.getSettings()");
  if (recovered.volume !== 0.8 || recovered.controls.left !== "ArrowLeft") throw new Error("Corrupt settings did not recover");
  await evaluate("window.__auditKeys=[]; window.addEventListener('keydown', event => window.__auditKeys.push({key:event.key,code:event.code}))");
  await key("S", "KeyS"); await sleep(150);
  const opened = await evaluate("window.__TIDEBREAK__.isSettingsOpen()");
  if (!opened) throw new Error(`Settings key did not open menu: ${JSON.stringify(await evaluate("window.__auditKeys"))}`);
  await screenshot(`${artifactPrefix}-settings-1280x720.png`);
  await key("ArrowLeft", "ArrowLeft");
  await key("ArrowDown", "ArrowDown"); await key("Enter", "Enter");
  await key("ArrowDown", "ArrowDown"); await key("Enter", "Enter"); await key("A", "KeyA");
  await key("ArrowDown", "ArrowDown"); await key("Enter", "Enter"); await key("D", "KeyD");
  await key("ArrowDown", "ArrowDown"); await key("Enter", "Enter"); await key("W", "KeyW");
  const configured = await evaluate("window.__TIDEBREAK__.getSettings()");
  await send("Page.reload"); await sleep(500);
  const persisted = await evaluate("window.__TIDEBREAK__.getSettings()");
  await key("S", "KeyS"); await sleep(120);
  await send("Emulation.setDeviceMetricsOverride", { width: 640, height: 360, deviceScaleFactor: 1, mobile: false });
  await screenshot(`${artifactPrefix}-settings-640x360.png`);
  await key("Escape", "Escape"); await key("Enter", "Enter");
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "A", code: "KeyA", windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65 });
  const remappedInput = await evaluate("window.__TIDEBREAK__.getInputs()");
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "A", code: "KeyA", windowsVirtualKeyCode: 65 });
  const playState = await evaluate("window.__TIDEBREAK__.getState()");
  const audio = await evaluate("window.__TIDEBREAK__.getAudioState()");
  if (JSON.stringify(configured) !== JSON.stringify(persisted)) throw new Error("Settings did not persist across reload");
  if (playState.mode !== "playing" || !remappedInput.left) throw new Error(`Remapped steering did not reach game input: ${JSON.stringify({ configured, persisted, playState, remappedInput })}`);
  if (audio.masterVolume !== 0.7) throw new Error("Master volume was not applied");
  const audit = { title: currentTitle, recovered, configured, persisted, playMode: playState.mode, remappedInput, audio };
  await writeFile(new URL(`../../docs/${artifactPrefix}-settings-audit.json`, import.meta.url), `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify(audit)); socket.close(); process.exit(0);
}
if (process.argv.includes("--small-only")) {
  await send("Emulation.setDeviceMetricsOverride", { width: 640, height: 360, deviceScaleFactor: 1, mobile: false });
  const currentTitle = await evaluate("document.title");
  if (currentTitle !== "TIDEBREAK 95 v14.0") throw new Error(`Wrong target: ${currentTitle}`);
  await screenshot(`${artifactPrefix}-result-640x360.png`);
  await key("r", "KeyR");
  await sleep(700);
  await screenshot(`${artifactPrefix}-playing-640x360.png`);
  const smallState = await evaluate("window.__TIDEBREAK__.getState()");
  console.log(JSON.stringify({ title: currentTitle, width: 640, height: 360, mode: smallState.mode }));
  socket.close();
  process.exit(0);
}
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "http://127.0.0.1:4314/" });
await send("Page.bringToFront");
await send("Emulation.setFocusEmulationEnabled", { enabled: true });
await sleep(900);
const title = await evaluate("document.title");
if (title !== "TIDEBREAK 95 v14.0") throw new Error(`Wrong target: ${title}`);
if (!process.argv.includes("--skim-only")) await screenshot(`${artifactPrefix}-title-1280x720.png`);
await key("Enter", "Enter");
await sleep(450);
if (process.argv.includes("--training-only")) {
  let observed = await evaluate("window.__TIDEBREAK__.getState()");
  let steering = 0;
  let capturedCue = false;
  let hullAfterImpact = null;
  async function steerTraining(direction) {
    if (direction === steering) return;
    if (steering) {
      const name = steering < 0 ? "ArrowLeft" : "ArrowRight";
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: name, code: name, windowsVirtualKeyCode: steering < 0 ? 37 : 39 });
    }
    steering = direction;
    if (steering) {
      const name = steering < 0 ? "ArrowLeft" : "ArrowRight";
      await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: name, code: name, windowsVirtualKeyCode: steering < 0 ? 37 : 39 });
    }
  }
  const deadline = Date.now() + 45000;
  while (observed.mode === "playing" && observed.time < 22 && Date.now() < deadline) {
    const next = observed.entities.filter(entity => !entity.hit && entity.z > 0 && entity.z < .72).sort((a,b) => a.z-b.z)[0];
    const targetX = next?.x ?? 0;
    const desired = Math.max(-1.1, Math.min(1.1, (targetX-observed.boatX)*2.4));
    const delta = desired-observed.boatV;
    await steerTraining(Math.abs(delta)<.10?0:delta<0?-1:1);
    if (!capturedCue && observed.trainingCue?.type === "driftwood") {
      capturedCue = true;
      await screenshot(`${artifactPrefix}-danger-cue-1280x720.png`);
    }
    if (hullAfterImpact === null && observed.integrity < 3) hullAfterImpact = observed.integrity;
    if (observed.harborRepairs > 0) break;
    await sleep(70);
    observed = await evaluate("window.__TIDEBREAK__.getState()");
  }
  await steerTraining(0);
  await screenshot(`${artifactPrefix}-hull-patch-1280x720.png`);
  await send("Emulation.setDeviceMetricsOverride", { width: 640, height: 360, deviceScaleFactor: 1, mobile: false });
  await screenshot(`${artifactPrefix}-hull-patch-640x360.png`);
  const audio = await evaluate("window.__TIDEBREAK__.getAudioState()");
  if (!capturedCue || hullAfterImpact !== 2 || observed.harborRepairs !== 1 || observed.integrity !== 3) throw new Error(`Training recovery audit failed: ${JSON.stringify({capturedCue,hullAfterImpact,observed})}`);
  const audit = { title, capturedCue, hullAfterImpact, final: observed, audio };
  await writeFile(new URL(`../../docs/${artifactPrefix}-training-audit.json`, import.meta.url), `${JSON.stringify(audit,null,2)}\n`);
  console.log(JSON.stringify({title,capturedCue,hullAfterImpact,time:observed.time,integrity:observed.integrity,harborRepairs:observed.harborRepairs,audioActive:audio.active}));
  socket.close(); process.exit(0);
}
if (process.argv.includes("--skim-only")) {
  let observed = await evaluate("window.__TIDEBREAK__.getState()");
  let steering = 0;
  async function steerSkim(direction) {
    if (direction === steering) return;
    if (steering) {
      const name = steering < 0 ? "ArrowLeft" : "ArrowRight";
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: name, code: name, windowsVirtualKeyCode: steering < 0 ? 37 : 39 });
    }
    steering = direction;
    if (steering) {
      const name = steering < 0 ? "ArrowLeft" : "ArrowRight";
      await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: name, code: name, windowsVirtualKeyCode: steering < 0 ? 37 : 39 });
    }
  }
  const deadline = Date.now() + 65000;
  while (observed.mode === "playing" && observed.nearMisses === 0 && Date.now() < deadline) {
    const concrete = observed.entities.find(entity => !entity.hit && entity.type === "concrete" && entity.z > 0);
    const offset = concrete && concrete.x + 0.28 <= observed.routeCenter + observed.routeHalfWidth ? 0.28 : -0.28;
    const targetX = concrete ? concrete.x + offset : 0;
    const desiredV = Math.max(-1.1, Math.min(1.1, (targetX - observed.boatX) * 2.7));
    const deltaV = desiredV - observed.boatV;
    await steerSkim(Math.abs(deltaV) < 0.10 ? 0 : deltaV < 0 ? -1 : 1);
    await sleep(60);
    observed = await evaluate("window.__TIDEBREAK__.getState()");
  }
  await steerSkim(0);
  if (observed.nearMisses !== 1 || observed.integrity !== 3 || !observed.effects.some(effect => effect.type === "nearMiss")) {
    throw new Error(`Wake-skim feedback was not captured safely: ${JSON.stringify(observed)}`);
  }
  await screenshot(`${artifactPrefix}-wake-skim-1280x720.png`);
  const audit = { title, mode: observed.mode, time: observed.time, integrity: observed.integrity, score: observed.score, nearMisses: observed.nearMisses, nearMissChain: observed.nearMissChain, bestNearMissChain: observed.bestNearMissChain, message: observed.message, audio: await evaluate("window.__TIDEBREAK__.getAudioState()") };
  await writeFile(new URL(`../../docs/${artifactPrefix}-wake-skim-audit.json`, import.meta.url), `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify(audit)); socket.close(); process.exit(0);
}
const audioSamples = [{ moment: "cruise", ...(await evaluate("window.__TIDEBREAK__.getAudioState()")) }];
await screenshot(`${artifactPrefix}-wake-idle-1280x720.png`);
await key(" ", "Space");
await sleep(350);
audioSamples.push({ moment: "surge", ...(await evaluate("window.__TIDEBREAK__.getAudioState()")) });
await screenshot(`${artifactPrefix}-surge-1280x720.png`);
await sleep(4600);
await holdKey("ArrowLeft", "ArrowLeft", 270);
await sleep(1050);
await key(" ", "Space");
await sleep(850);
const gameState = await evaluate("window.__TIDEBREAK__.getState()");
await screenshot(`${artifactPrefix}-rescue-route-1280x720.png`);
let observed = gameState;
let steering = 0;
let capturedSection = 0;
let capturedSurvivor = false;
let capturedBreak = false;
let capturedStreetBend = false;
let capturedStreetChoice = false;
let capturedUnderflowDive = false;
let capturedUnderflowSurface = false;
let capturedUnderflowValve = false;
let capturedConvoyLow = false;
let capturedConvoyHigh = false;
let capturedConvoyLoad = false;
let capturedConvoyRoute = false;
let capturedWallLeft = false;
let capturedWallRight = false;
let capturedWallSystem = false;
let capturedSafeBasin = false;
let capturedBossAnchor = false;
let capturedBossHull = false;
let capturedBossDrain = false;
let capturedBossCore = false;
let capturedBossRupture = false;
let capturedBossPressure = false;
let capturedBossSinking = false;
let capturedBossEscape = false;
let capturedHarborPriority = false;
let capturedHarborFork = false;
const streetSamples = [];
const underflowSamples = [];
const convoySamples = [];
const stormwallSamples = [];
const bossSamples = [];
async function steer(direction) {
  if (direction === steering) return;
  if (steering !== 0) {
    const keyName = steering < 0 ? "ArrowLeft" : "ArrowRight";
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: keyName, code: keyName, windowsVirtualKeyCode: steering < 0 ? 37 : 39 });
  }
  steering = direction;
  if (steering !== 0) {
    const keyName = steering < 0 ? "ArrowLeft" : "ArrowRight";
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: keyName, code: keyName, windowsVirtualKeyCode: steering < 0 ? 37 : 39 });
  }
}
let vertical = 0;
async function changeDepth(direction) {
  if (direction === vertical) return;
  if (vertical !== 0) {
    const name = vertical > 0 ? "ArrowDown" : "ArrowUp";
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: name, code: name, windowsVirtualKeyCode: vertical > 0 ? 40 : 38 });
  }
  vertical = direction;
  if (vertical !== 0) {
    const name = vertical > 0 ? "ArrowDown" : "ArrowUp";
    await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: name, code: name, windowsVirtualKeyCode: vertical > 0 ? 40 : 38 });
  }
}
// Chrome can halve requestAnimationFrame cadence while its audit window is in
// the background. Keep a wall-clock guard without mistaking that throttling
// for an authored early ending.
const deadline = Date.now() + 1100000;
while (observed.mode === "playing" && Date.now() < deadline) {
  const next = observed.entities.filter(entity => !entity.hit && entity.z > 0 && entity.z < 0.58).sort((a, b) => a.z - b.z)[0];
  let targetX = 0;
  if (next) {
    const canBreakDriftwood = (next.type === "driftwood" || next.type === "forkBreak") && (observed.surgeTime > 0 || (observed.cooldown <= 0 && observed.surge >= 0.34));
    if (next.type === "survivor" || next.type === "prioritySurvivor" || next.type === "routeSurvivor" || next.type === "tunnelSurvivor" || next.type === "tunnelValve" || next.type === "convoyPickup" || next.type === "convoyFork" || next.type === "gate" || next.type === "forkGate" || next.type === "lowCeiling" || next.type === "wallGate" || next.type === "stormFork" || next.type === "stormShelter" || next.type === "bossAnchor" || next.type === "bossDrain" || next.type === "bossCore" || canBreakDriftwood) targetX = next.x;
    else targetX = next.x > 0 ? -0.46 : 0.46;
    if ((next.type === "survivor" || next.type === "prioritySurvivor" || next.type === "routeSurvivor" || next.type === "tunnelSurvivor" || next.type === "driftwood" || next.type === "forkBreak") && next.z < 0.25 && observed.cooldown <= 0 && observed.surge >= 0.34) await key(" ", "Space");
    if (observed.section === 2 && next.z < .72) {
      const needsDeep = next.type === "lowCeiling" || next.type === "tunnelValve" || (next.type === "tunnelSurvivor" && next.layer === "deep");
      const needsSurface = next.type === "intake" || (next.type === "tunnelSurvivor" && next.layer === "surface");
      await changeDepth(needsDeep ? 1 : needsSurface ? -1 : 0);
    } else if (observed.section === 3 && (next.type === "containerFall" || next.type === "convoyFork") && next.z < .78) {
      await changeDepth(next.tide === "low" ? 1 : -1);
      if (next.type === "containerFall") targetX = observed.escortX;
      if (next.z < .42 && Math.abs(observed.boatX-observed.escortX) > .12 && observed.cooldown <= 0 && observed.surge >= .34) await key(" ", "Space");
    } else if (observed.section === 3 && next.type === "convoyPickup" && next.z < .62) {
      await changeDepth(0);
      if (next.z < .42 && observed.cooldown <= 0 && observed.surge >= .34) await key(" ", "Space");
    } else if (observed.section === 4 && (next.type === "wallGate" || next.type === "stormFork") && next.z < .72) {
      await changeDepth(next.control === "dive" ? 1 : -1);
      targetX = observed.routeCenter + (next.side === "left" ? -observed.routeHalfWidth : observed.routeHalfWidth);
      const atWall = Math.abs(observed.boatX - targetX) < .16;
      if (atWall && next.z < .34 && observed.cooldown <= 0 && observed.surge >= .34) await key(" ", "Space");
    } else if (observed.section === 4 && next.type === "stormShelter" && next.z < .72) {
      await changeDepth(0);
      targetX = next.x;
      if (next.z < .42 && Math.abs(observed.boatX-observed.escortX) > .10 && observed.cooldown <= 0 && observed.surge >= .34) await key(" ", "Space");
    } else if (observed.section === 5 && next.type === "bossAnchor" && next.z < .72) {
      await changeDepth(0); targetX = next.x;
      if (next.z < .25 && observed.cooldown <= 0 && observed.surge >= .34) await key(" ", "Space");
    } else if (observed.section === 5 && next.type === "bossHull" && next.z < .72) {
      await changeDepth(0);
      targetX = observed.routeCenter + (next.side === "left" ? -observed.routeHalfWidth : observed.routeHalfWidth);
      if (Math.abs(observed.boatX-targetX)<.16 && next.z<.34 && observed.cooldown<=0 && observed.surge>=.34) await key(" ", "Space");
    } else if (observed.section === 5 && next.type === "bossDrain" && next.z < .72) {
      targetX=next.x; await changeDepth(next.layer === "deep" ? 1 : -1);
    } else if (observed.section === 5 && next.type === "bossCore" && next.z < .72) {
      await changeDepth(0); targetX=next.x;
      if(next.z<.25&&observed.cooldown<=0&&observed.surge>=.34)await key(" ","Space");
    } else if (observed.section !== 2) await changeDepth(0);
  }
  const desiredV = Math.max(-1.1, Math.min(1.1, (targetX - observed.boatX) * 2.5));
  const deltaV = desiredV - observed.boatV;
  await steer(Math.abs(deltaV) < 0.12 ? 0 : deltaV < 0 ? -1 : 1);
  await sleep(90);
  observed = await evaluate("window.__TIDEBREAK__.getState()");
  if (observed.section === 1 && (!streetSamples.length || observed.time - streetSamples.at(-1).time >= 0.48)) {
    streetSamples.push({ time: observed.time, center: observed.routeCenter, halfWidth: observed.routeHalfWidth, current: observed.crosscurrent, boatX: observed.boatX });
  }
  if (observed.section === 2 && (!underflowSamples.length || observed.time - underflowSamples.at(-1).time >= 0.32)) {
    underflowSamples.push({ time: observed.time, depth: observed.depth, depthV: observed.depthV, boatX: observed.boatX });
  }
  if (observed.section === 3 && (!convoySamples.length || observed.time - convoySamples.at(-1).time >= 0.24)) {
    convoySamples.push({ time: observed.time, tideLevel: observed.tideLevel, tideTarget: observed.tideTarget, boatX: observed.boatX, escortX: observed.escortX, escortIntegrity: observed.escortIntegrity, escortLoad: observed.escortLoad, rally: observed.escortRallyTime, pickups: observed.escortPickups.length, routes: observed.convoyRoutes.length, clears: observed.containerClears.length });
  }
  if (observed.section === 4 && (!stormwallSamples.length || observed.time - stormwallSamples.at(-1).time >= 0.20)) {
    stormwallSamples.push({ time: observed.time, stormLevel: observed.stormLevel, boatX: observed.boatX, escortX: observed.escortX, wallRideSide: observed.wallRideSide, gateControl: observed.gateControl, clears: observed.wallGateClears.length, routes: observed.stormRoutes.length, secured: observed.escortSecured });
  }
  if (observed.section === 5 && (!bossSamples.length || observed.time - bossSamples.at(-1).time >= 0.18)) {
    bossSamples.push({time:observed.time,phase:observed.bossPhase,boatX:observed.boatX,depth:observed.depth,wallRideSide:observed.wallRideSide,anchors:observed.bossAnchors.length,hull:observed.bossHullBreaches.length,drains:observed.bossDrains.length,defeated:observed.bossDefeated,collapseTime:observed.bossCollapseTime,collapseStage:observed.bossCollapseStage});
  }
  if(!capturedBossAnchor&&observed.entities.some(entity=>!entity.hit&&entity.type==="bossAnchor"&&entity.z>.16&&entity.z<.54)){capturedBossAnchor=true;await screenshot(`${artifactPrefix}-boss-anchor-1280x720.png`);}
  if(!capturedBossHull&&observed.wallRideSide&&observed.entities.some(entity=>!entity.hit&&entity.type==="bossHull"&&entity.z>.16&&entity.z<.54)){capturedBossHull=true;await screenshot(`${artifactPrefix}-boss-hull-1280x720.png`);}
  if(!capturedBossDrain&&observed.entities.some(entity=>!entity.hit&&entity.type==="bossDrain"&&entity.z>.16&&entity.z<.54)){capturedBossDrain=true;await screenshot(`${artifactPrefix}-boss-drain-1280x720.png`);}
  if(!capturedBossCore&&observed.entities.some(entity=>!entity.hit&&entity.type==="bossCore"&&entity.z>.16&&entity.z<.54)){capturedBossCore=true;await screenshot(`${artifactPrefix}-boss-core-1280x720.png`);}
  if(observed.bossDefeated&&!capturedBossRupture&&observed.bossCollapseTime>=.35){capturedBossRupture=true;await screenshot(`${artifactPrefix}-boss-rupture-1280x720.png`);}
  if(observed.bossCollapseStage>=1&&!capturedBossPressure){capturedBossPressure=true;await screenshot(`${artifactPrefix}-boss-pressure-1280x720.png`);}
  if(observed.bossCollapseStage>=2&&!capturedBossSinking){capturedBossSinking=true;await screenshot(`${artifactPrefix}-boss-sinking-1280x720.png`);}
  if(observed.bossCollapseStage>=3&&!capturedBossEscape){capturedBossEscape=true;await screenshot(`${artifactPrefix}-boss-escape-1280x720.png`);}
  if (!capturedWallLeft && observed.section === 4 && observed.wallRideSide === "left" && observed.entities.some(entity => !entity.hit && entity.type === "wallGate" && entity.side === "left" && entity.z < .4)) {
    capturedWallLeft = true; await screenshot(`${artifactPrefix}-stormwall-left-1280x720.png`);
  }
  if (!capturedWallRight && observed.section === 4 && observed.wallRideSide === "right" && observed.entities.some(entity => !entity.hit && entity.type === "wallGate" && entity.side === "right" && entity.z < .4)) {
    capturedWallRight = true; await screenshot(`${artifactPrefix}-stormwall-right-1280x720.png`);
  }
  if (!capturedWallSystem && observed.section === 4 && observed.entities.some(entity => !entity.hit && entity.type === "stormFork" && entity.z > .16 && entity.z < .54)) {
    capturedWallSystem = true; await screenshot(`${artifactPrefix}-stormwall-system-1280x720.png`);
  }
  if (!capturedSafeBasin && observed.section === 4 && observed.entities.some(entity => !entity.hit && entity.type === "stormShelter" && entity.z > .16 && entity.z < .54)) {
    capturedSafeBasin = true; await screenshot(`${artifactPrefix}-stormwall-basin-1280x720.png`);
  }
  if (!capturedConvoyLow && observed.section === 3 && observed.tideLevel < .3 && observed.entities.some(entity => !entity.hit && entity.type === "containerFall" && entity.tide === "low" && entity.z > .12 && entity.z < .58)) {
    capturedConvoyLow = true; await screenshot(`${artifactPrefix}-convoy-low-1280x720.png`);
  }
  if (!capturedConvoyHigh && observed.section === 3 && observed.tideLevel > .7 && observed.entities.some(entity => !entity.hit && entity.type === "containerFall" && entity.tide === "high" && entity.z > .28 && entity.z < .58)) {
    capturedConvoyHigh = true; await screenshot(`${artifactPrefix}-convoy-high-1280x720.png`);
  }
  if (!capturedConvoyLoad && observed.section === 3 && observed.entities.some(entity => !entity.hit && entity.type === "convoyPickup" && entity.z > .18 && entity.z < .58)) {
    capturedConvoyLoad = true; await screenshot(`${artifactPrefix}-convoy-load-1280x720.png`);
  }
  if (!capturedConvoyRoute && observed.section === 3 && observed.entities.some(entity => !entity.hit && entity.type === "convoyFork" && entity.z > .18 && entity.z < .58)) {
    capturedConvoyRoute = true; await screenshot(`${artifactPrefix}-convoy-route-1280x720.png`);
  }
  if (!capturedUnderflowDive && observed.section === 2 && observed.depth > .68) {
    capturedUnderflowDive = true;
    await screenshot(`${artifactPrefix}-underflow-dive-1280x720.png`);
  }
  if (!capturedUnderflowSurface && capturedUnderflowDive && observed.section === 2 && observed.surfacedAfterDive) {
    capturedUnderflowSurface = true;
    await screenshot(`${artifactPrefix}-underflow-surface-1280x720.png`);
  }
  if (!capturedUnderflowValve && observed.section === 2 && observed.entities.some(entity => !entity.hit && entity.type === "tunnelValve" && entity.z < .58)) {
    capturedUnderflowValve = true;
    await screenshot(`${artifactPrefix}-underflow-valve-1280x720.png`);
  }
  if (!capturedStreetBend && observed.section === 1 && Math.abs(observed.routeCenter) > 0.22) {
    capturedStreetBend = true;
    await screenshot(`${artifactPrefix}-street-bend-1280x720.png`);
  }
  if (!capturedStreetChoice && observed.entities.some(entity => !entity.hit && entity.type === "routeSurvivor" && entity.z < 0.62)) {
    capturedStreetChoice = true;
    await screenshot(`${artifactPrefix}-street-choice-1280x720.png`);
  }
  if (!capturedHarborPriority && observed.entities.some(entity => !entity.hit && entity.type === "prioritySurvivor" && entity.z < 0.58)) {
    capturedHarborPriority = true;
    await screenshot(`${artifactPrefix}-harbor-priority-1280x720.png`);
  }
  if (!capturedHarborFork && observed.entities.some(entity => !entity.hit && (entity.type === "forkBreak" || entity.type === "forkGate") && entity.z < 0.58)) {
    capturedHarborFork = true;
    await screenshot(`${artifactPrefix}-harbor-fork-1280x720.png`);
  }
  if (!capturedSurvivor && observed.entities.some(entity => !entity.hit && entity.type === "survivor" && entity.z < 0.52)) {
    capturedSurvivor = true;
    await screenshot(`${artifactPrefix}-survivor-gesture-1280x720.png`);
  }
  if (!capturedBreak && observed.effects.some(effect => effect.type === "break")) {
    capturedBreak = true;
    await screenshot(`${artifactPrefix}-driftwood-break-1280x720.png`);
  }
  if (observed.section > capturedSection) {
    capturedSection = observed.section;
    audioSamples.push({ moment: `section-${capturedSection}`, ...(await evaluate("window.__TIDEBREAK__.getAudioState()")) });
    await screenshot(`${artifactPrefix}-section-${capturedSection}-1280x720.png`);
  }
}
await steer(0);
await changeDepth(0);
if (observed.mode === "playing") throw new Error(`Audit timed out at authored time ${observed.time.toFixed(2)}s`);
await screenshot(`${artifactPrefix}-result-1280x720.png`);
const audio = await evaluate("window.__TIDEBREAK__.getAudioState()");
audioSamples.push({ moment: "result", ...audio });
const sectionAudio = audioSamples.filter(sample => sample.moment === "cruise" || sample.moment.startsWith("section-"));
const expectedProfiles = ["open-harbor", "flooded-arcade", "underflow", "convoy", "stormwall", "leviathan"];
if (sectionAudio.length !== expectedProfiles.length || sectionAudio.some((sample, index) => sample.profile !== expectedProfiles[index] || sample.transitionCount !== index + 1)) {
  throw new Error(`Section audio identities missing: ${JSON.stringify(sectionAudio)}`);
}
if (new Set(sectionAudio.map(sample => `${sample.tempo}:${sample.rhythm}`)).size !== 6 || new Set(sectionAudio.map(sample => `${sample.waterHz}:${sample.droneHz}`)).size !== 6) {
  throw new Error(`Section audio profiles are not distinct: ${JSON.stringify(sectionAudio)}`);
}
if (audio.playing || audio.engineGain !== 0 || audio.waterGain !== 0 || audio.droneGain !== 0) throw new Error(`Continuous audio did not stop at result: ${JSON.stringify(audio)}`);
if (!capturedStreetBend || !capturedStreetChoice) throw new Error(`Flooded arcade evidence missing: ${JSON.stringify({capturedStreetBend,capturedStreetChoice})}`);
if (!capturedHarborPriority || !capturedHarborFork || observed.harborPriorities.length !== 4 || observed.harborRoutes.length !== 3) throw new Error(`Harbor progression evidence missing: ${JSON.stringify({capturedHarborPriority,capturedHarborFork,harborPriorities:observed.harborPriorities,harborRoutes:observed.harborRoutes})}`);
if (!capturedUnderflowDive || !capturedUnderflowSurface) throw new Error(`Underflow transition evidence missing: ${JSON.stringify({capturedUnderflowDive,capturedUnderflowSurface,maxDepth:observed.maxDepth})}`);
if (!capturedUnderflowValve || observed.underflowValves.length !== 2) throw new Error(`Underflow valve chain evidence missing: ${JSON.stringify({capturedUnderflowValve,underflowValves:observed.underflowValves})}`);
const rescueLayers = new Set(observed.underflowRescues.map(rescue => rescue.layer));
if (!rescueLayers.has("deep") || !rescueLayers.has("surface")) throw new Error(`Both underflow rescue layers were not completed: ${JSON.stringify(observed.underflowRescues)}`);
if (!capturedConvoyLow || !capturedConvoyHigh || !capturedConvoyLoad || !capturedConvoyRoute || observed.escortIntegrity !== 3 || observed.containerClears.length < 11 || observed.escortPickups.length !== 2 || observed.convoyRoutes.length !== 2 || observed.tideSwitches < 6) throw new Error(`Container convoy evidence missing: ${JSON.stringify({capturedConvoyLow,capturedConvoyHigh,capturedConvoyLoad,capturedConvoyRoute,escortIntegrity:observed.escortIntegrity,escortLoad:observed.escortLoad,escortPickups:observed.escortPickups,convoyRoutes:observed.convoyRoutes,containerClears:observed.containerClears,tideSwitches:observed.tideSwitches})}`);
if (!capturedWallLeft || !capturedWallRight || !capturedWallSystem || !capturedSafeBasin || observed.wallGateClears.length !== 12 || observed.stormRoutes.length !== 2 || !observed.escortSecured || observed.escortIntegrity !== 3 || observed.integrity !== 3) throw new Error(`Stormwall evidence missing: ${JSON.stringify({capturedWallLeft,capturedWallRight,capturedWallSystem,capturedSafeBasin,integrity:observed.integrity,escortIntegrity:observed.escortIntegrity,escortSecured:observed.escortSecured,stormRoutes:observed.stormRoutes,wallGateClears:observed.wallGateClears})}`);
if(!capturedBossAnchor||!capturedBossHull||!capturedBossDrain||!capturedBossCore||observed.bossAnchors.length!==2||observed.bossHullBreaches.length!==3||observed.bossDrains.length!==2||!observed.bossDefeated)throw new Error(`Leviathan evidence missing: ${JSON.stringify({capturedBossAnchor,capturedBossHull,capturedBossDrain,capturedBossCore,bossAnchors:observed.bossAnchors,bossHullBreaches:observed.bossHullBreaches,bossDrains:observed.bossDrains,bossDefeated:observed.bossDefeated})}`);
if(!capturedBossRupture||!capturedBossPressure||!capturedBossSinking||!capturedBossEscape||observed.bossCollapseTime<6.8)throw new Error(`Leviathan collapse evidence missing: ${JSON.stringify({capturedBossRupture,capturedBossPressure,capturedBossSinking,capturedBossEscape,bossCollapseTime:observed.bossCollapseTime,bossCollapseStage:observed.bossCollapseStage})}`);
const audit = { title, mode: observed.mode, time: observed.time, section: observed.section, spawned: observed.spawned, integrity: observed.integrity, rescued: observed.rescued, score: observed.score, harborPriorities: observed.harborPriorities, harborRoutes: observed.harborRoutes, routeChoices: observed.routeChoices, underflowRescues: observed.underflowRescues, underflowValves: observed.underflowValves, underflowWater: observed.underflowWater, maxDepth: observed.maxDepth, surfacedAfterDive: observed.surfacedAfterDive, escortIntegrity: observed.escortIntegrity, escortLoad: observed.escortLoad, escortPickups: observed.escortPickups, convoyRoutes: observed.convoyRoutes, containerClears: observed.containerClears, tideSwitches: observed.tideSwitches, wallGateClears: observed.wallGateClears, stormRoutes: observed.stormRoutes, escortSecured: observed.escortSecured, stormLevel: observed.stormLevel, bossAnchors:observed.bossAnchors,bossHullBreaches:observed.bossHullBreaches,bossDrains:observed.bossDrains,bossDefeated:observed.bossDefeated,bossCollapseTime:observed.bossCollapseTime,bossCollapseStage:observed.bossCollapseStage,capturedBossAnchor,capturedBossHull,capturedBossDrain,capturedBossCore,capturedBossRupture,capturedBossPressure,capturedBossSinking,capturedBossEscape, capturedSurvivor, capturedBreak, capturedHarborPriority, capturedHarborFork, capturedStreetBend, capturedStreetChoice, capturedUnderflowDive, capturedUnderflowSurface, capturedUnderflowValve, capturedConvoyLow, capturedConvoyHigh, capturedConvoyLoad, capturedConvoyRoute, capturedWallLeft, capturedWallRight, capturedWallSystem, capturedSafeBasin, streetSamples, underflowSamples, convoySamples, stormwallSamples,bossSamples, audioSamples };
await writeFile(new URL(`../../docs/${artifactPrefix}-browser-audit.json`, import.meta.url), `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify(audit));
socket.close();
