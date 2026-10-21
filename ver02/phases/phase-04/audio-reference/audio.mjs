const grid = document.querySelector("[data-audio-grid]");
const status = document.querySelector("[data-status]");

function createCard(asset) {
  const card = document.createElement("article");
  card.className = "audio-card";

  const title = document.createElement("h2");
  title.textContent = asset.id.toUpperCase();
  const role = document.createElement("p");
  role.textContent = asset.role;
  const player = document.createElement("audio");
  player.controls = true;
  player.preload = "metadata";
  player.loop = asset.loop;
  player.src = `../../../assets/audio/reference/${asset.file}`;
  player.setAttribute("aria-label", `${asset.role} preview`);

  const metadata = document.createElement("div");
  metadata.className = "audio-meta";
  for (const value of [`${asset.durationMs}ms`, `${asset.targetPeakDb}dBFS`, asset.loop ? "LOOP" : "ONE SHOT"]) {
    const item = document.createElement("span");
    item.textContent = value;
    metadata.append(item);
  }
  card.append(title, role, player, metadata);
  return card;
}

try {
  const response = await fetch("../../../assets/audio/reference/manifest.json");
  if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
  const assets = await response.json();
  grid.append(...assets.map(createCard));
  status.dataset.state = "ready";
  status.textContent = `${assets.length}ファイル / 外部サンプル0 / 決定的に再生成可能`;
} catch (error) {
  status.dataset.state = "error";
  status.textContent = `音声台帳を読み込めません: ${error.message}`;
}
