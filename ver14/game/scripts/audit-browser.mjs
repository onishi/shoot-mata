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
await sleep(900);
const title = await evaluate("document.title");
if (title !== "TIDEBREAK 95 v14.0") throw new Error(`Wrong target: ${title}`);
await screenshot(`${artifactPrefix}-title-1280x720.png`);
await key("Enter", "Enter");
await sleep(450);
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
const streetSamples = [];
const underflowSamples = [];
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
const deadline = Date.now() + 240000;
while (observed.mode === "playing" && Date.now() < deadline) {
  const next = observed.entities.filter(entity => !entity.hit && entity.z > 0 && entity.z < 0.58).sort((a, b) => a.z - b.z)[0];
  let targetX = 0;
  if (next) {
    const canBreakDriftwood = next.type === "driftwood" && (observed.surgeTime > 0 || (observed.cooldown <= 0 && observed.surge >= 0.34));
    if (next.type === "survivor" || next.type === "routeSurvivor" || next.type === "tunnelSurvivor" || next.type === "gate" || next.type === "lowCeiling" || canBreakDriftwood) targetX = next.x;
    else targetX = next.x > 0 ? -0.46 : 0.46;
    if ((next.type === "survivor" || next.type === "routeSurvivor" || next.type === "tunnelSurvivor" || next.type === "driftwood") && next.z < 0.25 && observed.cooldown <= 0 && observed.surge >= 0.34) await key(" ", "Space");
    if (observed.section === 2 && next.z < .72) {
      const needsDeep = next.type === "lowCeiling" || (next.type === "tunnelSurvivor" && next.layer === "deep");
      const needsSurface = next.type === "intake" || (next.type === "tunnelSurvivor" && next.layer === "surface");
      await changeDepth(needsDeep ? 1 : needsSurface ? -1 : 0);
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
  if (!capturedUnderflowDive && observed.section === 2 && observed.depth > .68) {
    capturedUnderflowDive = true;
    await screenshot(`${artifactPrefix}-underflow-dive-1280x720.png`);
  }
  if (!capturedUnderflowSurface && capturedUnderflowDive && observed.section === 2 && observed.surfacedAfterDive) {
    capturedUnderflowSurface = true;
    await screenshot(`${artifactPrefix}-underflow-surface-1280x720.png`);
  }
  if (!capturedStreetBend && observed.section === 1 && Math.abs(observed.routeCenter) > 0.22) {
    capturedStreetBend = true;
    await screenshot(`${artifactPrefix}-street-bend-1280x720.png`);
  }
  if (!capturedStreetChoice && observed.entities.some(entity => !entity.hit && entity.type === "routeSurvivor" && entity.z < 0.62)) {
    capturedStreetChoice = true;
    await screenshot(`${artifactPrefix}-street-choice-1280x720.png`);
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
if (!capturedStreetBend || !capturedStreetChoice) throw new Error(`Flooded arcade evidence missing: ${JSON.stringify({capturedStreetBend,capturedStreetChoice})}`);
if (!capturedUnderflowDive || !capturedUnderflowSurface) throw new Error(`Underflow transition evidence missing: ${JSON.stringify({capturedUnderflowDive,capturedUnderflowSurface,maxDepth:observed.maxDepth})}`);
const rescueLayers = new Set(observed.underflowRescues.map(rescue => rescue.layer));
if (!rescueLayers.has("deep") || !rescueLayers.has("surface")) throw new Error(`Both underflow rescue layers were not completed: ${JSON.stringify(observed.underflowRescues)}`);
const audit = { title, mode: observed.mode, time: observed.time, section: observed.section, spawned: observed.spawned, integrity: observed.integrity, rescued: observed.rescued, score: observed.score, routeChoices: observed.routeChoices, underflowRescues: observed.underflowRescues, maxDepth: observed.maxDepth, surfacedAfterDive: observed.surfacedAfterDive, capturedSurvivor, capturedBreak, capturedStreetBend, capturedStreetChoice, capturedUnderflowDive, capturedUnderflowSurface, streetSamples, underflowSamples, audioSamples };
await writeFile(new URL(`../../docs/${artifactPrefix}-browser-audit.json`, import.meta.url), `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify(audit));
socket.close();
