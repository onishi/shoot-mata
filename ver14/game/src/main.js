import { activateSurge, createGame, HEIGHT, missionTime, routeProfile, startGame, STAGE_SECONDS, updateGame, WIDTH } from "./model.js";
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
const keys = { left: false, right: false, dive: false, surface: false };
let pauseReason = null;
let frameStats = { elapsedMs: 0, samples: 0, sumMs: 0, maxMs: 0, overBudget: 0 };

function releaseInputs() { keys.left = false; keys.right = false; keys.dive = false; keys.surface = false; }
function setPaused(value, reason = null) {
  paused = value;
  pauseReason = value ? reason : null;
  releaseInputs();
  last = performance.now();
}
function pauseForInterruption(reason) {
  if (state.mode === "playing" && !paused) setPaused(true, reason);
}
function resetFrameStats() { frameStats = { elapsedMs: 0, samples: 0, sumMs: 0, maxMs: 0, overBudget: 0 }; }

const palette = [
  { sky: "#ef8b56", far: "#542e58", water: "#086078", edge: "#172f46", light: "#ffdb79" },
  { sky: "#594684", far: "#1e3159", water: "#0b6474", edge: "#342747", light: "#f28a67" },
  { sky: "#173b62", far: "#0d223a", water: "#075464", edge: "#17233d", light: "#79e0dd" },
  { sky: "#13233d", far: "#090f20", water: "#074452", edge: "#181a2f", light: "#f3d054" },
  { sky: "#0b1a30", far: "#07101f", water: "#09566b", edge: "#293847", light: "#ffb84d" },
  { sky: "#170e25", far: "#080b17", water: "#073c4b", edge: "#261c31", light: "#ff6655" }
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

function drawUnderflowSky(theme) {
  const pulse = 0.55 + Math.sin(state.time * 5) * 0.18;
  ctx.fillStyle = "#071522"; ctx.fillRect(0, 0, WIDTH, 540);
  ctx.fillStyle = "#102c39"; ctx.fillRect(0, 150, WIDTH, 390);
  polygon([[0,0],[960,0],[960,205],[760,184],[610,216],[410,180],[205,213],[0,188]], "#111a25", "#3b5361", 5);
  ctx.fillStyle = "#26343d";
  for (let x = 30; x < 960; x += 118) {
    polygon([[x,0],[x+34,0],[x+80,218],[x+48,213]], "#26343d", "#52636b", 3);
    ctx.fillStyle = `rgba(255,196,76,${pulse})`; ctx.fillRect(x+39,154,18,9); ctx.fillStyle = "#26343d";
  }
  ctx.strokeStyle = "#55cbd0"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0,208); ctx.bezierCurveTo(220,184,330,224,510,198); ctx.bezierCurveTo(690,174,780,220,960,194); ctx.stroke();
  ctx.fillStyle = "#08141ed8"; ctx.fillRect(340,112,280,48);
  text("UNDERFLOW 07", 480, 137, 23, "#80f0e5", "center");
}

function drawContainerPort(theme) {
  const flash = .55 + Math.sin(state.time * 7) * .25;
  ctx.fillStyle = "#070d18"; ctx.fillRect(0, 0, WIDTH, 245);
  ctx.fillStyle = "#111a2a";
  polygon([[0,220],[0,104],[78,104],[78,220]], "#111a2a");
  polygon([[882,220],[882,78],[960,78],[960,220]], "#111a2a");
  ctx.strokeStyle="#293a50";ctx.lineWidth=13;
  ctx.beginPath();ctx.moveTo(80,202);ctx.lineTo(235,55);ctx.lineTo(235,220);ctx.moveTo(880,202);ctx.lineTo(725,55);ctx.lineTo(725,220);ctx.stroke();
  ctx.strokeStyle=theme.light;ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(92,193);ctx.lineTo(225,65);ctx.moveTo(868,193);ctx.lineTo(735,65);ctx.stroke();
  for (const [x,y,color] of [[18,126,"#b7473e"],[18,164,"#315b70"],[86,154,"#d58c3a"],[824,118,"#315b70"],[892,154,"#b7473e"],[824,156,"#d58c3a"]]) {
    ctx.fillStyle=color;ctx.fillRect(x,y,118,32);ctx.strokeStyle="#080d16";ctx.lineWidth=3;ctx.strokeRect(x,y,118,32);
    ctx.strokeStyle="#ffffff33";ctx.beginPath();ctx.moveTo(x+12,y+5);ctx.lineTo(x+12,y+27);ctx.moveTo(x+106,y+5);ctx.lineTo(x+106,y+27);ctx.stroke();
  }
  ctx.fillStyle=`rgba(255,207,72,${flash})`;ctx.fillRect(286,183,388,8);
  ctx.fillStyle="#08101bd9";ctx.fillRect(330,112,300,47);text("COLLAPSE QUAY 9",480,137,22,"#ffd458","center");
}

function drawStormwall(theme) {
  const lightning = Math.max(0, Math.sin(state.time * 3.7) - .92) * 5;
  const sky = ctx.createLinearGradient(0, 0, 0, 280);
  sky.addColorStop(0, `rgba(118,151,174,${.16 + lightning})`); sky.addColorStop(1, "#07101f");
  ctx.fillStyle = "#07101f"; ctx.fillRect(0, 0, WIDTH, 300); ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, 300);
  polygon([[0,224],[0,95],[108,73],[205,119],[294,84],[384,126],[480,88],[579,122],[674,79],[771,117],[865,72],[960,101],[960,224]], "#182738", "#52697a", 5);
  ctx.strokeStyle="#ffb84d";ctx.lineWidth=4;
  for(let x=44;x<960;x+=116){ctx.beginPath();ctx.moveTo(x,112+(x%3)*7);ctx.lineTo(x,217);ctx.stroke();ctx.fillStyle="#ffb84d";ctx.fillRect(x-9,126,18,8);}
  ctx.fillStyle="#07101fd9";ctx.fillRect(325,116,310,48);text("STORMWALL 95",480,141,23,"#ffd063","center");
  const surgeY=222-state.stormLevel*85;
  ctx.fillStyle="rgba(44,151,177,.42)";ctx.fillRect(0,surgeY,960,235-surgeY);
  ctx.strokeStyle="#b8ffffbb";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,surgeY);for(let x=0;x<=960;x+=80)ctx.lineTo(x,surgeY+Math.sin(x*.025+state.time*5)*8);ctx.stroke();
}

function drawLeviathan(theme) {
  ctx.fillStyle="#080a14";ctx.fillRect(0,0,960,300);
  if(state.bossDefeated){
    const t=state.bossCollapseTime,sink=Math.min(1,Math.max(0,(t-1.4)/4.2)),roll=Math.sin(Math.min(1,t/5.5)*Math.PI)*-.055;
    const pressure=Math.min(1,t/2.8),split=Math.min(1,t/1.6);
    ctx.fillStyle="#102c3c";ctx.fillRect(0,205,960,335);
    ctx.save();ctx.translate(480,154+sink*138);ctx.rotate(roll);
    polygon([[-376,70],[-324,-36],[-202,-84],[-26,-61],[0,-30],[26,-61],[202,-84],[324,-36],[376,70]],"#242737","#8995a0",8);
    polygon([[-220,57],[-184,-55],[-68,-88],[-18,-41],[-10,75]],"#343746","#b5bdc0",6);
    polygon([[10,75],[18,-41],[68,-88],[184,-55],[220,57]],"#30333f","#9fa8ad",6);
    ctx.strokeStyle="#ff6a55";ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-8,-82);ctx.lineTo(-18+split*-42,92);ctx.stroke();
    for(const side of [-1,1]){ctx.save();ctx.translate(side*(42+split*84),-15+split*24);ctx.rotate(side*split*.17);polygon([[-70,-35],[65,-42],[82,47],[-63,53]],"#353846","#737f88",5);ctx.restore();}
    ctx.restore();
    ctx.strokeStyle=`rgba(145,255,247,${.28+pressure*.55})`;ctx.lineWidth=8+pressure*12;
    for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(480+side*(28+split*28),205+sink*98);ctx.quadraticCurveTo(480+side*(170+pressure*80),265,480+side*(330+pressure*90),392+sink*36);ctx.stroke();}
    ctx.fillStyle=`rgba(117,255,242,${.08+pressure*.16})`;ctx.beginPath();ctx.ellipse(480,270+sink*110,170+pressure*250,35+pressure*54,0,0,Math.PI*2);ctx.fill();
    text(["CORE RUPTURE","PRESSURE BREAK","LEVIATHAN SINKING","ESCAPE CORRIDOR OPEN"][state.bossCollapseStage]??"CORE RUPTURE",480,109,24,state.bossCollapseStage===3?"#9cfff4":"#ff8068","center",900);
    return;
  }
  if(state.bossPhase<3){
    polygon([[104,223],[156,117],[278,70],[480,92],[682,70],[804,117],[856,223]],"#242737","#788493",8);
    polygon([[250,211],[285,104],[405,76],[480,40],[555,76],[675,104],[710,211]],"#343746","#a4adb0",6);
    ctx.fillStyle="#ff5d4d";for(const [x,y] of [[310,116],[390,91],[480,69],[570,91],[650,116]]){ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle="#d9c25c";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(214,154);ctx.lineTo(116,258);ctx.moveTo(746,154);ctx.lineTo(844,258);ctx.stroke();
    if (state.messageTime <= 0) text("LEVIATHAN BREAKER",480,151,25,"#ff705d","center",900);
  }else{
    ctx.fillStyle="#171d29";ctx.fillRect(0,120,960,420);ctx.strokeStyle="#596473";ctx.lineWidth=13;
    for(let x=35;x<960;x+=105){ctx.beginPath();ctx.moveTo(x,120);ctx.lineTo(x+35,540);ctx.stroke();}
    ctx.fillStyle="#7a2530";ctx.beginPath();ctx.arc(480,236,54,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#ff6655";ctx.lineWidth=8;ctx.stroke();
    ctx.fillStyle="#090d17dd";ctx.fillRect(330,105,300,48);text("BREAKER INTERNALS",480,130,22,"#ff8b62","center");
  }
}

function drawSky(theme) {
  if (state.section === 2) { drawUnderflowSky(theme); return; }
  if (state.section === 3) { drawContainerPort(theme); return; }
  if (state.section === 4) { drawStormwall(theme); return; }
  if (state.section === 5) { drawLeviathan(theme); return; }
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
}

function channelX(worldX, z) { return WIDTH / 2 + worldX * (170 + (1 - z) * 330); }
function channelY(z) { return 214 + Math.pow(1 - z, 1.45) * 326; }

function projectedRoute(time, z) {
  const lookAhead = Math.max(0, z) * 3.2;
  return routeProfile(time + lookAhead, state.routeChoices);
}

function drawFloodedArcade(theme) {
  // A close, inhabited commercial canyon replaces the harbor skyline. Shop
  // fronts lean toward the S-bend while signs and balconies establish scale.
  const sideBuildings = [
    [0, 170, 176, 335, "#252944"], [62, 126, 122, 360, "#343151"],
    [784, 145, 176, 360, "#272d49"], [858, 105, 102, 390, "#3c3150"]
  ];
  for (const [x,y,w,h,color] of sideBuildings) {
    ctx.fillStyle=color; ctx.fillRect(x,y,w,h);
    ctx.fillStyle="#f0b85c";
    for(let row=0;row<4;row++) for(let col=0;col<2;col++) ctx.fillRect(x+18+col*46,y+32+row*48,22,9);
  }
  ctx.fillStyle="#de5148";ctx.fillRect(20,248,132,31);text("NAMI MARKET",86,265,14,"#fff5d5","center");
  ctx.fillStyle="#51bbb4";ctx.fillRect(806,222,132,31);text("AQUA ARCADE",872,239,14,"#071b2a","center");
  ctx.strokeStyle="#181b31";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(110,192);ctx.lineTo(302,238);ctx.moveTo(850,173);ctx.lineTo(666,235);ctx.stroke();
  ctx.fillStyle="#f6d45e";for(const [x,y] of [[112,192],[300,238],[850,173],[668,235]]){ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();}
}

function drawChannel(theme) {
  const samples = [];
  for (let i = 0; i <= 12; i++) {
    const z = 1 - i / 12, profile = projectedRoute(state.time, z), y = channelY(z);
    samples.push({ y, left: channelX(profile.center - profile.halfWidth, z), right: channelX(profile.center + profile.halfWidth, z) });
  }
  polygon([...samples.map(point=>[point.left,point.y]), ...samples.slice().reverse().map(point=>[point.right,point.y])], theme.water);
  polygon([[0,210],[samples[0].left,samples[0].y],...samples.slice(1).map(point=>[point.left,point.y]),[0,540]], theme.edge);
  polygon([[960,210],[samples[0].right,samples[0].y],...samples.slice(1).map(point=>[point.right,point.y]),[960,540]], theme.edge);
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const y = 245 + i * 42 + ((state.time * 80) % 42);
    const ratio = (y - 210) / 330;
    ctx.strokeStyle = i % 2 ? "#43b7bd55" : "#b8ffff44";
    ctx.beginPath(); ctx.moveTo(480 - 70 - ratio * 340, y); ctx.quadraticCurveTo(480, y - 13, 480 + 80 + ratio * 280, y); ctx.stroke();
  }
  ctx.strokeStyle = theme.light; ctx.lineWidth = 5; ctx.setLineDash([14, 16]);
  ctx.beginPath(); ctx.moveTo(samples[0].left,samples[0].y);for(const point of samples.slice(1))ctx.lineTo(point.left,point.y);
  ctx.moveTo(samples[0].right,samples[0].y);for(const point of samples.slice(1))ctx.lineTo(point.right,point.y);ctx.stroke();ctx.setLineDash([]);
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
    drawFloodedArcade(theme);
    const direction = state.crosscurrent >= 0 ? 1 : -1;
    ctx.strokeStyle="#a5fff0aa";ctx.lineWidth=5;
    for(let row=0;row<4;row++){
      const y=304+row*53, reach=55+row*20, center=channelX(state.routeCenter,(500-y)/290);
      ctx.beginPath();ctx.moveTo(center-direction*reach,y);ctx.lineTo(center+direction*reach,y+10);ctx.lineTo(center+direction*(reach-18),y-3);ctx.stroke();
    }
  }
  if (state.section === 2) {
    const tunnelWaterline=510-state.underflowWater*118;
    ctx.fillStyle="#0a2733aa";ctx.fillRect(0,205,960,335);
    ctx.fillStyle="rgba(39,177,190,.16)";ctx.fillRect(0,tunnelWaterline,960,540-tunnelWaterline);
    ctx.strokeStyle="#86fff077";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,tunnelWaterline);ctx.quadraticCurveTo(240,tunnelWaterline-7,480,tunnelWaterline);ctx.quadraticCurveTo(720,tunnelWaterline+7,960,tunnelWaterline);ctx.stroke();
    ctx.strokeStyle = "#8de8dd66"; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(270,255); ctx.quadraticCurveTo(520,350,700,510); ctx.stroke();
    ctx.strokeStyle="#2b5360";ctx.lineWidth=9;
    for(let y=260;y<540;y+=72){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(150,y+18);ctx.moveTo(960,y);ctx.lineTo(810,y+18);ctx.stroke();}
  }
  if (state.section === 3) {
    const waterLine = 505 - state.tideLevel * 118;
    ctx.fillStyle="rgba(82,221,222,.16)";ctx.fillRect(0,waterLine,960,540-waterLine);
    ctx.strokeStyle="#80fff0aa";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,waterLine);ctx.quadraticCurveTo(240,waterLine-10,480,waterLine);ctx.quadraticCurveTo(720,waterLine+10,960,waterLine);ctx.stroke();
    for(const [x,y,c] of [[34,290,"#b7473e"],[125,352,"#315b70"],[770,300,"#d58c3a"],[842,382,"#b7473e"]]){ctx.save();ctx.translate(x,y);ctx.rotate(x<480?-.12:.12);ctx.fillStyle=c;ctx.fillRect(0,0,126,38);ctx.strokeStyle="#090f19";ctx.lineWidth=4;ctx.strokeRect(0,0,126,38);ctx.restore();}
  }
  if (state.section === 4) {
    const surgeY=520-state.stormLevel*145;
    ctx.fillStyle="rgba(33,176,198,.24)";ctx.fillRect(0,surgeY,960,540-surgeY);
    ctx.strokeStyle="#b9ffff88";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,surgeY);ctx.bezierCurveTo(230,surgeY-18,410,surgeY+16,610,surgeY-8);ctx.bezierCurveTo(760,surgeY-24,865,surgeY+12,960,surgeY-4);ctx.stroke();
    for(const side of [-1,1]){
      const nearX=channelX(state.routeCenter+side*state.routeHalfWidth,0),farX=channelX(projectedRoute(state.time,1).center+side*projectedRoute(state.time,1).halfWidth,1);
      polygon([[farX,214],[farX+side*38,214],[nearX+side*120,540],[nearX,540]],side<0?"#344756":"#2d4050","#7f9baa",5);
      ctx.strokeStyle="#ffbd4c";ctx.lineWidth=6;ctx.setLineDash([22,18]);ctx.beginPath();ctx.moveTo(farX+side*16,220);ctx.lineTo(nearX+side*58,540);ctx.stroke();ctx.setLineDash([]);
    }
  }
  if (state.section === 5) {
    if(state.bossPhase===2){
      for(const side of [-1,1]){const nearX=channelX(state.routeCenter+side*state.routeHalfWidth,0),farX=channelX(projectedRoute(state.time,1).center+side*projectedRoute(state.time,1).halfWidth,1);polygon([[farX,214],[farX+side*48,214],[nearX+side*135,540],[nearX,540]],"#373947","#aaadb0",7);ctx.strokeStyle="#ff654f";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(farX+side*20,220);ctx.lineTo(nearX+side*60,540);ctx.stroke();}
    }
    if(state.bossPhase===3){ctx.fillStyle="rgba(12,104,119,.24)";ctx.fillRect(0,360,960,180);ctx.strokeStyle="#7bfff0aa";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,360);ctx.quadraticCurveTo(480,345,960,360);ctx.stroke();}
  }
}

function drawEntity(entity) {
  const z = Math.max(0, entity.z);
  const x = channelX(entity.x, z), y = channelY(z), scale = .25 + (1 - z) * 1.25;
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  if (entity.type === "survivor" || entity.type === "prioritySurvivor" || entity.type === "routeSurvivor" || entity.type === "tunnelSurvivor" || entity.type === "convoyPickup") {
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
    if (entity.type === "prioritySurvivor" || entity.type === "routeSurvivor" || entity.type === "tunnelSurvivor" || entity.type === "convoyPickup") {
      ctx.fillStyle="#10243ddd";ctx.fillRect(-50,22,100,24);text(entity.route,-0,35,12,"#ffe263","center");
    }
    if (entity.type === "prioritySurvivor") {
      ctx.fillStyle="#ffcf55";ctx.beginPath();ctx.arc(-33,-62,17,0,Math.PI*2);ctx.fill();
      text(`×${entity.passengers}`, -33, -62, 13, "#172337", "center");
    }
    if (entity.type === "convoyPickup") {
      ctx.strokeStyle="#ffcf55";ctx.lineWidth=5;ctx.strokeRect(-46,-60,92,100);
      text(`FERRY +${entity.passengers}`,0,62,12,"#9cfff4","center");
    }
    if (entity.type === "tunnelSurvivor") {
      ctx.strokeStyle=entity.layer==="deep"?"#69efff":"#ffe26a";ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,43,0,Math.PI*2);ctx.stroke();
      text(entity.layer==="deep"?"▼ DIVE":"▲ SURFACE",0,61,11,entity.layer==="deep"?"#69efff":"#ffe26a","center");
    }
  } else if (entity.type === "forkBreak") {
    ctx.rotate(-.12);polygon([[-76,-15],[-42,-31],[-5,-20],[24,-37],[72,-18],[65,17],[19,21],[-20,32],[-70,18]],"#693b2a","#ffd05b",6);
    ctx.strokeStyle="#2b211d";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-48,-19);ctx.lineTo(44,15);ctx.moveTo(7,-25);ctx.lineTo(-16,23);ctx.stroke();
    ctx.fillStyle="#08111de8";ctx.fillRect(-82,-83,164,35);text("SPACE — BREAK",0,-66,13,"#ffdb62","center");
  } else if (entity.type === "forkGate") {
    ctx.strokeStyle="#77f0df";ctx.lineWidth=10;ctx.beginPath();ctx.arc(0,-5,55,Math.PI,0);ctx.stroke();
    ctx.fillStyle="#ffce52";ctx.fillRect(-60,-9,13,45);ctx.fillRect(47,-9,13,45);
    ctx.fillStyle="#08111de8";ctx.fillRect(-70,-82,140,32);text("SAFE BYPASS",0,-66,13,"#9cfff4","center");
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
  } else if (entity.type === "lowCeiling") {
    polygon([[-90,-55],[90,-55],[76,12],[44,-2],[19,18],[-15,-5],[-48,14],[-78,-4]], "#26313a", "#76a0a8", 5);
    ctx.fillStyle="#f1bf48";for(let x=-68;x<70;x+=34)ctx.fillRect(x,-44,18,7);
    text("DIVE",0,-20,17,"#72eff0","center");
  } else if (entity.type === "intake") {
    ctx.fillStyle="#111c27";ctx.beginPath();ctx.arc(0,-5,51,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#ef6152";ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,-5,48,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<8;i++){ctx.save();ctx.rotate(i*Math.PI/4+state.time*2);ctx.fillStyle="#6c8790";ctx.fillRect(5,-5,39,10);ctx.restore();}
    text("SURFACE",0,61,13,"#ffe26a","center");
  } else if (entity.type === "tunnelValve") {
    ctx.fillStyle="#182937";ctx.beginPath();ctx.arc(0,-5,56,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=entity.route==="FLOOD"||entity.route==="BYPASS"?"#69efff":"#ffcf55";ctx.lineWidth=9;ctx.beginPath();ctx.arc(0,-5,45,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle="#dbe9df";ctx.lineWidth=7;for(let i=0;i<6;i++){ctx.save();ctx.rotate(i*Math.PI/3);ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(0,-43);ctx.stroke();ctx.restore();}
    ctx.fillStyle="#07101fe8";ctx.fillRect(-92,-112,184,42);text(entity.warning,0,-98,12,"#ffe169","center");text("▼ DIVE + STEER",0,-79,12,"#83fff2","center");
  } else if (entity.type === "containerFall") {
    const high = entity.tide === "high";
    const swing = Math.sin(state.time * 2.8 + entity.id) * 10;
    ctx.save();ctx.translate(swing, high ? 18 : -42);ctx.rotate(high ? -.08 : .08);
    polygon([[-62,-25],[62,-25],[62,25],[-62,25]], high?"#315b70":"#b7473e", "#ffd45b", 5);
    ctx.strokeStyle="#ffffff55";ctx.lineWidth=3;for(let bx=-42;bx<=42;bx+=28){ctx.beginPath();ctx.moveTo(bx,-20);ctx.lineTo(bx,20);ctx.stroke();}
    ctx.restore();
    ctx.fillStyle="#08111de8";ctx.fillRect(-76,-91,152,43);
    text(entity.warning,0,-78,12,"#ffd45b","center");
    text(high?"▲ HIGH WATER":"▼ LOW WATER",0,-59,12,high?"#7effea":"#ffdd63","center");
  } else if (entity.type === "convoyFork") {
    const high=entity.tide==="high";
    ctx.strokeStyle=high?"#70f4e7":"#ffd25b";ctx.lineWidth=11;ctx.beginPath();ctx.arc(0,-2,55,Math.PI,0);ctx.stroke();
    ctx.fillStyle="#172738";ctx.fillRect(-60,-5,14,49);ctx.fillRect(46,-5,14,49);
    ctx.fillStyle="#07101fe8";ctx.fillRect(-91,-105,182,50);text(entity.warning,0,-91,12,"#ffd063","center");
    text(`${high?"▲ HIGH":"▼ LOW"} · ${entity.route}`,0,-70,12,high?"#8ffff1":"#ffdc63","center");
  } else if (entity.type === "wallGate" || entity.type === "stormFork") {
    const left=entity.side==="left", lift=entity.control==="surface";
    ctx.fillStyle="#101b28";ctx.fillRect(left?-88:-18,-76,106,116);
    ctx.strokeStyle="#91a8b2";ctx.lineWidth=6;ctx.strokeRect(left?-88:-18,-76,106,116);
    ctx.fillStyle="#ffb84d";for(let y=-62;y<30;y+=24)ctx.fillRect(left?-76:-6,y,82,8);
    ctx.fillStyle="#07101fe8";ctx.fillRect(-91,-121,182,43);text(entity.warning,0,-108,13,"#ffd063","center");
    text(`${left?"◀ WEST":"EAST ▶"}  ${lift?"↑ LIFT":"↓ DROP"}`,0,-87,12,lift?"#9dfff2":"#ffcc58","center");
    if(entity.type==="stormFork")text(entity.route,0,56,13,"#9dfff2","center",900);
  } else if (entity.type === "stormShelter") {
    ctx.fillStyle="#102b36";ctx.fillRect(-116,-57,232,97);ctx.strokeStyle="#8ffff1";ctx.lineWidth=8;ctx.strokeRect(-116,-57,232,97);
    ctx.fillStyle="#ffd063";ctx.fillRect(-93,-34,186,12);ctx.fillStyle="#07101fe8";ctx.fillRect(-105,-108,210,45);
    text(entity.warning,0,-94,15,"#ffd063","center",900);text("FERRY FORMATION",0,-73,12,"#9dfff2","center");
  } else if (entity.type === "bossAnchor") {
    ctx.strokeStyle="#d7c45d";ctx.lineWidth=10;for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(0,-70+i*18,12,0,Math.PI*2);ctx.stroke();}
    polygon([[-48,9],[-13,-6],[-13,-50],[13,-50],[13,-6],[48,9],[34,31],[0,13],[-34,31]],"#404857","#ffcf55",6);
    ctx.fillStyle="#07101fe8";ctx.fillRect(-92,-118,184,35);text(entity.warning,0,-101,13,"#ffdd63","center");
  } else if (entity.type === "bossHull") {
    const left=entity.side==="left";polygon(left?[[-94,-66],[28,-66],[58,48],[-72,48]]:[[-28,-66],[94,-66],[72,48],[-58,48]],"#353846","#b7bdc1",7);
    ctx.fillStyle="#ff654f";for(let y=-46;y<37;y+=25)ctx.fillRect(left?-72:-2,y,74,8);
    ctx.fillStyle="#07101fe8";ctx.fillRect(-95,-112,190,35);text(entity.warning,0,-95,13,"#ff8068","center");
  } else if (entity.type === "bossDrain") {
    ctx.fillStyle="#121925";ctx.beginPath();ctx.arc(0,-4,58,0,Math.PI*2);ctx.fill();ctx.strokeStyle=entity.layer==="deep"?"#63efff":"#ffdc63";ctx.lineWidth=10;ctx.stroke();
    for(let i=0;i<8;i++){ctx.save();ctx.rotate(i*Math.PI/4+state.time);ctx.fillStyle="#67727a";ctx.fillRect(5,-5,42,10);ctx.restore();}
    ctx.fillStyle="#07101fe8";ctx.fillRect(-104,-112,208,38);text(entity.warning,0,-93,12,entity.layer==="deep"?"#63efff":"#ffdc63","center");
  } else if (entity.type === "bossCore") {
    const pulse=1+Math.sin(state.time*10)*.12;ctx.scale(pulse,pulse);ctx.fillStyle="#7d2034";ctx.beginPath();ctx.arc(0,-5,62,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#ff6655";ctx.lineWidth=11;ctx.stroke();ctx.strokeStyle="#8ffff1";ctx.lineWidth=5;for(let i=0;i<6;i++){ctx.save();ctx.rotate(i*Math.PI/3);ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(0,-53);ctx.stroke();ctx.restore();}text("SPACE — CORE",0,-91,15,"#ffdf63","center");
  } else {
    polygon([[-62,20],[-45,-38],[35,-38],[61,20]], "#111826", "#e9c85c", 5);
    ctx.fillStyle = "#e64c42"; ctx.fillRect(entity.type === "bargeLeft" ? 5 : -35, -28, 30, 14);
  }
  ctx.restore();
}

function drawEscort() {
  const escaping=state.section===5&&state.bossDefeated&&state.bossCollapseTime>=3.2;
  if (!escaping && (!state.escortActive || (state.section !== 3 && state.section !== 4) || state.escortSecured)) return;
  const escape=Math.max(0,state.bossCollapseTime-3.2);
  const x=escaping?channelX(state.boatX-.18-Math.sin(escape*1.4)*.04,.24):channelX(state.escortX,.24),y=escaping?channelY(.24)-Math.min(46,escape*16):channelY(.24);
  ctx.save();ctx.translate(x,y);ctx.scale(.72,.72);
  ctx.fillStyle="#06101a99";ctx.beginPath();ctx.ellipse(0,10,82,17,0,0,Math.PI*2);ctx.fill();
  polygon([[-73,10],[-60,-22],[-37,-34],[42,-34],[68,-10],[76,10]],"#ded9bd","#091522",5);
  polygon([[-38,-34],[-18,-61],[32,-61],[47,-34]],"#d4483e","#762a31",3);
  ctx.fillStyle="#17384b";ctx.fillRect(-8,-55,28,13);ctx.fillStyle="#ffe05a";ctx.fillRect(-58,-16,18,9);ctx.fillRect(45,-16,18,9);
  text("RESCUE FERRY",4,-76,12,"#fff0a8","center");
  ctx.restore();
}

function drawBoat() {
  const wallLift = (state.section === 4 || (state.section === 5 && state.bossPhase === 2)) && state.wallRideTime > 0 ? 42 : 0;
  const escapeLift=state.bossDefeated?Math.max(0,state.bossCollapseTime-4.2)*14:0;
  const x = channelX(state.boatX, 0), y = 472 + state.depth * 36 - wallLift - Math.min(48,escapeLift);
  if (state.surgeTime > 0) {
    const pulse = 64 + Math.sin(state.time * 38) * 8;
    ctx.strokeStyle = "#9cfff4"; ctx.lineWidth = 10; ctx.globalAlpha = .65;
    ctx.beginPath(); ctx.ellipse(x, y + 15, pulse * 1.65, pulse * .55, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  const wallRoll = state.wallRideSide === "left" ? -.36 : state.wallRideSide === "right" ? .36 : 0;
  const roll = wallRoll || Math.max(-0.18, Math.min(0.18, state.boatV * .16));
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
  if ((state.section === 2 || (state.section === 5 && state.bossPhase === 3)) && state.depth > .08) {
    ctx.fillStyle=`rgba(18,117,137,${Math.min(.48,state.depth*.48)})`;ctx.beginPath();ctx.ellipse(x,y-9,82,58,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#a5ffffaa";ctx.lineWidth=3;
    for(let i=0;i<5;i++){const bx=x-48+i*23+Math.sin(state.time*4+i)*9,by=y-35-((state.time*42+i*19)%62);ctx.beginPath();ctx.arc(bx,by,3+(i%2)*2,0,Math.PI*2);ctx.stroke();}
  }
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
    if (effect.type === "repair") {
      ctx.strokeStyle = "#8ffff1"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x,y,24+progress*78,0,Math.PI*2); ctx.stroke();
      text("HULL +1",x,y-48-progress*24,22,"#fff16b","center");
    }
    if (effect.type === "nearMiss") {
      const side = effect.side ?? 1;
      ctx.strokeStyle = "#9cfff4"; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x + side * 12, y + 24); ctx.quadraticCurveTo(x + side * (42 + progress * 55), y - 14, x + side * (70 + progress * 85), y - 62); ctx.stroke();
      text("SKIM", x + side * (48 + progress * 35), y - 78 - progress * 18, 21, "#fff16b", "center");
    }
    if (effect.type === "shortcut") {
      ctx.strokeStyle = "#ffdf57"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x,y,28+progress*92,0,Math.PI*2); ctx.stroke();
      text(`−${effect.seconds}s`, x, y-112-progress*24, 22, "#9cfff4", "center");
    }
    if (effect.type === "containerClear") { ctx.strokeStyle="#8dfff1";ctx.lineWidth=11;ctx.beginPath();ctx.arc(x,y,28+progress*105,0,Math.PI*2);ctx.stroke();text("PASSAGE OPEN",x,y-55-progress*25,23,"#ffdd63","center"); }
    if (effect.type === "escortHit") { ctx.strokeStyle="#ff544b";ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(x-70-progress*35,y-50);ctx.lineTo(x+70+progress*35,y+25);ctx.moveTo(x+70+progress*35,y-50);ctx.lineTo(x-70-progress*35,y+25);ctx.stroke(); }
    if (effect.type === "gateOpen") { ctx.strokeStyle="#ffcf5d";ctx.lineWidth=12;ctx.beginPath();ctx.arc(x,y,35+progress*120,-Math.PI*.85,-Math.PI*.15);ctx.stroke();text("FLOODLOCK OPEN",x,y-52-progress*32,22,"#9dfff2","center"); }
    ctx.restore();
  }
}

function drawHud(theme) {
  ctx.fillStyle = "#07111bdc"; ctx.fillRect(18,16,924,64);
  text(`HULL ${"◆".repeat(Math.max(0,state.integrity))}${"◇".repeat(Math.max(0,3-state.integrity))}`,38,39,21,state.integrity===1?"#ff5f54":"#e8f5e9");
  text(`RESCUE ${String(state.rescued).padStart(2,"0")}`,38,65,18,"#ffdf57");
  if (state.nearMissChain > 0) text(`SKIM ×${Math.min(5,state.nearMissChain)}`,198,65,15,"#9cfff4");
  text(String(state.score).padStart(8,"0"),480,41,30,"#fff","center");
  const routeClock = missionTime(state), minutes = Math.floor(routeClock / 60), seconds = Math.floor(routeClock % 60);
  text(`${minutes}:${String(seconds).padStart(2,"0")}${state.shortcutSeconds ? `  CUT −${state.shortcutSeconds}s` : ""}`,480,67,15,"#83dce4","center");
  text("SURGE",745,37,17,"#9cfff4"); ctx.fillStyle="#15313c"; ctx.fillRect(815,27,105,18); ctx.fillStyle=theme.light; ctx.fillRect(818,30,99*state.surge,12);
  text(state.surge>=.34?"SPACE READY":"RECHARGING",920,63,14,state.surge>=.34?"#fff16b":"#7ba6ae","right");
  // The collapse scene carries a persistent phase title in the world layer.
  // Suppress the transient event banner so both messages never occupy the
  // same focal line during the seven-second finale.
  if (state.messageTime > 0 && !state.bossDefeated) text(state.message,480,115,30,theme.light,"center");
  if (state.section === 0 && state.time < 90 && state.messageTime <= 0) {
    const cue = state.trainingCue;
    const prompt = state.time < 12 ? "STEER INTO SIGNALS" : state.time < 28 ? "SPACE: SURGE THROUGH DEBRIS" : "AMBER GATES PATCH EARLY HULL DAMAGE";
    ctx.fillStyle="#07111be8";ctx.fillRect(238,86,484,42);
    text(cue ? `DANGER ${cue.direction === "left" ? "←" : "→"}  STEER ${cue.direction.toUpperCase()}${cue.type === "driftwood" ? " OR SURGE" : ""}` : prompt,480,107,15,cue ? (cue.urgency>.55?"#ff685f":"#ffcf55") : "#9cfff4","center",800);
  }
  if (state.section === 0 && state.time >= 50) {
    ctx.fillStyle="#07111bdc";ctx.fillRect(684,86,238,46);
    text(`PRIORITY ${state.harborPriorities.length}/4`,704,101,12,"#ffdf57");
    text(`ROUTES ${state.harborRoutes.length}/3`,704,121,12,"#9cfff4");
  }
  if (state.section === 1) {
    const arrow=state.crosscurrent>0.03?"→":state.crosscurrent<-.03?"←":"·";
    const district=state.routeChoices.find(choice=>choice.choice==="market")?.route??"CHOOSE DISTRICT";
    const relay=state.routeChoices.find(choice=>choice.choice==="station")?.route;
    ctx.fillStyle="#07111bdc";ctx.fillRect(684,86,238,48);
    text(`${district}${relay?` → ${relay}`:""}`,910,99,12,"#ffdf57","right");
    text(`CURRENT ${arrow} ${Math.round(Math.abs(state.crosscurrent)*100)}`,910,121,13,"#9cfff4","right");
  }
  if (state.section === 2) {
    ctx.fillStyle="#07111bdc";ctx.fillRect(678,86,244,67);
    text("DEPTH",748,101,13,"#9cfff4");ctx.fillStyle="#173642";ctx.fillRect(806,94,96,13);ctx.fillStyle="#62e7eb";ctx.fillRect(809,97,90*state.depth,7);
    text(state.depth>=.58?"DEEP — ↑ SURFACE":"SURFACE — ↓ DIVE",910,123,12,state.depth>=.58?"#69efff":"#ffe26a","right");
    const valves=state.underflowValves.map(choice=>choice.route).join(" → ")||"VALVES AHEAD";
    text(`${valves}  WATER ${Math.round(state.underflowWater*100)}`,910,144,11,"#ffdc66","right");
  }
  if (state.section === 3) {
    ctx.fillStyle="#07111be8";ctx.fillRect(672,86,250,82);
    text(`FERRY ${"◆".repeat(Math.max(0,state.escortIntegrity))}${"◇".repeat(Math.max(0,3-state.escortIntegrity))}`,704,102,14,state.escortIntegrity===1?"#ff665d":"#fff1b0");
    text(`LOAD ${state.escortLoad}  ${state.escortRallyTime>0?"RALLY":"SPACE: RALLY"}`,910,102,12,state.escortRallyTime>0?"#9cfff4":"#ffdc63","right");
    text("TIDE",692,128,13,"#9cfff4");ctx.fillStyle="#173642";ctx.fillRect(746,120,152,15);ctx.fillStyle=state.tideTarget==="high"?"#62e7eb":"#ffcf55";ctx.fillRect(749,123,146*state.tideLevel,9);
    const route=state.convoyRoutes.map(item=>item.route).join(" → ")||"ROUTES AHEAD";
    text(`${state.tideTarget==="high"?"↑ HIGH":"↓ LOW"}  ${route}`,910,155,11,state.tideTarget==="high"?"#79fff0":"#ffdc63","right");
  }
  if (state.section === 4) {
    ctx.fillStyle="#07111be8";ctx.fillRect(662,86,260,86);
    text("STORM",704,103,13,"#9cfff4");ctx.fillStyle="#173642";ctx.fillRect(765,95,133,15);ctx.fillStyle=state.stormLevel>.72?"#ff5c52":"#4fd9e2";ctx.fillRect(768,98,127*state.stormLevel,9);
    text(state.wallRideSide?`${state.wallRideSide.toUpperCase()} WALL LOCK` : "EDGE + SPACE TO RIDE",910,129,12,state.wallRideSide?"#ffcf5d":"#d5eef0","right");
    const systems=state.stormRoutes.map(item=>item.route).join(" → ")||"SYSTEMS AHEAD";
    text(`${state.wallGateClears.length}/12 GATES · FERRY ${"◆".repeat(Math.max(0,state.escortIntegrity))}`,910,146,11,"#fff1ad","right");
    text(systems,910,164,11,"#9cfff4","right");
  }
  if (state.section === 5) {
    ctx.fillStyle="#07111be8";ctx.fillRect(648,86,274,86);
    const phase=["","ANCHOR CUT","HULL RIDE","INTERNAL DRAIN"][state.bossPhase]??"BREACH";
    text(`LEVIATHAN · ${phase}`,908,103,12,"#ff8068","right");
    text(`ANCHORS ${state.bossAnchors.length}/2 · ARMOR ${state.bossHullBreaches.length}/3`,908,126,11,"#ffdc63","right");
    text(`DRAINS ${state.bossDrains.length}/2 · CORE ${state.bossDefeated?"DOWN":"LIVE"}`,908,149,11,state.bossDefeated?"#8ffff1":"#fff","right");
    if(state.bossPhase===2)text(state.wallRideSide?`${state.wallRideSide.toUpperCase()} HULL LOCK`:"EDGE + SPACE TO RIDE",908,168,11,"#9cfff4","right");
    if(state.bossDefeated){text(`BREAKAWAY ${Math.min(100,Math.round(state.bossCollapseTime/6.8*100))}%`,908,168,11,"#9cfff4","right");}
  }
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
  text(`${displayCode(settings.controls.left)} ${displayCode(settings.controls.right)}  STEER`,300,457,18,"#fff","center"); text(`${displayCode(settings.controls.surge)}  SURGE`,510,457,18,"#fff","center");
  text("↑ ↓  SURFACE / DIVE",720,457,16,"#9de8e2","center");
  text("S  SETTINGS",480,490,15,"#9de8e2","center");
  text("v14.0 M3 LEVIATHAN RUN",480,520,13,"#76a6af","center");
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
  text(state.mode === "cleared" ? "LEVIATHAN BREAKER SUNK" : "RESCUE LINE BROKEN",480,175,38,state.mode === "cleared"?theme.light:"#ff665d","center");
  const routeClock = missionTime(state), minutes = Math.floor(routeClock / 60), seconds = Math.floor(routeClock % 60);
  text(`RESCUED  ${state.rescued}    SKIMS  ${state.nearMisses}`,480,234,24,"#fff","center");
  text(`ROUTE TIME  ${minutes}:${String(seconds).padStart(2,"0")}    CUT  −${state.shortcutSeconds}s`,480,273,22,"#9cfff4","center"); text(`SCORE  ${state.score}`,480,310,25,"#fff","center");
  const rank = state.rescued >= 8 && state.integrity >= 2 ? "A" : state.rescued >= 5 ? "B" : "C";
  text(`RESCUE RANK ${rank}`,480,352,30,"#ffdf57","center"); text("R  RETRY",480,397,20,"#91e8e1","center");
}

function render() {
  if (settingsOpen) { drawSettings(); return; }
  if (state.mode === "title") { drawTitle(); return; }
  const theme = palette[state.section];
  ctx.save(); if (state.shake > 0 && !settings.reducedMotion) ctx.translate((Math.random()-.5)*12,(Math.random()-.5)*8);
  drawSky(theme); drawChannel(theme); [...state.entities].filter(entity => !entity.hit).sort((a,b)=>b.z-a.z).forEach(drawEntity); drawEscort(); drawBoat(); drawEffects(); drawHud(theme); ctx.restore();
  if (paused) {
    ctx.fillStyle="#06101adc";ctx.fillRect(0,0,WIDTH,HEIGHT);text(pauseReason ? "RESCUE HOLD" : "PAUSED",480,235,54,"#fff","center");
    if (pauseReason) text("WINDOW FOCUS LOST — CONTROLS RELEASED",480,286,17,"#ffdb66","center");
    text("P TO RESUME",480,326,20,"#8ce7df","center");
  }
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
  if (!paused && event.code === settings.controls.left) keys.left = true;
  if (!paused && event.code === settings.controls.right) keys.right = true;
  if (!paused && event.code === "ArrowDown") keys.dive = true;
  if (!paused && event.code === "ArrowUp") keys.surface = true;
  if (event.code === "Enter" && state.mode === "title") { audio.ensure(); startGame(state); resetFrameStats(); }
  if (event.code === "KeyS" && state.mode === "title") { settingsOpen = true; settingsRow = 0; }
  if (event.code === settings.controls.surge && !event.repeat && !paused && activateSurge(state)) audio.surge();
  if (event.code === "KeyP" && state.mode === "playing") setPaused(!paused, null);
  if (event.code === "KeyR" && state.mode !== "title") { audio.ensure(); startGame(state); setPaused(false); resetFrameStats(); }
});
addEventListener("keyup", event => { if(event.code===settings.controls.left)keys.left=false;if(event.code===settings.controls.right)keys.right=false;if(event.code==="ArrowDown")keys.dive=false;if(event.code==="ArrowUp")keys.surface=false; });
addEventListener("blur", () => pauseForInterruption("blur"));
document.addEventListener("visibilitychange", () => { if (document.hidden) pauseForInterruption("hidden"); });

function frame(now) {
  const rawMs = Math.max(0, now - last); const dt = Math.min(.05,rawMs/1000); last=now;
  if (state.mode === "playing" && !paused && rawMs < 1000) {
    frameStats.elapsedMs += rawMs; frameStats.samples += 1; frameStats.sumMs += rawMs;
    frameStats.maxMs = Math.max(frameStats.maxMs, rawMs); if (rawMs > 20) frameStats.overBudget += 1;
  }
  const beforeRescue=state.rescued,beforeNearMiss=state.nearMisses,beforeHull=state.integrity,beforeEscort=state.escortIntegrity,beforeBoss=state.bossDefeated,beforeCollapseStage=state.bossCollapseStage;
  if (!paused) updateGame(state,keys,dt);
  if(state.rescued>beforeRescue)audio.rescue(); if(state.nearMisses>beforeNearMiss)audio.nearMiss(state.nearMissChain); if(state.integrity<beforeHull||state.escortIntegrity<beforeEscort)audio.hit();
  if(!beforeBoss&&state.bossDefeated)audio.coreBreak();
  if(state.bossCollapseStage>beforeCollapseStage&&state.bossCollapseStage>0)audio.collapse(state.bossCollapseStage);
  audio.update(dt,state.mode==="playing"&&!paused,state.section,state.boatV,state.surgeTime,state.depth); render(); requestAnimationFrame(frame);
}

window.__TIDEBREAK__ = {
  getState: () => JSON.parse(JSON.stringify(state)), getInputs: () => ({ ...keys }), getAudioState: () => audio.inspect(),
  getSettings: () => JSON.parse(JSON.stringify(settings)), isSettingsOpen: () => settingsOpen,
  getRuntime: () => ({ paused, pauseReason, frameStats: { ...frameStats, averageMs: frameStats.samples ? frameStats.sumMs / frameStats.samples : 0 } }),
  start: () => { startGame(state); setPaused(false); resetFrameStats(); }, surge: () => activateSurge(state)
};
requestAnimationFrame(frame);
