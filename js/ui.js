/* ============================================================
   EYE GATE v2 — UI helpers (toast, modal, loading, format)
   ============================================================ */

const UI = {
  /* ---------- Toast ---------- */
  toast(msg, tipo = "info", ms = 3200) {
    const root = document.getElementById("toast-root");
    const icons = {
      ok: "#i-check", err: "#i-alert", warn: "#i-alert", info: "#i-eye"
    };
    const el = document.createElement("div");
    el.className = `toast ${tipo}`;
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="${icons[tipo] || icons.info}"/></svg><span>${msg}</span>`;
    root.appendChild(el);
    setTimeout(() => {
      el.classList.add("leaving");
      setTimeout(() => el.remove(), 260);
    }, ms);
  },

  /* ---------- Loading bar ---------- */
  loading(on) {
    const bar = document.getElementById("loadingBar");
    if (on) {
      bar.style.width = "0%";
      bar.classList.add("on");
      requestAnimationFrame(() => (bar.style.width = "78%"));
    } else {
      bar.style.width = "100%";
      setTimeout(() => bar.classList.remove("on"), 350);
    }
  },

  /* ---------- Modal de confirmação ---------- */
  confirm({ titulo = "Confirmar", texto = "", icone = "i-alert", cor = "i-warn", okText = "Confirmar", okClass = "btn-danger" }) {
    return new Promise((resolve) => {
      const root = document.getElementById("modalRoot");
      root.innerHTML = `
        <div class="modal">
          <div class="modal-icon ${cor}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#${icone}"/></svg>
          </div>
          <h3>${titulo}</h3>
          <p>${texto}</p>
          <div class="modal-actions">
            <button class="btn" id="mCancel">Cancelar</button>
            <button class="btn ${okClass}" id="mOk">${okText}</button>
          </div>
        </div>`;
      root.classList.add("open");
      const done = (val) => { root.classList.remove("open"); root.innerHTML = ""; resolve(val); };
      root.querySelector("#mCancel").onclick = () => done(false);
      root.querySelector("#mOk").onclick = () => done(true);
      root.onclick = (e) => { if (e.target === root) done(false); };
    });
  },

  /* ---------- Formatação ---------- */
  fmtHora(iso) {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  },
  fmtData(iso) {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
  },
  fmtDataHora(iso) {
    return `${UI.fmtData(iso)} ${UI.fmtHora(iso)}`;
  },
  iniciais(nome = "?") {
    return nome.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();
  },
  escape(s = "") {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  },

  /* ---------- CSV (Excel BR-friendly) ---------- */
  baixarCSV(nomeArquivo, linhas) {
    const csv = "\ufeff" + linhas.map(l => l.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  /* ---------- Beep (WebAudio, sem arquivos) ---------- */
  beep(freq = 880, dur = 0.14, vol = 0.08) {
    try {
      if (!UI._ac) UI._ac = new (window.AudioContext || window.webkitAudioContext)();
      const o = UI._ac.createOscillator(), g = UI._ac.createGain();
      o.frequency.value = freq; o.type = "sine";
      g.gain.setValueAtTime(vol, UI._ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, UI._ac.currentTime + dur);
      o.connect(g); g.connect(UI._ac.destination);
      o.start(); o.stop(UI._ac.currentTime + dur);
    } catch (e) { /* áudio bloqueado antes de interação */ }
  }
};

function mostrarMensagem(msg, tipo = "info") { UI.toast(msg, tipo); }
