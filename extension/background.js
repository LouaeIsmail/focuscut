let recording = false;
let t0 = 0;
/** @type {{ t: number, x: number, y: number, sx: number, sy: number }[]} */
let clicks = [];

function armTabs() {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (!tab.id || !tab.url || !/^https?:|^file:/.test(tab.url)) continue;
      const id = tab.id;
      chrome.scripting.executeScript(
        { target: { tabId: id, allFrames: true }, files: ["inject.js"] },
        () => {
          void chrome.runtime.lastError;
        },
      );
      chrome.tabs.sendMessage(id, { type: "focuscut-start", t0 }, () => {
        void chrome.runtime.lastError;
      });
    }
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "focuscut-ping") {
    sendResponse({ ok: true });
    return;
  }
  if (msg?.type === "focuscut-session-start") {
    recording = true;
    t0 = Number(msg.t0) || Date.now();
    clicks = [];
    armTabs();
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
  if ((msg?.type === "focuscut-click" || msg?.now) && recording) {
    const now = Number(msg.now) || Date.now();
    const t = Number.isFinite(Number(msg.t)) ? Number(msg.t) : (now - t0) / 1000;
    clicks.push({
      t,
      x: Number(msg.x),
      y: Number(msg.y),
      sx: Number(msg.sx),
      sy: Number(msg.sy),
    });
  }
});
