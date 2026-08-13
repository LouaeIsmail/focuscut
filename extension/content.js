let active = false;
let t0 = 0;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "focuscut-start") {
    active = true;
    t0 = Number(msg.t0) || Date.now();
  }
  if (msg?.type === "focuscut-stop") {
    active = false;
  }
});

window.addEventListener(
  "pointerdown",
  (e) => {
    if (!active || e.button !== 0) return;
    chrome.runtime.sendMessage({
      type: "focuscut-click",
      t: (Date.now() - t0) / 1000,
      x: e.clientX / Math.max(1, window.innerWidth),
      y: e.clientY / Math.max(1, window.innerHeight),
      sx: e.screenX / Math.max(1, window.screen.width),
      sy: e.screenY / Math.max(1, window.screen.height),
    });
  },
  true,
);

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.channel !== "focuscut") return;
  chrome.runtime.sendMessage(data, (res) => {
    window.postMessage(
      { channel: "focuscut-reply", id: data.id, ...(res || {}) },
      "*",
    );
  });
});
