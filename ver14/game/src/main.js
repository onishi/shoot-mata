import { activateSurge, createGame, HEIGHT, startGame, STAGE_SECONDS, updateGame, WIDTH } from "./model.js";
import { ArcadeAudio } from "./audio.js";
import { canBind, displayCode, loadSettings, saveSettings } from "./settings.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const audio = new ArcadeAudio();
let settings = loadSettings(localStorage);
audio.setVolume(settings.volume);
let state = createGame();
let paused = false;
let settingsOpen = false;
let settingsRow = 0;
let bindingAction = null;
let last = performance.now();
const keys = { left: false, right: false };

const palette = [
  { sky: "#ef8b56", far: "#542e58", water: "#086078", edge: "#172f46", light: "#ffdb79" },
  { sky: "#594684", far: "#1e3159", water: "#0b6474", edge: "#342747", light: "#f28a67" },
  { sky: "#173b62", far: "#0d223a", water: "#075464", edge: "#17233d", light: "#79e0dd" },
  { sky: "#13233d", far: "#090f20", water: "#074452", edge: "#181a2f", light: "#f3d054" }
];

function text(value, x, y, size, color = "#fff", align = "left", weight = 800) {
  ctx.save(); ctx.font = `${weight} ${size}px Arial Narrow, sans-serif`; ctx.textAlign = align;
  ctx.textBaseline = "middle"; ctx.fillStyle = "#07101c"; ctx.fillText(value, x + 3, y + 3);
  ctx.fillStyle = color; ctx.fillText(value, x, y); ctx.restore();
}

function polygon(points, fill, stroke = null, width = 2) {
  ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

function drawHarborHorizon(theme) {
  // Three depth bands keep the opening harbor legible while the water races
  // toward the player: refinery silhouettes, working quays, then foreground
  // rescue hardware. Shapes are deliberately asymmetric so it reads as a
  // place rather than a repeated skyline texture.
  ctx.fillStyle = "#263849";
  polygon([[0,232],[0,174],[52,174],[52,145],[70,145],[70,232]], "#263849");
  polygon([[74,232],[74,188],[155,188],[155,129],[168,129],[168,232]], "#213445");
  polygon([[760,232],[760,166],[841,166],[841,194],[914,194],[914,144],[930,144],[930,232]], "#203244");
  ctx.strokeStyle = "#172838"; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(116,184); ctx.lineTo(214,112); ctx.lineTo(214,229); ctx.moveTo(214,112); ctx.lineTo(300,184); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(836,166); ctx.lineTo(748,105); ctx.lineTo(748,229); ctx.moveTo(748,105); ctx.lineTo(680,170); ctx.stroke();
  ctx.strokeStyle = theme.light; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(126,178); ctx.lineTo(205,120); ctx.moveTo(827,160); ctx.lineTo(757,112); ctx.stroke();
  ctx.fillStyle = "#e8c85b";
  for (const [x, y] of [[42,188],[91,203],[143,204],[790,185],[873,208],[923,178]]) ctx.fillRect(x, y, 14, 5);
  ctx.fillStyle = "#e8eee2"; ctx.fillRect(244,190,112,23); ctx.fillStyle = "#d94b43"; ctx.fillRect(278,184,30,6);
  ctx.fillStyle = "#132538"; ctx.fillRect(265,178,17,12); ctx.fillRect(318,178,17,12);
  ctx.fillStyle = "#f5d557"; ctx.beginPath(); ctx.arc(300,176,5,0,Math.PI*2); ctx.fill();
}

function drawSky(theme) {
  const grad = ctx.createLinearGradient(0, 0, 0, 290);
  grad.addColorStop(0, theme.sky); grad.addColorStop(1, theme.far);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, WIDTH, 300);
  ctx.fillStyle = theme.light; ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(760, 92, 38, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = theme.far;
  for (let i = 0; i < 13; i++) {
    const h = 40 + ((i * 43) % 90);
    ctx.fillRect(i * 82 - 18, 230 - h, 58, h);
    if (state.section > 0) { ctx.fillStyle = theme.light; ctx.fillRect(i * 82, 203 - h, 4, 13); ctx.fillStyle = theme.far; }
  }
  if (state.section === 0) drawHarborHorizon(theme);
  if (state.section === 3) {
    ctx.fillStyle = "#070d18"; ctx.fillRect(210, 178, 540, 68);
    polygon([[250,178],[320,112],[650,112],[714,178]], "#101828", theme.light, 4);
    text("STORM BARGE", 480, 148, 24, theme.light, "center");
  }
}

function channelX(worldX, z) { return WIDTH / 2 + worldX * (170 + (1 - z) * 330); }
function channelY(z) { return 214 + Math.pow(1 - z, 1.45) * 326; }

function drawChannel(theme) {
  polygon([[335,210],[625,210],[940,540],[20,540]], theme.water);
  polygon([[0,210],[335,210],[20,540],[0,540]], theme.edge);
  polygon([[625,210],[960,210],[960,540],[940,540]], theme.edge);
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const y = 245 + i * 42 + ((state.time * 80) % 42);
    const ratio = (y - 210) / 330;
    ctx.strokeStyle = i % 2 ? "#43b7bd55" : "#b8ffff44";
    ctx.beginPath(); ctx.moveTo(480 - 70 - ratio * 340, y); ctx.quadraticCurveTo(480, y - 13, 480 + 80 + ratio * 280, y); ctx.stroke();
  }
  ctx.strokeStyle = theme.light; ctx.lineWidth = 5; ctx.setLineDash([14, 16]);
  ctx.beginPath(); ctx.moveTo(335,210); ctx.lineTo(20,540); ctx.moveTo(625,210); ctx.lineTo(940,540); ctx.stroke(); ctx.setLineDash([]);
  if (state.section === 0) {
    // Near quay faces frame the playable water without hiding its boundary.
    polygon([[0,292],[164,275],[89,540],[0,540]], "#223548", "#0c1b29", 5);
    polygon([[960,270],[802,284],[876,540],[960,540]], "#213347", "#0c1b29", 5);
    ctx.fillStyle = "#e5b84e";
    for (const [x,y,w] of [[18,326,105],[5,410,92],[837,322,105],[873,414,87]]) {
      ctx.save(); ctx.translate(x,y); ctx.rotate(x < 400 ? -.12 : .12); ctx.fillRect(0,0,w,9); ctx.fillStyle="#142435"; ctx.fillRect(18,0,18,9); ctx.fillRect(54,0,18,9); ctx.restore(); ctx.fillStyle="#e5b84e";
    }
    for (const [x,y] of [[142,304],[84,438],[817,312],[885,446]]) {
      ctx.fillStyle="#f04f45"; ctx.fillRect(x-9,y-38,18,38); ctx.fillStyle="#fff1bd"; ctx.fillRect(x-9,y-28,18,8);
      ctx.strokeStyle="#151e2c"; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y+32); ctx.stroke();
    }
    ctx.fillStyle="#f4d653"; ctx.fillRect(24,258,112,26); text("RESCUE PIER",80,272,13,"#18283a","center",900);
    ctx.fillStyle="#e7f2e9"; ctx.fillRect(820,255,111,26); text("FLOOD 04",875,269,13,"#223247","center",900);
  }
  if (state.section === 1) {
    for (const x of [90, 810]) { ctx.fillStyle = "#24314b"; ctx.fillRect(x, 285, 75, 205); ctx.fillStyle = "#ef875c"; ctx.fillRect(x + 10, 310, 55, 12); }
  }
  if (state.section === 2) {
    ctx.strokeStyle = "#8de8dd66"; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(280,260); ctx.quadraticCurveTo(540,350,690,510); ctx.stroke();
  }
}

function drawEntity(entity) {
  const z = Math.max(0, entity.z);
  const x = channelX(entity.x, z), y = channelY(z), scale = .25 + (1 - z) * 1.25;
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  if (entity.type === "survivor") {
    const wave = Math.sin(state.time * 8 + entity.id) * .28;
    ctx.fillStyle = "#ffdf57"; ctx.beginPath(); ctx.ellipse(0, 7, 31, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#202f42"; ctx.beginPath(); ctx.ellipse(0, 7, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f25d52"; ctx.fillRect(-12, -31, 24, 34); ctx.fillStyle = "#ffe3bc"; ctx.beginPath(); ctx.arc(0, -39, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff4d1"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath();
    ctx.moveTo(-8,-25); ctx.lineTo(-27,-43); ctx.lineTo(-34,-35);
    ctx.moveTo(8,-25); ctx.lineTo(25 + wave * 20,-51); ctx.lineTo(35 + wave * 16,-43); ctx.stroke();
    ctx.strokeStyle="#ff594f"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(31,-43);ctx.lineTo(31,-83);ctx.stroke();
    polygon([[31,-83],[64,-74],[31,-62]], "#ff594f", "#fff1c7", 2);
    text("SOS", 47, -73, 12, "#fff", "center");
  } else if (entity.type === "gate") {
    ctx.strokeStyle = "#7effdf"; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, -8, 48, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = "#ffce52"; ctx.fillRect(-52, -12, 12, 38); ctx.fillRect(40, -12, 12, 38);
  } else if (entity.type === "driftwood") {
    ctx.rotate(-.2); polygon([[-52,-8],[-35,-19],[4,-14],[17,-25],[50,-13],[43,12],[6,15],[-17,24],[-49,13]], "#5b3427", "#2b2523", 4);
    ctx.fillStyle = "#b67445"; ctx.fillRect(-35,-13,66,7); ctx.fillStyle="#d4985c"; ctx.fillRect(-17,-7,37,5);
    ctx.strokeStyle="#33251f";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(15,-17);ctx.lineTo(4,10);ctx.moveTo(-22,-14);ctx.lineTo(-30,14);ctx.stroke();
  } else if (entity.type === "concrete") {
    polygon([[-46,20],[-35,-34],[22,-46],[47,15]], "#71808a", "#b9c7cc", 4);
    ctx.fillStyle = "#f05b45"; ctx.fillRect(-21,-20,12,12); ctx.fillRect(4,-20,12,12);
  } else {
    polygon([[-62,20],[-45,-38],[35,-38],[61,20]], "#111826", "#e9c85c", 5);
    ctx.fillStyle = "#e64c42"; ctx.fillRect(entity.type === "bargeLeft" ? 5 : -35, -28, 30, 14);
  }
  ctx.restore();
}

function drawBoat() {
  const x = channelX(state.boatX, 0), y = 472;
  if (state.surgeTime > 0) {
    const pulse = 64 + Math.sin(state.time * 38) * 8;
    ctx.strokeStyle = "#9cfff4"; ctx.lineWidth = 10; ctx.globalAlpha = .65;
    ctx.beginPath(); ctx.ellipse(x, y + 15, pulse * 1.65, pulse * .55, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  const roll = Math.max(-0.18, Math.min(0.18, state.boatV * .16));
  const lift = state.surgeTime > 0 ? 6 + Math.sin(state.time * 35) * 2 : 0;
  ctx.save(); ctx.translate(x, y - lift); ctx.rotate(roll);
  ctx.fillStyle = "#09182799"; ctx.beginPath(); ctx.ellipse(0, 28, 59, 18, 0, 0, Math.PI * 2); ctx.fill();
  polygon([[-56,29],[-42,-10],[-24,-43],[0,-60],[25,-43],[43,-10],[57,29],[28,24],[0,14],[-29,24]], "#ece9cf", "#0b192c", 5);
  polygon([[-34,15],[-25,-21],[0,-47],[26,-21],[35,15],[0,4]], "#d9433d", "#872c34", 2);
  polygon([[-22,-15],[-12,-32],[0,-42],[13,-32],[23,-15]], "#16374d", "#8ff2ec", 3);
  ctx.fillStyle = "#9ff5ed"; ctx.fillRect(-13,-25,26,8);
  ctx.strokeStyle = "#172337"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-67,18); ctx.lineTo(-33,12); ctx.moveTo(67,18); ctx.lineTo(33,12); ctx.stroke();
  ctx.strokeStyle = "#f0d66a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-65,15); ctx.lineTo(-70,29); ctx.moveTo(65,15); ctx.lineTo(70,29); ctx.stroke();
  ctx.fillStyle = "#ffdc5b"; ctx.beginPath(); ctx.arc(0,-34,6,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#fff2ad"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6,-5); ctx.lineTo(-29,19); ctx.moveTo(6,-5); ctx.lineTo(29,19); ctx.stroke();
  ctx.restore();
  const force = 1 + Math.min(1.4, Math.abs(state.boatV)) + (state.surgeTime > 0 ? 1.2 : 0);
  for (const side of [-1, 1]) {
    const spread = 64 + force * 22 + (side * state.boatV * 10);
    ctx.strokeStyle = "#d9ffffaa"; ctx.lineWidth = 4 + force;
    ctx.beginPath(); ctx.moveTo(x + side * 28, y + 19); ctx.quadraticCurveTo(x + side * spread * .75, y + 40, x + side * spread, 538); ctx.stroke();
    for (let i = 0; i < (settings.reducedMotion ? 3 : 7); i++) {
      const phase = (state.time * (2.8 + force) + i * .137 + (side > 0 ? .43 : 0)) % 1;
      const px = x + side * (31 + phase * spread) + Math.sin(i * 9.7) * 7;
      const py = y + 20 + phase * 64;
      ctx.fillStyle = `rgba(210,255,255,${(1-phase)*.72})`;
      ctx.beginPath(); ctx.ellipse(px, py, 2 + phase * 5, 5 + phase * 9, side * .25, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawEffects() {
  for (const effect of state.effects) {
    const progress = 1 - effect.life / effect.max;
    const x = channelX(effect.x, 0.08), y = 467;
    ctx.save(); ctx.globalAlpha = 1 - progress;
    if (effect.type === "rescue") {
      ctx.strokeStyle = "#fff16b"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x,y,20+progress*90,0,Math.PI*2); ctx.stroke();
      const eased = 1 - Math.pow(1 - Math.min(1, progress * 1.35), 3);
      const targetX = channelX(effect.targetX ?? state.boatX, 0);
      const personX = x + (targetX - x) * eased, personY = y + (470 - y) * eased - Math.sin(eased * Math.PI) * 62;
      ctx.strokeStyle = "#f6f1bc"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo((x+targetX)/2,y-75,targetX,470); ctx.stroke();
      ctx.fillStyle = "#ffdf57"; ctx.beginPath(); ctx.arc(personX,personY,9-progress*3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#ef5146"; ctx.fillRect(personX-6,personY+7,12,15);
      text("SAVED",x,y-60-progress*20,25,"#fff16b","center");
    }
    if (effect.type === "break") {
      // The log becomes two tumbling halves plus splinters instead of simply
      // vanishing on contact, making the surge result readable in motion.
      for (const side of [-1,1]) {
        ctx.save(); ctx.translate(x + side * progress * 68, y - progress * 25); ctx.rotate(side * (.25 + progress * 1.4));
        polygon([[-31,-9],[24,-13],[32,7],[-24,12]], side < 0 ? "#70412c" : "#5a3326", "#2c2421", 3); ctx.restore();
      }
      ctx.fillStyle = "#ffd879";
      for(let i=0;i<11;i++){ const a=i*.73; ctx.save();ctx.translate(x+Math.cos(a)*progress*92,y+Math.sin(a)*progress*62);ctx.rotate(a+progress*2);ctx.fillRect(-7,-3,14,6);ctx.restore(); }
    }
    if (effect.type === "hit") { ctx.strokeStyle = "#ff544b"; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(x,y,25+progress*70,0,Math.PI*2); ctx.stroke(); }
    ctx.restore();
  }
}

function drawHud(theme) {
  ctx.fillStyle = "#07111bdc"; ctx.fillRect(18,16,924,64);
  text(`HULL ${"◆".repeat(Math.max(0,state.integrity))}${"◇".repeat(Math.max(0,3-state.integrity))}`,38,39,21,state.integrity===1?"#ff5f54":"#e8f5e9");
  text(`RESCUE ${String(state.rescued).padStart(2,"0")}`,38,65,18,"#ffdf57");
  text(String(state.score).padStart(8,"0"),480,41,30,"#fff","center");
  text(`${Math.min(100,Math.floor(state.time/STAGE_SECONDS*100))}%`,480,67,15,"#83dce4","center");
  text("SURGE",745,37,17,"#9cfff4"); ctx.fillStyle="#15313c"; ctx.fillRect(815,27,105,18); ctx.fillStyle=theme.light; ctx.fillRect(818,30,99*state.surge,12);
  text(state.surge>=.34?"SPACE READY":"RECHARGING",920,63,14,state.surge>=.34?"#fff16b":"#7ba6ae","right");
  if (state.messageTime > 0) text(state.message,480,115,30,theme.light,"center");
}

function drawTitle() {
  const theme = palette[0]; drawSky(theme); drawChannel(theme);
  ctx.fillStyle = "#07101bbd"; ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.save(); ctx.translate(480,210); ctx.rotate(-.035);
  text("TIDEBREAK",0,0,78,"#f5eee0","center",900); text("95",224,52,56,"#ffcf55","center",900);
  ctx.restore();
  text("FLOODLINE RESCUE RACER",480,288,22,"#79e8e1","center");
  text("STEER THE HYDROFOIL. SURGE THROUGH THE IMPOSSIBLE.",480,330,17,"#d3e4e6","center",600);
  const blink = Math.floor(performance.now()/450)%2; if (blink) text("PRESS ENTER",480,405,29,"#ffdd61","center");
  text(`${displayCode(settings.controls.left)} ${displayCode(settings.controls.right)}  STEER`,350,457,18,"#fff","center"); text(`${displayCode(settings.controls.surge)}  SURGE`,610,457,18,"#fff","center");
  text("S  SETTINGS",480,490,15,"#9de8e2","center");
  text("v14.0 M2 REPRESENTATIVE SLICE",480,520,13,"#76a6af","center");
}

const settingRows = ["volume", "motion", "left", "right", "surge", "back"];
function drawSettings() {
  const theme = palette[0]; drawSky(theme); drawChannel(theme);
  ctx.fillStyle = "#06101bea"; ctx.fillRect(145,42,670,456);
  text("RESCUE CONSOLE",480,86,38,"#ffda61","center");
  text("ACCESSIBILITY & CONTROLS",480,120,16,"#82dedb","center");
  const rows = [
    ["MASTER VOLUME", `${Math.round(settings.volume * 100)}%`],
    ["REDUCED MOTION", settings.reducedMotion ? "ON" : "OFF"],
    ["STEER LEFT", displayCode(settings.controls.left)],
    ["STEER RIGHT", displayCode(settings.controls.right)],
    ["SURGE", displayCode(settings.controls.surge)],
    ["RETURN TO TITLE", "ENTER"]
  ];
  rows.forEach(([label, value], index) => {
    const y = 169 + index * 48;
    if (index === settingsRow) { ctx.fillStyle="#1a5263";ctx.fillRect(205,y-20,550,39); }
    text(label,230,y,19,index===settingsRow?"#fff":"#a9c8cc");
    text(bindingAction && settingRows[index] === bindingAction ? "PRESS A KEY" : value,730,y,19,bindingAction && settingRows[index] === bindingAction?"#ffda61":"#fff","right");
  });
  text(bindingAction ? "ESC CANCEL" : "↑ ↓ SELECT   ← → CHANGE   ENTER CONFIRM   ESC BACK",480,471,14,"#8fded9","center");
}

function drawEnd(theme) {
  ctx.fillStyle = "#06101ad9"; ctx.fillRect(145,118,670,315);
  text(state.mode === "cleared" ? "HARBOR LINE SECURED" : "RESCUE LINE BROKEN",480,175,38,state.mode === "cleared"?theme.light:"#ff665d","center");
  text(`RESCUED  ${state.rescued}`,480,244,27,"#fff","center"); text(`SCORE  ${state.score}`,480,283,27,"#fff","center");
  const rank = state.rescued >= 8 && state.integrity >= 2 ? "A" : state.rescued >= 5 ? "B" : "C";
  text(`RESCUE RANK ${rank}`,480,338,31,"#ffdf57","center"); text("R  RETRY",480,393,20,"#91e8e1","center");
}

function render() {
  if (settingsOpen) { drawSettings(); return; }
  if (state.mode === "title") { drawTitle(); return; }
  const theme = palette[state.section];
  ctx.save(); if (state.shake > 0 && !settings.reducedMotion) ctx.translate((Math.random()-.5)*12,(Math.random()-.5)*8);
  drawSky(theme); drawChannel(theme); [...state.entities].filter(entity => !entity.hit).sort((a,b)=>b.z-a.z).forEach(drawEntity); drawBoat(); drawEffects(); drawHud(theme); ctx.restore();
  if (paused) { ctx.fillStyle="#06101adc";ctx.fillRect(0,0,WIDTH,HEIGHT);text("PAUSED",480,245,54,"#fff","center");text("P TO RESUME",480,305,20,"#8ce7df","center"); }
  if (state.mode === "cleared" || state.mode === "gameover") drawEnd(theme);
}

function persistSettings() { settings = saveSettings(localStorage, settings); audio.setVolume(settings.volume); }
function changeSetting(direction = 1) {
  const row = settingRows[settingsRow];
  if (row === "volume") settings.volume = Math.round(Math.max(0, Math.min(1, settings.volume + direction * .1)) * 10) / 10;
  if (row === "motion") settings.reducedMotion = !settings.reducedMotion;
  persistSettings();
}

addEventListener("keydown", event => {
  if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space","Enter"].includes(event.code)) event.preventDefault();
  if (settingsOpen) {
    if (bindingAction) {
      if (event.code === "Escape") { bindingAction = null; return; }
      if (canBind(event.code, settings.controls, bindingAction)) {
        settings.controls[bindingAction] = event.code; bindingAction = null; persistSettings();
      }
      return;
    }
    if (event.code === "ArrowUp") settingsRow = (settingsRow + settingRows.length - 1) % settingRows.length;
    if (event.code === "ArrowDown") settingsRow = (settingsRow + 1) % settingRows.length;
    if (event.code === "ArrowLeft") changeSetting(-1);
    if (event.code === "ArrowRight") changeSetting(1);
    if (event.code === "Escape") settingsOpen = false;
    if (event.code === "Enter") {
      const row = settingRows[settingsRow];
      if (["left","right","surge"].includes(row)) bindingAction = row;
      else if (row === "back") settingsOpen = false;
      else changeSetting(1);
    }
    return;
  }
  if (event.code === settings.controls.left) keys.left = true;
  if (event.code === settings.controls.right) keys.right = true;
  if (event.code === "Enter" && state.mode === "title") { audio.ensure(); startGame(state); }
  if (event.code === "KeyS" && state.mode === "title") { settingsOpen = true; settingsRow = 0; }
  if (event.code === settings.controls.surge && !event.repeat && !paused && activateSurge(state)) audio.surge();
  if (event.code === "KeyP" && state.mode === "playing") paused = !paused;
  if (event.code === "KeyR" && state.mode !== "title") { audio.ensure(); startGame(state); paused = false; }
});
addEventListener("keyup", event => { if(event.code===settings.controls.left)keys.left=false;if(event.code===settings.controls.right)keys.right=false; });

function frame(now) {
  const dt = Math.min(.05,(now-last)/1000); last=now;
  const beforeRescue=state.rescued,beforeHull=state.integrity;
  if (!paused) updateGame(state,keys,dt);
  if(state.rescued>beforeRescue)audio.rescue(); if(state.integrity<beforeHull)audio.hit();
  audio.update(dt,state.mode==="playing"&&!paused,state.section,state.boatV,state.surgeTime); render(); requestAnimationFrame(frame);
}

window.__TIDEBREAK__ = { getState: () => JSON.parse(JSON.stringify(state)), getInputs: () => ({ ...keys }), getAudioState: () => audio.inspect(), getSettings: () => JSON.parse(JSON.stringify(settings)), isSettingsOpen: () => settingsOpen, start: () => startGame(state), surge: () => activateSurge(state) };
requestAnimationFrame(frame);
