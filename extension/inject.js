(() => {
  if (window.__focuscutClicks) return;
  window.__focuscutClicks = true;
  window.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0) return;
      chrome.runtime.sendMessage({
        type: "focuscut-click",
        now: Date.now(),
        x: e.clientX / Math.max(1, window.innerWidth),
        y: e.clientY / Math.max(1, window.innerHeight),
        sx: e.screenX / Math.max(1, window.screen.width),
        sy: e.screenY / Math.max(1, window.screen.height),
      });
    },
    true,
  );
})();
