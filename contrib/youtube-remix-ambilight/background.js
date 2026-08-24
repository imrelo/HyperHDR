// Service worker: giu ket noi toi HyperHDR va chuyen tiep khung hinh.
// KHONG con tabCapture, KHONG con offscreen document, KHONG con activeTab.
// Content script lo phan doc pixel; o day chi lo duong truyen.
//
// Vi sao ket noi phai nam O DAY chu khong phai trong content script:
// content script bi rang buoc boi CSP cua trang, ma YouTube chan connect-src
// toi localhost. Service worker la ngu canh extension nen khong dinh CSP do.

// May nay co 2 instance: 0 = "led ban", 1 = "led man hinh".
// JSON-RPC KHONG co tham so instance cho lenh image; instance la TRANG THAI
// CUA KET NOI, dat bang instance/switchTo, mac dinh la 0. Vi vay phai dung
// WebSocket (ket noi ben) — moi instance mot ket noi rieng.
// Bo bot so trong mang nay neu chi muon mot dan den.
const TARGET_INSTANCES = [0, 1];
const WS_URL = "ws://localhost:8090";
const PRIORITY = 50;      // so CANG NHO cang uu tien cao (245 = grabber)
const DURATION = 2000;    // ms — ngung gui la den tu tat sau chung nay

const log = (...a) => console.log("[HyperHDR-BG]", ...a);

// instance -> { ws, ready }
const conns = new Map();

function connectOne(inst) {
  const old = conns.get(inst);
  if (old && old.ws && (old.ws.readyState === WebSocket.CONNECTING || old.ws.readyState === WebSocket.OPEN)) return;

  const ws = new WebSocket(WS_URL);
  const c = { ws, ready: false };
  conns.set(inst, c);

  ws.onopen = () => {
    // Phai switchTo TRUOC khi gui anh, neu khong anh roi vao instance 0.
    ws.send(JSON.stringify({ command: "instance", subcommand: "switchTo", instance: inst }));
  };

  ws.onmessage = (ev) => {
    let j;
    try { j = JSON.parse(ev.data); } catch (e) { return; }
    if (j.command === "instance-switchTo") {
      if (j.success) { c.ready = true; log("instance", inst, "san sang"); }
      else console.error("[HyperHDR-BG] switchTo instance", inst, "that bai:", j.error);
      return;
    }
    if (j.command === "image" && j.success === false) {
      console.error("[HyperHDR-BG] instance", inst, "tu choi anh:", j.error);
    }
  };

  ws.onclose = () => { c.ready = false; };
  ws.onerror = () => { c.ready = false; };
}

function connectAll() { for (const inst of TARGET_INSTANCES) connectOne(inst); }

function closeAll(sendClear) {
  for (const [, c] of conns) {
    try {
      if (sendClear && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(JSON.stringify({ command: "clear", priority: PRIORITY }));
      }
      c.ws.close();
    } catch (e) {}
  }
  conns.clear();
}

let forwarded = 0;

function forwardFrame(b64) {
  const payload = JSON.stringify({
    command: "image", priority: PRIORITY, origin: "RemixExt",
    imagedata: b64, format: "auto", duration: DURATION
  });

  let delivered = 0;
  for (const [inst, c] of conns) {
    if (c.ready && c.ws.readyState === WebSocket.OPEN) { c.ws.send(payload); delivered++; }
    else connectOne(inst);   // tu noi lai neu rot
  }
  if (delivered === 0) connectAll();
  if (delivered > 0 && ++forwarded % 150 === 0) {
    log("da chuyen", forwarded, "frame toi", delivered, "instance");
  }
}

// ---------------------------------------------------------------------------
// Bat / tat  — bam icon la xong, KHONG can bam lai sau moi lan F5
// ---------------------------------------------------------------------------
// MAC DINH BAT: chua tung luu gi (undefined) van tinh la bat.
// Chi khi nguoi dung tu bam tat, luc do storage moi co enabled === false.
// Nho vay cai xong la chay ngay, khong phai bam lan nao.
async function getEnabled() {
  const { enabled } = await chrome.storage.local.get("enabled");
  return enabled !== false;
}

function badge(on) {
  chrome.action.setBadgeText({ text: on ? "ON" : "" });
  if (on) chrome.action.setBadgeBackgroundColor({ color: "#1a7f37" });
}

chrome.action.onClicked.addListener(async () => {
  const on = !(await getEnabled());
  await chrome.storage.local.set({ enabled: on });
  badge(on);
  log(on ? "DA BAT" : "DA TAT");
  if (on) connectAll();
  else closeAll(true);
});

chrome.runtime.onStartup.addListener(async () => {
  const on = await getEnabled();
  badge(on);
  if (on) connectAll();
});

chrome.runtime.onInstalled.addListener(async () => {
  const on = await getEnabled();
  badge(on);
  if (on) connectAll();
});

// ---------------------------------------------------------------------------
// Nhan frame tu content script
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === "frame") {
    forwardFrame(msg.data);
    reply({ ok: true });
    return true;
  }
  if (msg.type === "stop") {
    closeAll(true);
    reply({ ok: true });
    return true;
  }
});
