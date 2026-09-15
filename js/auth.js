/* ============================================================
   EYE GATE v2 — Autenticação
   Login unificado (Usuário / Administrador) + contas bloqueadas
   ============================================================ */

const Auth = {
  user: null,

  modo: "login",      // "login" | "signup"
  perfil: "usuario",  // "usuario" | "admin"

  init() {
    const form = document.getElementById("authForm");
    const segLogin = document.getElementById("segLogin");
    const segSignup = document.getElementById("segSignup");
    const note = document.getElementById("authNote");
    const title = document.getElementById("authTitle");
    const subtitle = document.getElementById("authSubtitle");
    const submit = document.getElementById("authSubmit");

    // segmented: entrar / criar conta (sempre voltam pra perfil usuário)
    segLogin.onclick = () => { this.setPerfil("usuario"); this.setModo("login"); };
    segSignup.onclick = () => { this.setPerfil("usuario"); this.setModo("signup"); };

    // nota: alterna pra modo admin e volta
    document.getElementById("noteAdmin").onclick = () => {
      if (this.perfil === "admin") { this.setPerfil("usuario"); }
      else { this.setModo("login"); this.setPerfil("admin"); }
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.submit();
    });

    // suporte
    document.getElementById("linkSuporte").onclick = (e) => {
      e.preventDefault();
      window.open(`https://wa.me/${CONFIG.SUPORTE_WHATSAPP}?text=${encodeURIComponent("Olá! Preciso de ajuda com o EYE GATE.")}`, "_blank");
    };

    // ★ a pupila do olho segue o mouse (identidade KEYHOLE)
    const pupila = document.getElementById("bigEyePupil");
    if (pupila) {
      document.addEventListener("mousemove", (e) => {
        const eye = pupila.closest("svg");
        if (!eye) return;
        const r = eye.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const max = Math.min(dist / 12, 4.2); // limite do olhar
        pupila.style.transform = `translate(${(dx / dist) * max}px, ${(dy / dist) * max}px)`;
      });
    }
  },

  setModo(modo) {
    this.modo = modo;
    const isLogin = modo === "login";
    document.getElementById("segLogin").classList.toggle("on", isLogin);
    document.getElementById("segSignup").classList.toggle("on", !isLogin);
    document.getElementById("fieldName").style.display = isLogin ? "none" : "";
    document.getElementById("authTitle").textContent = isLogin ? "Bem-vindo de volta" : "Criar sua conta";
    document.getElementById("authSubtitle").textContent = isLogin ? "Entre para acessar o painel escolar" : "Leva menos de um minuto";
    document.getElementById("authSubmit").textContent = isLogin ? "Entrar" : "Criar conta";
  },

  setPerfil(perfil) {
    this.perfil = perfil;
    const seg = document.getElementById("authSeg");
    // cria/atualiza botão admin no segment
    let btnAdmin = document.getElementById("segAdmin");
    if (!btnAdmin) {
      btnAdmin = document.createElement("button");
      btnAdmin.type = "button";
      btnAdmin.id = "segAdmin";
      seg.appendChild(btnAdmin);
      seg.classList.add("seg-3");
      btnAdmin.onclick = () => this.setPerfil("admin");
    }
    btnAdmin.textContent = "👑 Admin";
    btnAdmin.classList.toggle("on", perfil === "admin");
    document.getElementById("segLogin").classList.toggle("on", perfil === "usuario" && this.modo === "login");
    document.getElementById("segSignup").classList.toggle("on", perfil === "usuario" && this.modo === "signup");
    document.getElementById("authNote").style.display = perfil === "admin" ? "none" : "";
  },

  async submit() {
    const nome = document.getElementById("fNome").value.trim();
    const email = document.getElementById("fEmail").value.trim().toLowerCase();
    const senha = document.getElementById("fSenha").value.trim();

    if (!email || !senha) return UI.toast("Preencha e-mail e senha", "warn");
    if (this.modo === "signup" && !nome) return UI.toast("Digite seu nome", "warn");

    UI.loading(true);
    const btn = document.getElementById("authSubmit");
    btn.disabled = true;
    try {
      // checagem prévia: banco alcançável?
      const online = await DB.ping();
      if (!online) {
        UI.toast("Banco de dados offline. Verifique sua internet — se a internet estiver OK, o projeto do Supabase pode ter sido pausado (restaure em supabase.com/dashboard).", "err", 7000);
        return;
      }
      if (this.modo === "signup") {
        await this.signup(nome, email, senha);
      } else {
        await this.login(email, senha);
      }
    } catch (err) {
      console.error(err);
      UI.toast("Falha de conexão: " + (err?.message || "verifique a internet ou o projeto Supabase"), "err", 6000);
    } finally {
      UI.loading(false);
      btn.disabled = false;
    }
  },

  async signup(nome, email, senha) {
    const existe = await DB.buscarUsuarioPorEmail(email);
    if (existe) return UI.toast("Este e-mail já está cadastrado", "warn");

    const { error } = await DB.criarUsuario({ nome, email, senha });
    if (error) {
      console.error(error);
      return UI.toast("Erro ao criar conta", "err");
    }
    UI.toast("Conta criada! Faça login 🎉", "ok");
    this.setModo("login");
    document.getElementById("fEmail").value = email;
    document.getElementById("fSenha").value = "";
  },

  async login(email, senha) {
    if (this.perfil === "admin") {
      // tabela admins (legado) OU usuario promovido a admin
      const adm = await DB.loginAdmin(email, senha).catch(() => null);
      if (adm) {
        this.entrar({ id: adm.id, nome: adm.nome || "Administrador", email: adm.email, tipo: "admin" });
        return;
      }
      const user = await DB.loginUsuario(email, senha).catch(() => null);
      if (user && user.tipo === "admin") {
        if (user.bloqueado) return UI.toast("Esta conta está bloqueada. Fale com outro administrador.", "err");
        this.entrar({ id: user.id, nome: user.nome, email: user.email, tipo: "admin" });
        return;
      }
      return UI.toast("Credenciais de administrador inválidas", "err");
    }

    const user = await DB.loginUsuario(email, senha).catch(() => null);
    if (!user) return UI.toast("E-mail ou senha incorretos", "err");

    if (user.bloqueado) {
      return UI.toast("⛔ Esta conta foi bloqueada pelo administrador.", "err", 5000);
    }

    this.entrar({ id: user.id, nome: user.nome, email: user.email, tipo: user.tipo === "admin" ? "admin" : "usuario" });
  },

  entrar(user) {
    this.user = user;
    localStorage.setItem("eyegate_session", JSON.stringify(user));
    UI.toast(`Bem-vindo(a), ${user.nome.split(" ")[0]}! 👋`, "ok");
    App.enterApp();
  },

  sair() {
    Monitor.parar(true);
    Cadastro.pararCamera();
    this.user = null;
    localStorage.removeItem("eyegate_session");
    document.getElementById("screen-app").classList.remove("active");
    document.getElementById("screen-auth").classList.add("active");
    UI.toast("Sessão encerrada", "info");
  },

  restaurar() {
    try {
      const raw = localStorage.getItem("eyegate_session");
      if (!raw) return false;
      const user = JSON.parse(raw);
      if (!user?.email) { localStorage.removeItem("eyegate_session"); return false; }
      this.user = user;
      return true;
    } catch (e) { return false; }
  },

  ehAdmin() {
    return this.user?.tipo === "admin";
  }
};
