/* ============================================================
   EYE GATE v2 — Cadastro facial
   ★ Auto-captura: quando a pose pedida é validada pelos
     landmarks, o sistema captura sozinho (a v1 exigia clique).
   ★ Snapshot da câmera salvo como foto do aluno.
   ============================================================ */

const Cadastro = {
  stream: null,
  descritores: [],
  etapa: 0,
  capturando: false,

  init() {
    document.getElementById("btnCamToggle").onclick = () => this.stream ? this.pararCamera() : this.iniciarCamera();
    document.getElementById("btnCapture").onclick = () => this.capturarPose();
    document.getElementById("btnSalvarAluno").onclick = () => this.salvar();
    document.getElementById("cadBusca").oninput = () => this.renderAlunos();
    this.renderSlots();
  },

  async iniciarCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      const video = document.getElementById("cadVideo");
      video.srcObject = this.stream;

      if (!Face.pronto) {
        document.getElementById("poseInstr").textContent = "Carregando IA facial…";
        await Face.carregar();
      }
      document.getElementById("poseOverlay").style.display = "";
      document.getElementById("poseInstr").textContent = POSES[0];
      document.getElementById("btnCamToggle").innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#i-x"/></svg><span>Parar câmera</span>';
      document.getElementById("btnCapture").disabled = false;
      UI.toast("Câmera pronta! Siga as poses pedidas", "ok");
    } catch (e) {
      console.error(e);
      UI.toast("Permita o acesso à câmera para cadastrar", "err");
    }
  },

  pararCamera() {
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    document.getElementById("btnCamToggle").innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#i-camera"/></svg><span>Iniciar câmera</span>';
    document.getElementById("btnCapture").disabled = true;
    document.getElementById("poseInstr").textContent = "Câmera parada";
  },

  renderSlots() {
    const wrap = document.getElementById("poseSlots");
    wrap.innerHTML = "";
    for (let i = 0; i < 5; i++) {
      const slot = document.createElement("div");
      slot.className = "pose-slot" + (i === this.etapa && this.stream ? " current" : "");
      slot.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#i-camera"/></svg>';
      wrap.appendChild(slot);
    }
  },

  _validarPose(detection) {
    if (!detection?.landmarks) return false;
    const nariz = detection.landmarks.getNose()[3];
    const olhoEsq = detection.landmarks.getLeftEye()[0];
    const olhoDir = detection.landmarks.getRightEye()[3];
    const centroOlhos = (olhoEsq.x + olhoDir.x) / 2;

    switch (this.etapa) {
      case 0: return true;
      case 1: return nariz.x < centroOlhos - 10;
      case 2: return nariz.x > centroOlhos + 10;
      case 3: return nariz.y < olhoEsq.y - 5;
      case 4: return nariz.y > olhoEsq.y + 15;
      default: return false;
    }
  },

  async capturarPose() {
    if (!this.stream || this.descritores.length >= 5) return;
    const video = document.getElementById("cadVideo");
    if (video.readyState < 2) return;

    document.getElementById("poseInstr").textContent = "Analisando…";
    const det = await faceapi
      .detectSingleFace(video, Face.opcoesDetecao(320))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!det) { document.getElementById("poseInstr").textContent = "Nenhum rosto detectado — aproxime-se"; return; }
    if (!this._validarPose(det)) { document.getElementById("poseInstr").textContent = `Siga a pose: ${POSES[this.etapa]}`; return; }

    this._guardar(det);
  },

  _guardar(det) {
    // snapshot pra miniatura + foto do aluno
    const video = document.getElementById("cadVideo");
    const c = document.createElement("canvas");
    c.width = 160; c.height = 120;
    c.getContext("2d").drawImage(video, 0, 0, 160, 120);
    const thumb = c.toDataURL("image/jpeg", 0.7);

    const slots = document.querySelectorAll(".pose-slot");
    const slot = slots[this.descritores.length];
    if (slot) { slot.classList.add("done"); slot.innerHTML = `<img src="${thumb}"/>`; }

    this.descritores.push(Array.from(det.descriptor));
    this.etapa = this.descritores.length;

    document.getElementById("poseProgress").style.width = `${this.descritores.length * 20}%`;
    document.getElementById("poseInstr").textContent =
      this.etapa < 5 ? POSES[this.etapa] : "Cadastro facial completo ✅";

    if (this.etapa < 5) this.renderSlots();
    else {
      document.querySelectorAll(".pose-slot").forEach(s => s.classList.remove("current"));
      document.getElementById("btnSalvarAluno").disabled = false;
      UI.beep(1100, 0.18);
      UI.toast("5 poses capturadas! Agora salve os dados", "ok");
    }
  },

  async salvar() {
    const nome = document.getElementById("cadNome").value.trim();
    const matricula = document.getElementById("cadMatricula").value.trim();
    const turma = document.getElementById("cadTurma").value.trim();

    if (!nome) return UI.toast("Digite o nome do aluno", "warn");
    if (this.descritores.length < 5) return UI.toast("Capture as 5 poses primeiro", "warn");

    UI.loading(true);
    document.getElementById("btnSalvarAluno").disabled = true;
    try {
      // foto: frame maior no momento do save
      const video = document.getElementById("cadVideo");
      let foto = null;
      if (this.stream && video.readyState >= 2) {
        const c = document.createElement("canvas");
        c.width = 320; c.height = 240;
        c.getContext("2d").drawImage(video, 0, 0, 320, 240);
        foto = c.toDataURL("image/jpeg", 0.72);
      }

      const { error } = await DB.criarAluno({
        nome, matricula, turma, foto,
        descriptor: this.descritores
      });

      if (error) {
        console.error(error);
        return UI.toast("Erro ao salvar aluno", "err");
      }

      UI.toast(`Aluno ${nome.split(" ")[0]} cadastrado! 🎉`, "ok");
      this._reset();
      await Face.carregarAlunos();
      this.renderAlunos();
      App.refreshDashboardSilently();
    } finally {
      UI.loading(false);
    }
  },

  _reset() {
    this.descritores = [];
    this.etapa = 0;
    document.getElementById("cadNome").value = "";
    document.getElementById("cadMatricula").value = "";
    document.getElementById("cadTurma").value = "";
    document.getElementById("poseProgress").style.width = "0%";
    document.getElementById("btnSalvarAluno").disabled = true;
    document.getElementById("poseInstr").textContent = POSES[0];
    this.renderSlots();
  },

  renderAlunos() {
    const busca = document.getElementById("cadBusca").value.toLowerCase().trim();
    const lista = document.getElementById("alunosList");
    const alunos = Face.alunos.filter(a => a.nome.toLowerCase().includes(busca));

    document.getElementById("cadCount").textContent = Face.alunos.length;

    if (alunos.length === 0) {
      lista.innerHTML = `<div class="empty" style="grid-column:1/-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#i-users"/></svg><p>${busca ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado ainda"}</p></div>`;
      return;
    }

    lista.innerHTML = alunos.map(a => `
      <div class="aluno-card">
        <div class="aluno-thumb">${a.foto ? `<img src="${a.foto}" alt=""/>` : UI.iniciais(a.nome)}</div>
        <div style="min-width:0;flex:1">
          <div class="a-name">${UI.escape(a.nome)}</div>
          <div class="a-meta">${UI.escape(a.turma || "—")}${a.matricula ? " · " + UI.escape(a.matricula) : ""}</div>
        </div>
        ${Auth.ehAdmin() ? `<button class="btn btn-danger btn-sm btn-icon" data-del="${a.id}" title="Excluir aluno"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#i-trash"/></svg></button>` : ""}
      </div>`).join("");

    lista.querySelectorAll("[data-del]").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.del;
        const aluno = Face.alunos.find(x => String(x.id) === id);
        const ok = await UI.confirm({
          titulo: "Excluir aluno",
          texto: `Excluir <b>${UI.escape(aluno?.nome)}</b> e todo o histórico de acessos dele? Essa ação não pode ser desfeita.`,
          icone: "i-trash", cor: "i-danger", okText: "Excluir"
        });
        if (!ok) return;
        UI.loading(true);
        const { error } = await DB.excluirAluno(id);
        UI.loading(false);
        if (error) return UI.toast("Erro ao excluir", "err");
        UI.toast("Aluno excluído", "ok");
        await Face.carregarAlunos();
        this.renderAlunos();
        App.refreshDashboardSilently();
      };
    });
  }
};
