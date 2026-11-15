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
  await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: key === "Enter" ? 13 : key === " " ? 32 : key === "ArrowRight" ? 39 : 37 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code });
}
async function holdKey(key, code, milliseconds) {
  const virtualKey = key === "ArrowRight" ? 39 : 37;
  await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: virtualKey });
  await sleep(milliseconds);
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: virtualKey });
}
async function screenshot(name) {
  const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(new URL(`../../docs/${name}`, import.meta.url), Buffer.from(shot.data, "base64"));
}

await send("Page.enable");
await send("Runtime.enable");
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
// Chrome can halve requestAnimationFrame cadence while its audit window is in
// the background. Keep a wall-clock guard without mistaking that throttling
// for an authored early ending.
const deadline = Date.now() + 240000;
while (observed.mode === "playing" && Date.now() < deadline) {
  const next = observed.entities.filter(entity => !entity.hit && entity.z > 0 && entity.z < 0.58).sort((a, b) => a.z - b.z)[0];
  let targetX = 0;
  if (next) {
    const canBreakDriftwood = next.type === "driftwood" && (observed.surgeTime > 0 || (observed.cooldown <= 0 && observed.surge >= 0.34));
    if (next.type === "survivor" || next.type === "gate" || canBreakDriftwood) targetX = next.x;
    else targetX = next.x > 0 ? -0.46 : 0.46;
    if ((next.type === "survivor" || next.type === "driftwood") && next.z < 0.25 && observed.cooldown <= 0 && observed.surge >= 0.34) await key(" ", "Space");
  }
  const desiredV = Math.max(-1.1, Math.min(1.1, (targetX - observed.boatX) * 2.5));
  const deltaV = desiredV - observed.boatV;
  await steer(Math.abs(deltaV) < 0.12 ? 0 : deltaV < 0 ? -1 : 1);
  await sleep(90);
  observed = await evaluate("window.__TIDEBREAK__.getState()");
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
if (observed.mode === "playing") throw new Error(`Audit timed out at authored time ${observed.time.toFixed(2)}s`);
await screenshot(`${artifactPrefix}-result-1280x720.png`);
const audio = await evaluate("window.__TIDEBREAK__.getAudioState()");
audioSamples.push({ moment: "result", ...audio });
const audit = { title, mode: observed.mode, time: observed.time, section: observed.section, spawned: observed.spawned, integrity: observed.integrity, rescued: observed.rescued, score: observed.score, capturedSurvivor, capturedBreak, audioSamples };
await writeFile(new URL(`../../docs/${artifactPrefix}-browser-audit.json`, import.meta.url), `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify(audit));
socket.close();
