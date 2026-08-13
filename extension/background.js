let recording = false;
let t0 = 0;
/** @type {{ t: number, x: number, y: number, sx: number, sy: number }[]} */
let clicks = [];

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "focuscut-ping") {
    sendResponse({ ok: true });
    return;
  }
  if (msg?.type === "focuscut-session-start") {
    recording = true;
    t0 = Number(msg.t0) || Date.now();
    clicks = [];
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (!tab.id) continue;
        chrome.tabs.sendMessage(tab.id, { type: "focuscut-start", t0 }, () => {
          void chrome.runtime.lastError;
        });
      }
    });
    sendResponse({ ok: true });
    return;
  }
  if (msg?.type === "focuscut-session-stop") {
    recording = false;
    const out = clicks.slice();
    clicks = [];
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (!tab.id) continue;
        chrome.tabs.sendMessage(tab.id, { type: "focuscut-stop" }, () => {
          void chrome.runtime.lastError;
        });
      }
    });
    sendResponse({ ok: true, clicks: out });
    return;
  }
  if (msg?.type === "focuscut-click" && recording) {
    clicks.push({
      t: Number(msg.t),
      x: Number(msg.x),
      y: Number(msg.y),
      sx: Number(msg.sx),
      sy: Number(msg.sy),
    });
  }
});
