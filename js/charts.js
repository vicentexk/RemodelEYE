/* ============================================================
   EYE GATE v2 — Mini engine de gráficos (canvas puro, 0 deps)
   Suporta: barras verticais e rosca (donut), com animação.
   ============================================================ */

const Charts = {
  _registros: new Map(), // canvas -> função de redraw

  _prep(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(rect.width, 80);
    const h = parseInt(canvas.getAttribute("height")) || 240;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  },

  _animate(canvas, drawFn) {
    // cancela animação anterior do mesmo canvas
    const prev = this._registros.get(canvas);
    if (prev && prev._raf) cancelAnimationFrame(prev._raf);

    const dur = 650;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
      drawFn(ease);
      if (p < 1) {
        const entry = this._registros.get(canvas);
        if (entry) entry._raf = requestAnimationFrame(tick);
      }
    };
    const entry = { draw: drawFn, _raf: requestAnimationFrame(tick) };
    this._registros.set(canvas, entry);
  },

  redrawAll() {
    for (const [canvas, entry] of this._registros) {
      if (!canvas.isConnected) { this._registros.delete(canvas); continue; }
      entry.draw(1);
    }
  },

  /* ---------- Barras verticais ---------- */
  bars(canvas, { labels, values, color = "#2C9FA2", color2 = "#FEB914", suffix = "" }) {
    const render = (ease) => {
      const { ctx, w, h } = this._prep(canvas);
      ctx.clearRect(0, 0, w, h);
      const padL = 30, padR = 8, padT = 14, padB = 26;
      const cw = w - padL - padR, ch = h - padT - padB;
      const max = Math.max(...values, 1);

      // grid + labels Y
      ctx.font = "10px system-ui";
      ctx.textAlign = "right";
      for (let i = 0; i <= 4; i++) {
        const y = padT + (ch * i) / 4;
        ctx.strokeStyle = "rgba(23,20,15,0.10)";
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
        ctx.fillStyle = "#8B8677";
        ctx.fillText(String(Math.round(max * (1 - i / 4))), padL - 6, y + 3);
      }

      // barras
      const n = values.length;
      const slot = cw / n;
      const bw = Math.min(slot * 0.52, 42);
      const grad = ctx.createLinearGradient(0, padT, 0, padT + ch);
      grad.addColorStop(0, color); grad.addColorStop(1, color2);

      for (let i = 0; i < n; i++) {
        const bh = (values[i] / max) * ch * ease;
        const x = padL + slot * i + (slot - bw) / 2;
        const y = padT + ch - bh;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, bw, Math.max(bh, 1), [5, 5, 0, 0]);
        ctx.fill();

        // valor em cima
        if (values[i] > 0 && ease > 0.95) {
          ctx.fillStyle = "#4A463C";
          ctx.textAlign = "center";
          ctx.fillText(values[i] + suffix, x + bw / 2, y - 5);
        }
        // label X
        ctx.fillStyle = "#8B8677";
        ctx.textAlign = "center";
        ctx.fillText(labels[i], x + bw / 2, h - 8);
      }
    };
    this._animate(canvas, render);
    this._registros.set(canvas, { draw: render });
    render(1);
  },

  /* ---------- Rosca (donut) ---------- */
  donut(canvas, { segments, centerLabel, centerValue }) {
    const render = (ease) => {
      const { ctx, w, h } = this._prep(canvas);
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const r = Math.min(w, h) / 2 - 34;
      const thickness = 22;
      const total = segments.reduce((s, x) => s + x.value, 0) || 1;

      let angle = -Math.PI / 2;
      const gap = 0.03; // rad
      for (const seg of segments) {
        const sweep = (seg.value / total) * Math.PI * 2 * ease;
        if (sweep > gap * 2) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, angle + gap / 2, angle + sweep - gap / 2);
          ctx.strokeStyle = seg.color;
          ctx.lineWidth = thickness;
          ctx.lineCap = "round";
          ctx.stroke();
        }
        angle += sweep;
      }

      // centro
      ctx.textAlign = "center";
      ctx.fillStyle = "#f2ede1";
      ctx.font = "700 26px 'Space Grotesk', system-ui";
      ctx.fillText(String(Math.round(total * ease)), cx, cy + 2);
      ctx.fillStyle = "#8B8677";
      ctx.font = "10px 'Space Grotesk', system-ui";
      ctx.fillText(centerLabel || "", cx, cy + 20);

      // legenda
      ctx.textAlign = "left";
      let ly = h - 18;
      let lx = 16;
      ctx.font = "10px 'Space Grotesk', system-ui";
      segments.forEach((seg) => {
        ctx.fillStyle = seg.color;
        ctx.beginPath(); ctx.arc(lx + 4, ly - 3, 4, 0, 7); ctx.fill();
        ctx.fillStyle = "#4A463C";
        ctx.fillText(`${seg.label}: ${seg.value}`, lx + 14, ly);
        lx += 14 + ctx.measureText(`${seg.label}: ${seg.value}`).width + 18;
      });
    };
    this._animate(canvas, render);
    this._registros.set(canvas, { draw: render });
    render(1);
  }
};

window.addEventListener("resize", () => Charts.redrawAll());
