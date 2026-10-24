function setStatus(statusElement, message) {
  statusElement.hidden = message.length === 0;
  statusElement.textContent = message;
}

export function createFullscreenController({ documentTarget, element, button, statusElement }) {
  if (!documentTarget?.addEventListener || !documentTarget?.removeEventListener) {
    throw new TypeError("documentTarget must be an event target");
  }
  if (!element || !button?.addEventListener || !button?.removeEventListener || !statusElement) {
    throw new TypeError("element, button, and statusElement are required");
  }

  const supported = typeof element.requestFullscreen === "function"
    && typeof documentTarget.exitFullscreen === "function";

  const sync = () => {
    const active = documentTarget.fullscreenElement === element;
    button.textContent = active ? "通常表示" : "フルスクリーン";
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-disabled", String(!supported));
    if (active) setStatus(statusElement, "フルスクリーン表示中です。通常表示へ戻せます。");
    else if (supported) setStatus(statusElement, "");
  };

  const onClick = async () => {
    if (!supported) {
      setStatus(statusElement, "フルスクリーン非対応です。通常表示のままプレイを継続できます。");
      return false;
    }
    try {
      if (documentTarget.fullscreenElement) await documentTarget.exitFullscreen();
      else await element.requestFullscreen();
      sync();
      return true;
    } catch {
      sync();
      setStatus(statusElement, "フルスクリーンを開始できませんでした。通常表示のままプレイを継続できます。");
      return false;
    }
  };

  const onFullscreenChange = () => sync();
  const onFullscreenError = () => {
    sync();
    setStatus(statusElement, "フルスクリーンを開始できませんでした。通常表示のままプレイを継続できます。");
  };

  button.addEventListener("click", onClick);
  documentTarget.addEventListener("fullscreenchange", onFullscreenChange);
  documentTarget.addEventListener("fullscreenerror", onFullscreenError);
  sync();

  return Object.freeze({
    supported,
    sync,
    dispose() {
      button.removeEventListener("click", onClick);
      documentTarget.removeEventListener("fullscreenchange", onFullscreenChange);
      documentTarget.removeEventListener("fullscreenerror", onFullscreenError);
    },
  });
}
