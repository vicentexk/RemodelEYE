/* ============================================================
   EYE GATE v2 — Orquestrador do app (router, topbar, sessão)
   ============================================================ */

const App = {
  viewAtual: "dashboard",
  _intervalClock: null,
  _intervalDash: null,

  TITULOS: {
    dashboard: ["Dashboard", "Visão geral do sistema"],
    monitor: ["Monitor", "Reconhecimento facial em tempo real"],
    cadastro: ["Cadastro facial", "Novos alunos e captura de poses"],
    registros: ["Registros", "Histórico de entradas e saídas"],
    relatorios: ["Relatórios", "PDF e impressão por aluno"],
    admin: ["Gestão de contas", "Usuários, permissões e logs"]
  },

  init() {
    DB.init();
    Auth.init();
    Monitor.init();
    Cadastro.init();
    Admin.init();

    // nav
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.onclick = () => this.ir(btn.dataset.view);
    });

    // logout
    document.getElementById("btnLogout").onclick = async () => {
      const ok = await UI.confirm({
        titulo: "Sair do EYE GATE",
        texto: "Deseja encerrar a sessão?",
        icone: "i-logout", cor: "i-accent", okText: "Sair", okClass: "btn-primary"
      });
      if (ok) Auth.sair();
    };

    // relógio topbar
    const tick = () => {
      const el = document.getElementById("topClock");
      if (el) el.textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };
    this._intervalClock = setInterval(tick, 1000);
    tick();

    // status de conexão
    this._pingConn();
    setInterval(() => this._pingConn(), 60000);

    // listeners específicos das views
    this._initRegistros();
    this._initRelatorios();

    // sessão restaurada? entra direto
    if (Auth.restaurar()) this.enterApp();

    console.log("[EYE-GATE v2] pronto ⚡");
  },

  async _pingConn() {
    const ok = await DB.ping();
    const dot = document.getElementById("connDot");
    const label = document.getElementById("connLabel");
    dot.className = `dot ${ok ? "on" : "off"}`;
    label.textContent = ok ? "BANCO CONECTADO" : "BANCO OFFLINE";
    label.title = ok
      ? "Conexão com o Supabase OK"
      : "Sem conexão com o banco. Verifique a internet — se estiver OK, restaure o projeto em supabase.com/dashboard";
    label.style.cursor = "pointer";
    label.onclick = () => {
      window.open(`https://wa.me/${CONFIG.SUPORTE_WHATSAPP}?text=${encodeURIComponent("Olá! O EYE GATE está mostrando BANCO OFFLINE, preciso de ajuda.")}`, "_blank");
    };
  },

  enterApp() {
    document.getElementById("screen-auth").classList.remove("active");
    document.getElementById("screen-app").classList.add("active");

    const user = Auth.user;
    document.getElementById("userName").textContent = user.nome;
    document.getElementById("userRole").textContent = user.email;
    document.getElementById("userAvatar").textContent = UI.iniciais(user.nome);
    document.getElementById("userBadge").style.display = Auth.ehAdmin() ? "" : "none";
    document.getElementById("navAdminWrap").style.display = Auth.ehAdmin() ? "" : "none";

    this.ir("dashboard");
  },

  ir(view) {
    if (view === "admin" && !Auth.ehAdmin()) return UI.toast("Apenas administradores", "warn");

    this.viewAtual = view;
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === view));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById(`view-${view}`).classList.add("active");

    const [titulo, sub] = this.TITULOS[view];
    document.getElementById("viewTitle").textContent = titulo;
    document.getElementById("viewSubtitle").textContent = sub;

    // hooks de entrada
    if (view === "dashboard") { this.refreshDashboard(); this._autoDash(true); }
    else this._autoDash(false);

    if (view === "cadastro") Cadastro.renderAlunos();
    if (view === "registros") Views.carregarRegistros();
    if (view === "relatorios") Views.initRelatorios();
    if (view === "admin") Admin.abrir();

    // sair do monitor pausa a câmera (economiza bateria/CPU)
    if (view !== "monitor" && Monitor.ativo) Monitor.parar();
    if (view !== "cadastro" && Cadastro.stream) Cadastro.pararCamera();
  },

  _autoDash(on) {
    clearInterval(this._intervalDash);
    if (on) this._intervalDash = setInterval(() => {
      if (this.viewAtual === "dashboard") this.refreshDashboardSilently();
    }, 30000);
  },

  async refreshDashboard() {
    UI.loading(true);
    try { await Views.carregarDashboard(); } finally { UI.loading(false); }
  },

  refreshDashboardSilently() {
    if (this.viewAtual === "dashboard") Views.carregarDashboard();
  },

  _initRegistros() {
    document.getElementById("regBusca").oninput = () => Views.renderRegistros();
    document.getElementById("regTipo").onchange = () => Views.renderRegistros();
    document.getElementById("regData").onchange = () => Views.renderRegistros();
    document.getElementById("regLimpar").onclick = () => {
      document.getElementById("regBusca").value = "";
      document.getElementById("regTipo").value = "";
      document.getElementById("regData").value = "";
      Views.renderRegistros();
    };
    document.getElementById("regCsv").onclick = () => Views.exportarCSVRegistros();
    document.getElementById("regRefresh").onclick = () => Views.carregarRegistros();
  },

  _initRelatorios() {
    document.getElementById("btnRelGerar").onclick = () => Views.gerarRelatorio();
    document.getElementById("btnRelPdf").onclick = () => Views.baixarPDF();
    document.getElementById("btnRelPrint").onclick = () => Views.imprimirRelatorio();
  }
};

window.addEventListener("DOMContentLoaded", () => App.init());
