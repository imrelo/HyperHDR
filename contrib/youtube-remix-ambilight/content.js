// Content script chay TRONG trang YouTube.
// Tu inject moi lan tai trang -> song qua F5, khong can activeTab, khong can bam.
// Ve THANG the <video> ra canvas nen khong dinh giao dien YouTube.
//
// Vi sao doc duoc pixel: YouTube phat qua MSE voi blob:https://www.youtube.com/...
// Blob do chinh trang tao ra nen CUNG ORIGIN -> canvas khong bi tainted.
// (Neu gap luong progressive cross-origin thi toDataURL nem SecurityError,
//  ta bat va bao ro thay vi chet im.)

const WIDTH = 480;
const HEIGHT = 270;
const FPS = 15;
const JPEG_QUALITY = 0.5;

const REMIX = new RegExp([
  "re-?mix", "bootleg", "mash-?up", "rework", "refix", "\\bflip\\b",
  "nightcore", "slowed", "reverb", "sp(ee|e)d ?up", "sped ?up",
  "vip ?mix", "extended ?mix", "club ?mix", "radio ?edit",
  "dance ?mix", "festival ?mix", "chill ?mix", "mixtape",
  "\\bedm\\b", "hardstyle", "phonk", "dubstep", "techno", "trance",
  "\\bdnb\\b", "drum ?(and|n|&) ?bass",
  "vina ?house", "deep ?house", "future ?house", "tech ?house", "progressive ?house",
  "viet ?mix", "nhac san", "nhac bay", "bay phong", "sap san",
  "cang det", "kich dong", "non-? ?stop", "bass boost",
  "\\bdj\\b", "\\bmix\\b"
].join("|"), "i");

// Bo dau tieng Viet + ha chu thuong, de mot tu khoa khong dau bat duoc moi cach viet.
function norm(s) {
  return (s || "")
    .normalize("NFD")
    .replace(new RegExp("[" + String.fromCharCode(768) + "-" + String.fromCharCode(879) + "]", "g"), "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase();
}

const log = (...a) => console.log("[HyperHDR-CS]", ...a);

const canvas = document.createElement("canvas");
canvas.width = WIDTH;
canvas.height = HEIGHT;
const ctx = canvas.getContext("2d", { alpha: false });

let enabled = false;
let tainted = false;
let lastSent = 0;
let sent = 0;
let lastReason = "";

// MAC DINH BAT — giong getEnabled() ben background.js: chua luu gi van tinh la bat.
// Chi khi nguoi dung tu bam tat thi storage moi co enabled === false.
chrome.storage.local.get("enabled").then((o) => {
  enabled = o.enabled !== false;
  log("khoi dong, enabled =", enabled);
});
chrome.storage.onChanged.addListener((ch, area) => {
  if (area === "local" && ch.enabled) {
    enabled = ch.enabled.newValue !== false;
    log("enabled ->", enabled);
    if (!enabled) chrome.runtime.sendMessage({ type: "stop" }).catch(() => {});
  }
});

function pickVideo() {
  const vids = [...document.querySelectorAll("video")].filter((v) => v.videoWidth > 0);
  if (!vids.length) return null;
  // the video co do phan giai that lon nhat (tranh dinh quang cao / preview)
  vids.sort((a, b) => b.videoWidth * b.videoHeight - a.videoWidth * a.videoHeight);
  return vids[0];
}

function gate(v) {
  const title = (document.title || "").replace(/^\(\d+\)\s*/, "");
  if (!REMIX.test(norm(title))) return "tieu de khong phai remix";
  if (v.paused || v.ended) return "khong phat (pause/het bai)";
  if (v.readyState < 2) return "chua du du lieu";
  if (v.muted || v.volume === 0) return "video bi tat tieng";
  return null;
}

function tick() {
  if (!enabled || tainted) return;

  const v = pickVideo();
  if (!v) return;

  const why = gate(v);
  if (why) {
    if (why !== lastReason) { log("--- dang CHAN:", why); lastReason = why; }
    return;
  }
  if (lastReason !== null && lastReason !== "") { log(">>> BAT den"); }
  lastReason = null;

  // tu gioi han nhip: rVFC va setInterval cung goi tick, cai nao khong bi
  // throttle thi cai do keo — nhung khong duoc gui qua FPS da dat.
  const now = performance.now();
  if (now - lastSent < 1000 / FPS) return;
  lastSent = now;

  try {
    // ve THANG the video: khong co header, sidebar hay comment nao lot vao
    ctx.drawImage(v, 0, 0, WIDTH, HEIGHT);
    const url = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    chrome.runtime.sendMessage({ type: "frame", data: url.slice(url.indexOf(",") + 1) })
      .catch(() => {});   // service worker dang khoi dong lai -> bo qua frame nay
    if (++sent % 150 === 0) log("da gui", sent, "frame");
  } catch (e) {
    tainted = true;
    console.error("[HyperHDR-CS] canvas bi tainted, khong doc duoc pixel:", e.message);
  }
}

// ---------------------------------------------------------------------------
// Hai nguon nhip, chay song song co chu y.
// setInterval bi Chrome ep ve 1Hz khi tab an -> mot minh no khong du.
// requestVideoFrameCallback no theo TUNG KHUNG HINH video giai ma duoc va
// KHONG bi timer throttling — day moi la nguon nhip chinh khi tab o nen.
// Neu ca hai deu im khi tab an thi nghia la Chrome da dinh chi giai ma video,
// luc do khong con cach nao lay pixel nua (xem ghi chu trong README).
// ---------------------------------------------------------------------------
setInterval(tick, Math.round(1000 / FPS));

function pumpRVFC() {
  const v = pickVideo();
  if (!v || typeof v.requestVideoFrameCallback !== "function") {
    setTimeout(pumpRVFC, 1000);   // chua co video, cho roi thu lai
    return;
  }
  v.requestVideoFrameCallback(function cb() {
    tick();
    const nv = pickVideo();
    if (nv && typeof nv.requestVideoFrameCallback === "function") nv.requestVideoFrameCallback(cb);
    else setTimeout(pumpRVFC, 1000);
  });
}
pumpRVFC();

log("san sang");
