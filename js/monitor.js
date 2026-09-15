/* ============================================================
   EYE GATE v2 — Monitor de reconhecimento OTIMIZADO
   ★ Loop contínuo async sem sobreposição (antes: 1 ciclo a cada 5s)
   ★ inputSize ajustável (224/320/416) — antes fixo em 512
   ★ Warm-up WebGL, overlay com bounding box, FPS real,
     cooldown por aluno, som, banner e feed ao vivo
   ============================================================ */

const Monitor = {
  ativo: false,
  rodando: false,
  stream: null,
  cooldowns: {},          // aluno_id -> timestamp
  ultimosStatus: {},      // aluno_id -> último status em memória (evita query)
  reconhecimentosSessao: 0,
  _lastBox: null,

  init() {
    document.getElementById("btnMonitorToggle").onclick = () => this.ativo ? this.parar() : this.iniciar();
    document.getElementById("btnMonitorReload").onclick = async () => {
      UI.toast("Recarregando alunos…", "info");
      await Face.carregarAlunos();
      UI.toast(`${Face.alunos.length} alunos na memória`, "ok");
    };
  },

  async iniciar() {
    if (this.ativo) return;
    UI.loading(true);

    try {
      if (!Face.pronto) await Face.carregar();
      if (Face.alunos.length === 0) await Face.carregarAlunos();
      if (!Face.matcher) {
        UI.toast("Nenhum aluno com dados faciais. Cadastre alunos primeiro.", "warn", 4500);
        UI.loading(false);
        return;
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false
      });

      const video = document.getElementById("monitorVideo");
      video.srcObject = this.stream;
      await video.play().catch(() => {});

      this.ativo = true;
      this.rodando = true;
      this._atualizarHUD();
      document.getElementById("monitorEmpty").style.display = "none";
      this._atualizarBotao();

      Face.warmup(); // não bloqueia
      this._loop();  // 🚀 loop contínuo
      UI.toast("Monitor ativo — reconhecendo em tempo real", "ok");
    } catch (err) {
      console.error(err);
      if (err?.name === "NotAllowedError") UI.toast("Permita o acesso à câmera para usar o monitor", "err");
      else UI.toast("Erro ao iniciar a câmera", "err");
    } finally {
      UI.loading(false);
    }
  },

  parar(silencioso = false) {
    this.ativo = false;
    this.rodando = false;
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    const overlay = document.getElementById("monitorOverlay");
    overlay.getContext("2d").clearRect(0, 0, overlay.width, overlay.height);
    document.getElementById("monitorEmpty").style.display = "";
    this._atualizarBotao();
    this._atualizarHUD();
    this._lastBox = null;
    if (!silencioso) UI.toast("Monitor pausado", "info");
  },

  _atualizarBotao() {
    const btn = document.getElementById("btnMonitorToggle");
    btn.classList.toggle("btn-grad", !this.ativo);
    btn.classList.toggle("btn-danger", this.ativo);
    btn.innerHTML = this.ativo
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><use href="#i-pause"/></svg><span>Pausar monitor</span>'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><use href="#i-play"/></svg><span>Ativar monitor</span>';
  },

  _atualizarHUD(texto, rec = false) {
    const pill = document.getElementById("hudStatus");
    pill.classList.toggle("rec", rec);
    document.getElementById("hudText").textContent = texto || (this.ativo ? "Procurando rostos…" : "Parado");
  },

  /* ★ LOOP CONTÍNUO: cada ciclo espera o anterior terminar (sem overlap),
     com pausa mínima entre ciclos. Em máquinas normais roda 3-8 detecções/s
     (a v1 antiga fazia 0,2/s). */
  async _loop() {
    const video = document.getElementById("monitorVideo");
    const t0 = performance.now();

    while (this.rodando) {
      if (!this.ativo) break;
      if (video.readyState < 2) { await this._sleep(150); continue; }

      const cicloStart = performance.now();
      try {
        await this._detectar(video);
      } catch (err) {
        console.error("Erro no ciclo de detecção:", err);
        await this._sleep(400);
      }

      // FPS médio das detecções
      const dt = performance.now() - cicloStart;
      const fps = (1000 / Math.max(dt + CONFIG.DETECT_INTERVAL, 1)).toFixed(1);
      document.getElementById("hudFps").textContent = `${fps} det/s`;

      await this._sleep(Math.max(CONFIG.DETECT_INTERVAL, dt * 0.15));
    }
  },

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); },

  async _detectar(video) {
    const inputSize = document.getElementById("selDetector").value;
    const deteccoes = await faceapi
      .detectAllFaces(video, Face.opcoesDetecao(inputSize))
      .withFaceLandmarks()
      .withFaceDescriptors();

    this._desenharOverlay(video, deteccoes);

    if (deteccoes.length === 0) {
      this._atualizarHUD(Face.matcher ? "Procurando rostos…" : "Sem alunos cadastrados");
      return;
    }
    this._atualizarHUD(`${deteccoes.length} rosto(s) na câmera`, true);

    const cooldownMs = parseInt(document.getElementById("selCooldown").value) * 1000;

    for (const det of deteccoes) {
      if (!Face.matcher) break;
      const match = Face.matcher.findBestMatch(det.descriptor);
      if (match.label === "unknown") continue;

      const aluno = Face.alunos.find(a => String(a.id) === match.label);
      if (!aluno) continue;

      const agora = Date.now();
      if (this.cooldowns[aluno.id] && agora - this.cooldowns[aluno.id] < cooldownMs) continue;

      this.cooldowns[aluno.id] = agora;
      await this._registrar(aluno, match.distance);
    }
  },

  _desenharOverlay(video, deteccoes) {
    const overlay = document.getElementById("monitorOverlay");
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return;
    if (overlay.width !== w || overlay.height !== h) { overlay.width = w; overlay.height = h; }
    const ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, w, h);

    for (const det of deteccoes) {
      const box = det.detection.box;
      let reconhecido = false, nome = "";
      if (Face.matcher) {
        const match = Face.matcher.findBestMatch(det.descriptor);
        if (match.label !== "unknown") { reconhecido = true; const a = Face.alunos.find(x => String(x.id) === match.label); nome = a?.nome || ""; }
      }
      ctx.strokeStyle = reconhecido ? "#2C9FA2" : "#FEB914";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(box.x, box.y, box.width, box.height, 10);
      ctx.stroke();

      if (reconhecido && nome) {
        ctx.font = "700 15px 'Space Grotesk', system-ui";
        const tw = ctx.measureText(nome).width + 18;
        ctx.fillStyle = "rgba(44,159,162,0.95)";
        ctx.beginPath();
        ctx.roundRect(box.x, Math.max(box.y - 28, 4), tw, 24, 7);
        ctx.fill();
        ctx.fillStyle = "#F7F7EC";
        ctx.fillText(nome, box.x + 9, Math.max(box.y - 10, 22));
      }
    }
  },

  async _registrar(aluno, distancia) {
    const confianca = Math.max(0, Math.min(100, Math.round((1 - distancia / 0.6) * 100)));

    // status: alterna Entrada/Saída (consulta o último do banco, com fallback em memória)
    let status;
    try {
      const ultimo = await DB.ultimoStatus(aluno.id);
      status = ultimo === "Entrada" ? "Saída" : "Entrada";
      this.ultimosStatus[aluno.id] = status;
    } catch (e) {
      status = this.ultimosStatus[aluno.id] === "Entrada" ? "Saída" : "Entrada";
    }

    const { error } = await DB.inserirLog({ aluno_id: aluno.id, nome_aluno: aluno.nome, status });
    if (error) {
      console.error("Erro ao inserir log:", error.message);
      UI.toast("Erro ao registrar acesso", "err");
      return;
    }

    this.reconhecimentosSessao++;

    // feedback
    if (document.getElementById("chkSound").checked) UI.beep(status === "Entrada" ? 950 : 620);
    this._banner(aluno.nome, status, confianca);
    this._feedLive(aluno.nome, status, confianca);
    this._atualizarHUD(`✅ ${aluno.nome} — ${status} registrada`, true);
    console.log(`🎉 ${status} → ${aluno.nome} (conf. ${confianca}%)`);
  },

  _banner(nome, status, confianca) {
    document.getElementById("rbName").textContent = nome;
    document.getElementById("rbInfo").textContent = `${status} registrada · ${confianca}% de confiança`;
    const b = document.getElementById("recBanner");
    b.classList.add("show");
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => b.classList.remove("show"), 3200);
  },

  _feedLive(nome, status, confianca) {
    const feed = document.getElementById("feedLive");
    const vazio = feed.querySelector(".empty");
    if (vazio) vazio.remove();

    const item = document.createElement("div");
    item.className = `feed-item ${status === "Entrada" ? "t-in" : "t-out"}`;
    item.innerHTML = `
      <div class="feed-avatar">${UI.iniciais(nome)}</div>
      <div class="feed-info">
        <div class="feed-name">${UI.escape(nome)}</div>
        <div class="feed-time">${new Date().toLocaleTimeString("pt-BR")} · ${confianca}% confiança</div>
      </div>
      <span class="tag ${status === "Entrada" ? "tag-in" : "tag-out"}">${status === "Entrada" ? "ENTRADA" : "SAÍDA"}</span>`;
    feed.prepend(item);
    while (feed.children.length > 25) feed.lastChild.remove();
  }
};
