export const SETTINGS_KEY = "tidebreak95.settings.v1";

export const DEFAULT_SETTINGS = Object.freeze({
  volume: 0.8,
  reducedMotion: false,
  controls: Object.freeze({ left: "ArrowLeft", right: "ArrowRight", surge: "Space" })
});

const ALLOWED_CODES = new Set([
  "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space",
  ...Array.from({ length: 26 }, (_, index) => `Key${String.fromCharCode(65 + index)}`)
]);

export function normalizeSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  const controls = source.controls && typeof source.controls === "object" ? source.controls : {};
  const normalizedControls = {
    left: ALLOWED_CODES.has(controls.left) ? controls.left : DEFAULT_SETTINGS.controls.left,
    right: ALLOWED_CODES.has(controls.right) ? controls.right : DEFAULT_SETTINGS.controls.right,
    surge: ALLOWED_CODES.has(controls.surge) ? controls.surge : DEFAULT_SETTINGS.controls.surge
  };
  if (new Set(Object.values(normalizedControls)).size !== 3) {
    normalizedControls.left = DEFAULT_SETTINGS.controls.left;
    normalizedControls.right = DEFAULT_SETTINGS.controls.right;
    normalizedControls.surge = DEFAULT_SETTINGS.controls.surge;
  }
  return {
    volume: Number.isFinite(source.volume) ? Math.max(0, Math.min(1, source.volume)) : DEFAULT_SETTINGS.volume,
    reducedMotion: source.reducedMotion === true,
    controls: normalizedControls
  };
}

export function loadSettings(storage) {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    if (!raw) return normalizeSettings(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw);
    const normalized = normalizeSettings(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) storage?.setItem(SETTINGS_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    const restored = normalizeSettings(DEFAULT_SETTINGS);
    try { storage?.setItem(SETTINGS_KEY, JSON.stringify(restored)); } catch {}
    return restored;
  }
}

export function saveSettings(storage, settings) {
  const normalized = normalizeSettings(settings);
  try { storage?.setItem(SETTINGS_KEY, JSON.stringify(normalized)); } catch {}
  return normalized;
}

export function displayCode(code) {
  if (code === "Space") return "SPACE";
  if (code.startsWith("Arrow")) return code.slice(5).toUpperCase();
  if (code.startsWith("Key")) return code.slice(3);
  return code.toUpperCase();
}

export function canBind(code, controls, action) {
  return ALLOWED_CODES.has(code) && Object.entries(controls).every(([name, value]) => name === action || value !== code);
}
