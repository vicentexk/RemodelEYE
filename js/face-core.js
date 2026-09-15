/* ============================================================
   EYE GATE v2 — Núcleo facial (face-api.js)
   Carregamento, matcher com MÉDIA dos descritores (mais robusto
   que usar só a 1ª pose) e warm-up pra 1ª detecção ser rápida.
   ============================================================ */

const Face = {
  pronto: false,
  matcher: null,
  alunos: [],

  async carregar() {
    if (this.pronto) return;
    UI.toast("Carregando modelos de IA…", "info");
    await faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.MODELS_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.MODELS_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromUri(CONFIG.MODELS_PATH);

    // garante aceleração WebGL
    try {
      const tf = faceapi.tf;
      if (tf && tf.getBackend() !== "webgl") await tf.setBackend("webgl");
      await tf.ready();
    } catch (e) { /* fallback cpu */ }

    this.pronto = true;
    console.log("✅ Face API pronta (backend:", faceapi.tf?.getBackend?.() || "default", ")");
  },

  async carregarAlunos() {
    this.alunos = await DB.listarAlunos();
    this.criarMatcher();
    return this.alunos;
  },

  criarMatcher() {
    const labeled = [];
    for (const aluno of this.alunos) {
      let desc = aluno.descriptor;
      if (!Array.isArray(desc) || desc.length === 0) continue;

      // descriptor pode vir como [ [128 números] ] (lista de poses) ou [128 números]
      let listas = Array.isArray(desc[0]) ? desc : [desc];

      // ★ MÉDIA de todas as poses capturadas = perfil facial mais estável
      if (listas.length > 1) {
        const media = new Array(listas[0].length).fill(0);
        for (const l of listas) for (let i = 0; i < l.length; i++) media[i] += l[i];
        for (let i = 0; i < media.length; i++) media[i] /= listas.length;
        listas = [media];
      }

      labeled.push(new faceapi.LabeledFaceDescriptors(String(aluno.id), [new Float32Array(listas[0])]));
    }
    this.matcher = labeled.length
      ? new faceapi.FaceMatcher(labeled, CONFIG.MATCH_THRESHOLD)
      : null;
    console.log(`🔨 Matcher: ${labeled.length} alunos | threshold ${CONFIG.MATCH_THRESHOLD}`);
  },

  /* warm-up: detecção dummy num canvas pra compilar kernels WebGL */
  async warmup() {
    try {
      const c = document.createElement("canvas");
      c.width = 320; c.height = 240;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#222"; ctx.fillRect(0, 0, 320, 240);
      await faceapi.detectSingleFace(c, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }));
      console.log("🔥 Warm-up concluído — detecções a partir de agora são rápidas");
    } catch (e) { /* sem problema */ }
  },

  opcoesDetecao(inputSize) {
    return new faceapi.TinyFaceDetectorOptions({
      inputSize: parseInt(inputSize) || CONFIG.DEFAULT_INPUT_SIZE,
      scoreThreshold: 0.4
    });
  }
};
