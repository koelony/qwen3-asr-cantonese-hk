/* generated from koelony/design@977596b7da6d, do not edit. Change it in koelony/design and sync. */
(() => {
  // src/lib/art.ts
  var LITTLE = {
    body: "M370.83 72.241A57.729 57.729 0 0 1 389.83 111.85A115.458 115.458 0 0 0 355.298 195.238A256.893 256.893 0 0 1 42.812 448.283A248.234 248.234 0 0 0 303.338 223.095A427.194 427.194 0 0 1 38.073 391.298A326.168 326.168 0 0 1 232.425 136.963A92.366 92.366 0 0 0 279.815 90.889A57.729 57.729 0 0 1 370.83 72.241Z",
    beak: "M370.83 72.241A207.824 207.824 0 0 1 466.722 78.843A115.458 115.458 0 0 0 389.83 111.85L332.2 115.14Z",
    eye: { cx: 345.48, cy: 101.864, r: 23.437 },
    pivot: { x: 332.2, y: 115.14 },
    tip: { x: 466.722, y: 78.843 }
  };
  var FLYING = {
    body: "M386 170A190 190 0 0 1 474 190A105 105 0 0 0 398 248A330 330 0 0 1 250 292A520 520 0 0 1 30 262A700 700 0 0 0 232 222A300 300 0 0 0 30 222A620 620 0 0 1 250 178A120 120 0 0 0 300 180A52 52 0 0 1 386 170Z",
    wing: "M326 196A262 262 0 0 0 170 20A340 340 0 0 0 208 224Z",
    eye: { cx: 362, cy: 194, r: 14.5 },
    shoulder: { x: 268, y: 208 },
    tip: { x: 474, y: 190 }
  };
  var FAR_WING_TRANSFORM = `translate(26 -2) rotate(16 ${FLYING.shoulder.x} ${FLYING.shoulder.y})`;

  // src/lib/cursor.ts
  var SIZE = 46;
  var TIP_PX = { x: LITTLE.tip.x / 512 * SIZE, y: LITTLE.tip.y / 512 * SIZE };
  var TAKE_OFF = 0.85;
  var SETTLE = 0.25;
  var TRAIL_MS = 240;
  var INTERACTIVE = "a, button, [role='button'], summary, label, select, [tabindex]:not([tabindex='-1'])";
  var FALLBACK_EYE = "#d0201a";
  var SOLID = ".btn-solid";
  var FINE_POINTER = "(hover: hover) and (pointer: fine)";
  var REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
  var n = (v) => Number(v.toFixed(2));
  function art(part) {
    const fly = `translate(${n(LITTLE.tip.x - FLYING.tip.x)} ${n(LITTLE.tip.y - FLYING.tip.y)})`;
    if (part === "eye") {
      return [
        `<svg viewBox="0 0 512 512" focusable="false">`,
        `<g class="cb-perch"><g class="cb-head">`,
        `<circle class="cb-blink" cx="${LITTLE.eye.cx}" cy="${LITTLE.eye.cy}" r="${n(LITTLE.eye.r * 1.35)}"/>`,
        `</g></g>`,
        `<g class="cb-fly" transform="${fly}">`,
        `<circle cx="${FLYING.eye.cx}" cy="${FLYING.eye.cy}" r="${n(FLYING.eye.r * 1.6)}"/>`,
        `</g></svg>`
      ].join("");
    }
    return [
      `<svg viewBox="0 0 512 512" focusable="false">`,
      `<g class="cb-perch"><path d="${LITTLE.body}"/>`,
      `<g class="cb-head"><path d="${LITTLE.beak}"/></g>`,
      `</g>`,
      `<g class="cb-fly" transform="${fly}">`,
      `<g transform="${FAR_WING_TRANSFORM}">`,
      `<path class="cb-wing cb-wing-far" d="${FLYING.wing}"/></g>`,
      `<path d="${FLYING.body}"/>`,
      `<path class="cb-wing" d="${FLYING.wing}"/>`,
      `</g></svg>`
    ].join("");
  }
  function resetCursorHover() {
    if (typeof document === "undefined")
      return;
    document.documentElement.classList.remove("cursor-link", "cursor-solid", "cursor-down");
  }
  function startCursor({ solid = SOLID } = {}) {
    const root = document.documentElement;
    const body = document.createElement("div");
    const eye = document.createElement("div");
    const trail = document.createElement("canvas");
    body.className = "cb cb-body";
    eye.className = "cb cb-eye";
    trail.className = "cur-trail";
    body.innerHTML = art("body");
    eye.innerHTML = art("eye");
    for (const el of [body, eye])
      el.style.transformOrigin = `${n(TIP_PX.x)}px ${n(TIP_PX.y)}px`;
    for (const el of [trail, body, eye]) {
      el.setAttribute("aria-hidden", "true");
      el.style.setProperty("--cb", `${SIZE}px`);
      document.body.append(el);
    }
    root.classList.add("has-cursor");
    const ctx = trail.getContext("2d");
    const readEye = () => getComputedStyle(root).getPropertyValue("--eye").trim() || FALLBACK_EYE;
    let trailColor = readEye();
    const schemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => {
      trailColor = readEye();
    };
    schemeQuery.addEventListener("change", onScheme);
    const points = [];
    let raf = 0;
    let x = -100;
    let y = -100;
    let last = { x: -100, y: -100, t: 0 };
    let speed = 0;
    let vy = 0;
    let face = 1;
    let wantFace = 1;
    let tilt = 0;
    let flying = false;
    let calm = 0;
    let width = 0;
    let height = 0;
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      trail.width = Math.round(width * dpr);
      trail.height = Math.round(height * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const setPose = (fly) => {
      flying = fly;
      body.dataset.pose = fly ? "fly" : "perch";
      eye.dataset.pose = body.dataset.pose;
    };
    setPose(false);
    const frame = (now) => {
      raf = 0;
      if (now - last.t > 60)
        speed *= 0.82;
      if (flying && speed < SETTLE) {
        calm += 16;
        if (calm > 180)
          setPose(false);
      } else
        calm = 0;
      face += (wantFace - face) * 0.28;
      const wantTilt = flying ? Math.max(-24, Math.min(24, vy * 14)) * Math.sign(face || 1) : 0;
      tilt += (wantTilt - tilt) * 0.2;
      const k = Math.abs(face) < 0.05 ? 0.05 * Math.sign(face || 1) : face;
      const transform = `translate3d(${n(x - TIP_PX.x)}px, ${n(y - TIP_PX.y)}px, 0) rotate(${n(tilt)}deg) scaleX(${n(k)})`;
      body.style.transform = transform;
      eye.style.transform = transform;
      while (points.length > 0 && now - points[0].t > TRAIL_MS)
        points.shift();
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.lineCap = "round";
        ctx.strokeStyle = root.classList.contains("cursor-solid") ? "#fff" : trailColor;
        for (let i = 1;i < points.length; i += 1) {
          const a = points[i - 1];
          const b = points[i];
          const life = 1 - (now - b.t) / TRAIL_MS;
          ctx.globalAlpha = Math.max(0, life) * 0.85;
          ctx.lineWidth = 1 + 2 * life;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      const settled = points.length === 0 && !flying && Math.abs(wantFace - face) < 0.01 && Math.abs(tilt) < 0.1 && speed < 0.01;
      if (!settled)
        raf = requestAnimationFrame(frame);
    };
    const queue = () => {
      if (!raf)
        raf = requestAnimationFrame(frame);
    };
    const onMove = (event) => {
      if (event.pointerType !== "mouse")
        return;
      const now = performance.now();
      x = event.clientX;
      y = event.clientY;
      const dt = Math.max(1, now - last.t);
      const dx = x - last.x;
      const dy = y - last.y;
      if (last.t > 0 && dt < 100) {
        speed += (Math.hypot(dx, dy) / dt - speed) * 0.35;
        vy += (dy / dt - vy) * 0.3;
        if (Math.abs(dx) > 2.5 && Math.abs(dx) > Math.abs(dy) * 0.5)
          wantFace = dx > 0 ? 1 : -1;
      }
      last = { x, y, t: now };
      if (!flying && speed > TAKE_OFF)
        setPose(true);
      if (flying)
        points.push({ x, y, t: now });
      root.classList.add("cursor-in");
      const target = event.target instanceof Element ? event.target : null;
      root.classList.toggle("cursor-link", Boolean(target?.closest(INTERACTIVE)));
      root.classList.toggle("cursor-solid", Boolean(target?.closest(solid)));
      queue();
    };
    const onDown = () => root.classList.add("cursor-down");
    const onUp = () => root.classList.remove("cursor-down");
    const onLeave = () => {
      root.classList.remove("cursor-in", "cursor-link", "cursor-solid", "cursor-down");
      points.length = 0;
      speed = 0;
      setPose(false);
      queue();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("resize", size);
    root.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      schemeQuery.removeEventListener("change", onScheme);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", size);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      root.classList.remove("has-cursor", "cursor-in", "cursor-link", "cursor-solid", "cursor-down");
      for (const el of [trail, body, eye])
        el.remove();
    };
  }
  function mountCursor(options = {}) {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function")
      return () => {};
    const fine = window.matchMedia(FINE_POINTER);
    const reduced = window.matchMedia(REDUCED_MOTION);
    let stop = null;
    const update = () => {
      const want = fine.matches && !reduced.matches;
      if (want && !stop)
        stop = startCursor(options);
      else if (!want && stop) {
        stop();
        stop = null;
      }
    };
    update();
    fine.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      fine.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
      stop?.();
      stop = null;
    };
  }

  // src/lib/cursor-global.ts
  window.KoelonyCursor = { mountCursor, startCursor, resetCursorHover };
  var script = document.currentScript;
  if (!script?.hasAttribute("data-manual")) {
    const solid = script?.getAttribute("data-solid") ?? undefined;
    const mount = () => mountCursor({ solid });
    if (document.body)
      mount();
    else
      document.addEventListener("DOMContentLoaded", mount, { once: true });
  }
})();
