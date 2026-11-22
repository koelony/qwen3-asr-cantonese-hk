import { mountCursor } from "./design/cursor.js";

const $ = (id) => document.getElementById(id);
const worker = new Worker(new URL("./asr-worker.js", import.meta.url), { type: "module" });
// The shared koel pointer (design/cursor.js): mouse only, follows reduced motion live, and white over
// the red buttons, the record button included.
mountCursor({ solid: ".btn-solid, .mic.rec" });
let ready = false, busy = false, seq = 0;
const qs = new URLSearchParams(location.search);
const pending = new Map();
const hist = [];
window.__hkasr = { log: [] };

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
function badge(cls, txt) { const b = $("badge"); b.className = "badge " + cls; b.textContent = txt; }
function step(n, state) { const el = $("step" + n); if (el) el.dataset.state = state; }
const fmtMB = (b) => (b / 1048576).toFixed(0) + " MB";

function setLoadStage(stage) {
  const host = $("loadStages");
  if (!host) return;
  host.hidden = false;
  const order = ["download", "compile", "ready"];
  const idx = order.indexOf(stage);
  for (const el of host.querySelectorAll("[data-stage]")) {
    const i = order.indexOf(el.dataset.stage);
    el.className = i < idx || stage === "ready" ? "done" : i === idx ? "active" : "";
  }
}

let pendingSample = null;

worker.onmessage = (e) => {
  const m = e.data;
  window.__hkasr.log.push({ t: performance.now(), type: m.type, msg: m.msg });
  if (m.type === "progress") {
    $("prog").hidden = false; $("prog").classList.remove("done");
    $("bar").style.width = Math.min(92, (92 * m.done) / Math.max(m.total, 1)).toFixed(1) + "%";
    setLoadStage("download");
    $("loadMsg").textContent = `${m.cached >= m.done ? "由 cache 讀取" : "下載中"}：${fmtMB(m.done)} / ${fmtMB(m.total)}（${m.file}）`;
  } else if (m.type === "status") {
    $("prog").hidden = false;
    $("bar").style.width = "96%";
    setLoadStage("compile");
    $("loadMsg").textContent = m.msg;
  } else if (m.type === "ready") {
    ready = true;
    const be = m.backend === "webgpu" ? "WebGPU" : `CPU（WASM ${m.threads} 線程${m.coi ? "" : "，冇 cross-origin isolation"}）`;
    $("prog").hidden = false; $("prog").classList.add("done"); $("bar").style.width = "100%";
    setLoadStage("ready");
    badge("ok", "已載入 · " + be);
    $("loadMsg").textContent = `模型準備好（${m.loadSec.toFixed(1)} 秒）。後端：${be}`;
    $("drop").removeAttribute("aria-disabled");
    step(1, "done"); step(2, "active");
    $("loadBtn").disabled = true; $("loadBtn").textContent = "模型已載入"; $("backend").disabled = true;
    const slb = $("sampleLoadBtn"); if (slb) slb.hidden = true;
    window.__hkasr.ready = m;
    pending.get("init")?.resolve(m); pending.delete("init");
    if (pendingSample) {
      const s = pendingSample; pendingSample = null;
      runSampleTranscribe(s.url, s.label).catch(() => {});
    }
  } else if (m.type === "partial") {
    const p = pending.get(m.id); if (p?.onPartial) p.onPartial(m);
  } else if (m.type === "result") {
    const p = pending.get(m.id); pending.delete(m.id); p?.resolve(m);
  } else if (m.type === "mel") {
    const p = pending.get(m.id); pending.delete(m.id); p?.resolve(m);
  } else if (m.type === "error") {
    console.error(m.msg, m.stack);
    badge("err", "出錯");
    $("loadMsg").textContent = "出錯：" + m.msg;
    const key = m.id ?? "init"; const p = pending.get(key); pending.delete(key); p?.reject(new Error(m.msg));
    if (!ready) { $("loadBtn").disabled = false; $("model").disabled = false; }
  }
};

let MODELS = [];
const modelsReady = fetch("models.json").then((r) => r.json()).then((d) => {
  MODELS = d.models;
  for (const m of MODELS) { const o = document.createElement("option"); o.value = m.id; o.textContent = m.label; if (m.default) o.selected = true; $("model").appendChild(o); }
  const q = new URLSearchParams(location.search).get("model"); if (q && MODELS.some((m) => m.id === q)) $("model").value = q;
});
async function loadModel() {
  await modelsReady;
  const m = MODELS.find((x) => x.id === $("model").value) || MODELS[0];
  $("loadBtn").disabled = true; $("model").disabled = true; badge("busy", "載入中…");
  setLoadStage("download");
  return new Promise((resolve, reject) => {
    pending.set("init", { resolve, reject });
    worker.postMessage({ type: "init", prefer: $("backend").value, modelDir: m.dir, modelId: m.id });
  });
}
$("loadBtn").onclick = () => {
  if (device.mobile && !mobileAck) { // nudge mobile users to a computer before a 1.2 GB download
    const n = $("mobileNotice"); n.hidden = false; n.classList.remove("shake"); void n.offsetWidth; n.classList.add("shake");
    n.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  loadModel().catch(() => {});
};

async function decodeToMono16k(arrayBuf) {
  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const ab = await ctx.decodeAudioData(arrayBuf);
    const n = ab.length, out = new Float32Array(n);
    for (let c = 0; c < ab.numberOfChannels; c++) { const d = ab.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[i] / ab.numberOfChannels; }
    return out;
  } finally { ctx.close(); }
}

function runWorker(type, wav, onPartial) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onPartial });
    worker.postMessage({ type, id, wav }, [wav.buffer]);
  });
}

async function transcribeBuffer(arrayBuf, label) {
  if (!ready || busy) return;
  busy = true; badge("busy", "轉緊…");
  $("outCard").hidden = false; $("outTitle").textContent = label; step(3, "active");
  const out = $("out"); out.textContent = ""; out.classList.add("streaming"); $("stats").textContent = "解碼音頻中…";
  try {
    const wav = await decodeToMono16k(arrayBuf);
    const dur = wav.length / 16000;
    $("stats").textContent = `音頻 ${dur.toFixed(1)} 秒，推理中…`;
    const r = await runWorker("transcribe", wav, (p) => {
      out.textContent = p.text;
      if (p.nChunks > 1) $("stats").textContent = `音頻 ${dur.toFixed(1)} 秒 · 第 ${p.chunk}/${p.nChunks} 段`;
    });
    out.textContent = r.text || "（聽唔到嘢）";
    step(2, "done"); step(3, "done");
    if (!qs.get("selftest")) $("nudge").hidden = false;
    $("stats").textContent = `${r.backend === "webgpu" ? "WebGPU" : "WASM"} · 音頻 ${r.dur.toFixed(1)}s · 用時 ${r.sec.toFixed(2)}s · RTF ${r.rtf.toFixed(3)} · encoder ${r.encSec.toFixed(2)}s · decoder ${r.decSec.toFixed(2)}s（${r.tokPerSec.toFixed(1)} tok/s）`;
    hist.unshift({ label, text: r.text, stats: `${r.dur.toFixed(1)}s · RTF ${r.rtf.toFixed(3)}` });
    renderHist();
    badge("ok", "已載入 · " + (r.backend === "webgpu" ? "WebGPU" : "WASM"));
    return r;
  } catch (err) {
    out.textContent = ""; $("stats").textContent = "出錯：" + err.message; badge("err", "出錯");
    throw err;
  } finally { out.classList.remove("streaming"); busy = false; }
}
function renderHist() {
  $("histCard").hidden = hist.length < 2;
  $("hist").innerHTML = "";
  for (const h of hist.slice(1, 20)) {
    const li = document.createElement("li");
    li.innerHTML = `<div></div><div class="meta"></div>`;
    li.children[0].textContent = h.text; li.children[1].textContent = `${h.label} · ${h.stats}`;
    $("hist").appendChild(li);
  }
}

// ---------- 3 built-in Cantonese sample clips ----------
let sampleAudio = null, sampleBtnActive = null;
async function runSampleTranscribe(url, label) {
  const st = $("sampleStatus");
  if (st) { st.hidden = false; st.textContent = `轉寫緊「${label}」…`; }
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  // transcribeBuffer returns nothing when it did not run (model not ready, or busy with another clip).
  const r = await transcribeBuffer(buf, label);
  if (st) st.textContent = r ? `已完成「${label}」轉寫。` : `轉緊另一段，等佢完咗再撳「${label}」。`;
}

for (const btn of document.querySelectorAll(".sample-btn")) {
  btn.onclick = async () => {
    const url = btn.dataset.sample, label = btn.dataset.label;
    if (sampleAudio) { sampleAudio.pause(); sampleAudio = null; }
    if (sampleBtnActive === btn) {
      btn.classList.remove("playing");
      btn.querySelector(".sample-ico").textContent = "▶";
      sampleBtnActive = null;
      return;
    }
    for (const b of document.querySelectorAll(".sample-btn")) {
      b.classList.remove("playing");
      b.querySelector(".sample-ico").textContent = "▶";
    }
    const audio = new Audio(url);
    sampleAudio = audio;
    sampleBtnActive = btn;
    btn.classList.add("playing");
    btn.querySelector(".sample-ico").textContent = "■";
    audio.onended = () => {
      if (sampleAudio === audio) {
        btn.classList.remove("playing");
        btn.querySelector(".sample-ico").textContent = "▶";
        sampleBtnActive = null; sampleAudio = null;
      }
    };
    audio.play().catch(() => {});

    const st = $("sampleStatus"), slb = $("sampleLoadBtn");
    if (ready) {
      if (slb) slb.hidden = true;
      await runSampleTranscribe(url, label).catch(() => {});
    } else {
      pendingSample = { url, label };
      if (st) { st.hidden = false; st.textContent = `播放緊「${label}」—— 載入 0.6B 模型即可轉寫呢段音頻：`; }
      if (slb) slb.hidden = false;
    }
  };
}
if ($("sampleLoadBtn")) {
  $("sampleLoadBtn").onclick = () => {
    if (device.mobile && !mobileAck) {
      const n = $("mobileNotice"); n.hidden = false; n.classList.remove("shake"); void n.offsetWidth; n.classList.add("shake");
      n.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    $("sampleLoadBtn").disabled = true;
    loadModel().catch(() => { $("sampleLoadBtn").disabled = false; });
  };
}

// ---------- file drop & mic recording + live WebAudio waveform ----------
$("file").onchange = async (e) => { const f = e.target.files[0]; if (f) await transcribeBuffer(await f.arrayBuffer(), f.name).catch(() => {}); e.target.value = ""; };
const drop = $("drop");
drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); };
drop.ondragleave = () => drop.classList.remove("over");
drop.ondrop = async (e) => { e.preventDefault(); drop.classList.remove("over"); const f = e.dataTransfer.files[0]; if (f) await transcribeBuffer(await f.arrayBuffer(), f.name).catch(() => {}); };

const waveCanvas = $("waveCanvas");
let waveCtx = null, waveAudioCtx = null, waveAnalyser = null, waveRaf = 0;
function drawWaveBaseline() {
  if (!waveCanvas) return;
  const ctx = waveCtx || (waveCtx = waveCanvas.getContext("2d"));
  if (!ctx) return;
  const w = waveCanvas.width, h = waveCanvas.height, mid = h / 2;
  const cs = getComputedStyle(document.documentElement);
  const hair = cs.getPropertyValue("--hair").trim() || "#d6d0c5";
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = hair;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(w, mid);
  ctx.stroke();
}
drawWaveBaseline();

function startWaveMonitor(stream) {
  if (!waveCanvas || reduceMotion) return;
  const ctx = waveCtx || (waveCtx = waveCanvas.getContext("2d"));
  if (!ctx) return;
  let data = null;
  try {
    waveAudioCtx = new AudioContext();
    const src = waveAudioCtx.createMediaStreamSource(stream);
    waveAnalyser = waveAudioCtx.createAnalyser();
    waveAnalyser.fftSize = 128;
    src.connect(waveAnalyser);
    data = new Uint8Array(waveAnalyser.frequencyBinCount);
  } catch {
    waveAnalyser = null;
  }
  let phase = 0;
  const render = () => {
    const w = waveCanvas.width, h = waveCanvas.height, mid = h / 2;
    const cs = getComputedStyle(document.documentElement);
    const ink = cs.getPropertyValue("--ink").trim() || "#2a2926";
    const eye = cs.getPropertyValue("--eye").trim() || "#d0201a";
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    if (waveAnalyser && data) {
      waveAnalyser.getByteTimeDomainData(data);
      const stepX = w / (data.length - 1);
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        const y = mid + v * (h * 0.44);
        if (i === 0) ctx.moveTo(0, y); else ctx.lineTo(i * stepX, y);
      }
    } else {
      phase += 0.14;
      for (let x = 0; x <= w; x += 4) {
        const env = Math.sin((x / w) * Math.PI);
        const y = mid + Math.sin(x * 0.08 + phase) * env * 9;
        if (x === 0) ctx.moveTo(0, y); else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.fillStyle = eye;
    ctx.beginPath();
    ctx.arc(w / 2, mid, 3.2, 0, Math.PI * 2);
    ctx.fill();
    waveRaf = requestAnimationFrame(render);
  };
  waveRaf = requestAnimationFrame(render);
}
function stopWaveMonitor() {
  cancelAnimationFrame(waveRaf); waveRaf = 0;
  if (waveAudioCtx) { waveAudioCtx.close().catch(() => {}); waveAudioCtx = null; }
  waveAnalyser = null;
  drawWaveBaseline();
}

let rec = null, recChunks = [], recT0 = 0, recTimer = 0;
function setRecUI(on) {
  document.body.classList.toggle("is-recording", on);
  $("recBtn").classList.toggle("rec", on); $("recBtn").setAttribute("aria-label", on ? "停止並轉文字" : "錄音");
  $("recLabel").textContent = on ? "錄緊…再撳一下停止並轉文字" : "撳一下開始錄音";
  $("recTime").hidden = !on; if (on) $("recTime").textContent = "00:00";
}
$("recBtn").onclick = async () => {
  if (rec) { rec.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    rec = new MediaRecorder(stream); recChunks = [];
    rec.ondataavailable = (e) => e.data.size && recChunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop()); clearInterval(recTimer);
      stopWaveMonitor(); setRecUI(false); rec = null;
      const blob = new Blob(recChunks, { type: recChunks[0]?.type || "audio/webm" });
      await transcribeBuffer(await blob.arrayBuffer(), "錄音 " + new Date().toLocaleTimeString("zh-HK")).catch(() => {});
    };
    rec.start(); recT0 = Date.now();
    setRecUI(true);
    startWaveMonitor(stream);
    recTimer = setInterval(() => { const s = Math.floor((Date.now() - recT0) / 1000); $("recTime").textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }, 250);
  } catch (err) { $("outCard").hidden = false; $("stats").textContent = "開唔到咪：" + err.message; }
};
$("copyBtn").onclick = async () => {
  try { await navigator.clipboard.writeText($("out").textContent); flash($("copyBtn"), "已複製 ✓", true); } catch { flash($("copyBtn"), "複製唔到"); }
};
function flash(btn, txt, ok = false) {
  const o = btn.dataset.label || btn.textContent;
  btn.dataset.label = o; btn.textContent = txt;
  if (ok) btn.classList.add("copied");
  setTimeout(() => { btn.textContent = o; btn.classList.remove("copied"); }, 1600);
}

// ---------- self test (?selftest=1[&backend=wasm]) ----------
const normCER = (s) => s.toLowerCase().replace(/[\p{P}\p{S}\s]/gu, "");
function edit(a, b) { a = [...a]; b = [...b]; let dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) { let prev = dp[0]; dp[0] = i; for (let j = 1; j <= b.length; j++) { const t = dp[j]; dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]); prev = t; } } return dp[b.length]; }
async function selftest(n) {
  $("testCard").hidden = false;
  const man = await (await fetch("test/manifest.json")).json();
  const items = man.items.slice(0, n);
  // mel parity on clip 00
  const ref = new Float32Array(await (await fetch("test/mel_ref_00.bin")).arrayBuffer());
  const w0 = await decodeToMono16k(await (await fetch("test/" + items[0].wav)).arrayBuffer());
  const melR = await runWorker("mel", w0);
  let md = 0; for (let i = 0; i < ref.length; i++) md = Math.max(md, Math.abs(ref[i] - melR.mel[i]));
  const res = { melMaxDiff: md, melFrames: melR.T, refFrames: ref.length / 128, clips: [] };
  let ed = 0, L = 0, edPt = 0, match = 0, tSec = 0, tDur = 0;
  const tb = $("testTable").tBodies[0];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const r = await transcribeBuffer(await (await fetch("test/" + it.wav)).arrayBuffer(), `selftest ${i}`);
    const rn = normCER(it.ref); const e1 = edit(rn, normCER(r.text)); ed += e1; L += [...rn].length; edPt += edit(rn, normCER(it.pt_text));
    const same = r.text === it.pt_text; match += same; tSec += r.sec; tDur += r.dur;
    res.clips.push({ i, same, text: r.text, pt: it.pt_text, rtf: r.rtf, sec: r.sec, dur: r.dur, tokPerSec: r.tokPerSec, encSec: r.encSec });
    const tr = tb.insertRow(); tr.innerHTML = `<td>${i}</td><td class="${same ? "ok" : "diff"}">${same ? "✓" : "✗"}</td><td>${(e1 / [...rn].length * 100).toFixed(1)}%</td><td>${r.rtf.toFixed(3)}</td><td></td>`;
    tr.cells[4].textContent = r.text;
  }
  Object.assign(res, { n: items.length, cer: ed / L, ptCer: edPt / L, textMatch: match, rtf: tSec / tDur, backend: window.__hkasr.ready.backend, ua: navigator.userAgent });
  $("testSummary").textContent = `${res.backend} · CER ${(res.cer * 100).toFixed(2)}%（Python ${(res.ptCer * 100).toFixed(2)}%）· 同 Python 一字不差 ${match}/${items.length} · RTF ${res.rtf.toFixed(3)} · mel maxdiff ${md.toExponential(2)}`;
  window.__hkasr.selftest = res;
  return res;
}
if (qs.get("backend")) $("backend").value = qs.get("backend");
if (qs.get("selftest")) {
  loadModel().then(() => selftest(Number(qs.get("selftest")) > 1 ? Number(qs.get("selftest")) : 20))
    .catch((e) => { window.__hkasr.selftest = { error: String(e) }; });
}

// ---------- page: device check, mobile notice, promo bits ----------
const ua = navigator.userAgent;
const device = (() => {
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const mobile = navigator.userAgentData?.mobile === true || /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|Silk|Kindle/i.test(ua) || iPadOS;
  const mac = !mobile && (navigator.userAgentData?.platform === "macOS" || /Macintosh|Mac OS X/.test(ua));
  return { mobile, mac, webgpu: !!navigator.gpu, mem: navigator.deviceMemory, cores: navigator.hardwareConcurrency };
})();
let mobileAck = !!qs.get("selftest");
window.__hkasr.device = device;

{
  const caps = [];
  caps.push([device.mobile ? "手機／平板" : device.mac ? "Mac" : "電腦", device.mobile ? "bad" : "good"]);
  caps.push([device.webgpu ? "WebGPU ✓" : "冇 WebGPU，會用 CPU", device.webgpu ? "good" : "bad"]);
  if (device.cores) caps.push([`${device.cores} 核心`, ""]);
  if (device.mem) caps.push([`記憶體 ${device.mem >= 8 ? "≥ 8" : device.mem} GB`, device.mem < 4 ? "bad" : ""]);
  for (const [t, c] of caps) { const s = document.createElement("span"); s.className = "cap " + c; s.textContent = t; $("caps").appendChild(s); }
  if (!device.webgpu && !device.mobile) $("loadMsg").textContent = "你嘅瀏覽器冇 WebGPU，會用 CPU 運行，會慢好多。建議用最新版 Chrome / Edge。";
}

if (device.mobile && !mobileAck) $("mobileNotice").hidden = false;
$("mobileAnywayBtn").onclick = () => { mobileAck = true; $("mobileNotice").hidden = true; loadModel().catch(() => {}); };
$("shareLinkBtn").onclick = async () => {
  const url = location.origin + location.pathname;
  try {
    if (navigator.share) { await navigator.share({ title: "Koelony：廣東話語音轉文字", text: "用電腦開嚟試：", url }); return; }
    await navigator.clipboard.writeText(url); flash($("shareLinkBtn"), "已複製網址 ✓", true);
  } catch (e) { if (e?.name !== "AbortError") flash($("shareLinkBtn"), url); }
};

if (device.mac) { $("oraYou").hidden = false; $("oraYou").textContent = "你用緊 Mac：可以即刻裝嚟用"; }
else if (device.mobile) { $("oraYou").hidden = false; $("oraYou").textContent = "返到 Mac 再開呢頁就裝得"; }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function typeInto(el, text, cps = 14) {
  el.textContent = "";
  for (const ch of text) { el.textContent += ch; await sleep(1000 / cps + Math.random() * 40); }
}

// hero board: cycle example outputs
(async () => {
  if (reduceMotion) return;
  const el = $("heroText");
  const lines = [
    "今日 send 咗個 proposal 俾 client，佢話聽日再覆。",
    "我哋喺銅鑼灣等緊你，你到咗未呀？",
    "呢個 bug 好奇怪，deploy 完之後先出現㗎。",
    "閂冷氣，順便開埋客廳盞燈。",
    "佢話個 meeting 改咗去禮拜五下晝三點。",
  ];
  await sleep(1400);
  for (let i = 1; ; i = (i + 1) % lines.length) {
    await sleep(2600);
    el.classList.add("typing"); await typeInto(el, lines[i], 16); el.classList.remove("typing");
  }
})();

// OraType window mock: pill listens, text lands in the compose box, message is sent
(async () => {
  const typed = $("macTyped"), pill = $("macPill"), bubble = $("macBubble");
  const msg = "不如去旺角食火鍋？我 book 咗七點，你收工直接過嚟啦。";
  if (reduceMotion) { bubble.hidden = false; bubble.textContent = msg; pill.classList.add("off"); return; }
  for (;;) {
    bubble.hidden = true; typed.textContent = ""; pill.classList.remove("off");
    await sleep(2600);
    pill.classList.add("off");
    await sleep(250);
    typed.textContent = msg; // OraType pastes the finished text in one go
    await sleep(1300);
    typed.textContent = ""; bubble.textContent = msg; bubble.hidden = false;
    await sleep(3800);
  }
})();
