const ACTION_LABELS = Object.freeze({
  confirm: (label, title) => `${title}。「${label}」`,
  cancel: (label, title) => `${title}。「${label}」`,
  "request-restart": () => "現在のステージを最初からやり直す確認を開く",
  "request-title": () => "現在の進行を破棄してタイトルへ戻る確認を開く",
  "complete-ending": () => "総合結果とクレジットを表示する",
  "return-title": () => "タイトル画面へ戻る",
});

export function getMenuActionLabel(action, visibleLabel, screenTitle) {
  if (typeof action !== "string" || action.length === 0) throw new TypeError("action is required");
  if (typeof visibleLabel !== "string" || visibleLabel.length === 0) {
    throw new TypeError("visibleLabel is required");
  }
  if (typeof screenTitle !== "string" || screenTitle.length === 0) {
    throw new TypeError("screenTitle is required");
  }
  if (action.startsWith("start-stage-")) return `${visibleLabel}を開始する`;
  return ACTION_LABELS[action]?.(visibleLabel, screenTitle) ?? visibleLabel;
}

export function setMenuBackgroundInert(elements, inert) {
  if (!Array.isArray(elements) || typeof inert !== "boolean") {
    throw new TypeError("elements and inert are required");
  }
  for (const element of elements) element.inert = inert;
}

export function focusInitialMenuAction(buttons) {
  const candidates = Array.from(buttons ?? []);
  const target = candidates.find((button) => button.dataset?.primary === "true") ?? candidates[0];
  target?.focus?.({ preventScroll: true });
  return target ?? null;
}
