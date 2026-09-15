/* ============================================================
   EYE GATE v2 — Painel Admin
   ★ Bloquear / desbloquear contas
   ★ Excluir contas
   ★ Promover a admin / rebaixar
   ★ Criar conta admin do zero
   ★ Gestão de alunos + logs com CSV e limpeza
   ============================================================ */

const Admin = {
  usuarios: [],
  logs: [],
  tab: "usuarios",

  init() {
    document.querySelectorAll("#adminSeg button").forEach(btn => {
      btn.onclick = () => this.setTab(btn.dataset.tab);
    });
    document.getElementById("adBusca").oninput = () => this.renderUsuarios();
    document.getElementById("adAlunoBusca").oninput = () => this.renderAlunos();
    document.getElementById("btnAdAlunoRefresh").onclick = async () => { await Face.carregarAlunos(); this.renderAlunos(); UI.toast("Atualizado", "ok"); };
    document.getElementById("btnAdNovoAdmin").onclick = () => this.criarAdmin();
    document.getElementById("btnAdLogsCsv").onclick = () => this.exportarLogsCSV();
    document.getElementById("btnAdLogsClear").onclick = () => this.limparLogs();
  },

  setTab(tab) {
    this.tab = tab;
    document.querySelectorAll("#adminSeg button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    document.getElementById("adminTab-usuarios").style.display = tab === "usuarios" ? "" : "none";
    document.getElementById("adminTab-alunos").style.display = tab === "alunos" ? "" : "none";
    document.getElementById("adminTab-logs").style.display = tab === "logs" ? "" : "none";
    if (tab === "usuarios") this.carregarUsuarios();
    if (tab === "alunos") this.renderAlunos();
    if (tab === "logs") this.carregarLogs();
  },

  async abrir() {
    await this.carregarUsuarios();
    if (this.tab !== "usuarios") this.setTab(this.tab);
  },

  /* ================= USUÁRIOS ================= */
  async carregarUsuarios() {
    try {
      this.usuarios = await DB.listarUsuarios();
      document.getElementById("adTotal").textContent = this.usuarios.length;
      document.getElementById("adAdmins").textContent = this.usuarios.filter(u => u.tipo === "admin").length;
      document.getElementById("adBloq").textContent = this.usuarios.filter(u => u.bloqueado).length;
      this.renderUsuarios();
    } catch (e) {
      console.error(e);
      UI.toast("Erro ao carregar usuários", "err");
    }
  },

  renderUsuarios() {
    const busca = document.getElementById("adBusca").value.toLowerCase().trim();
    const lista = this.usuarios.filter(u =>
      !busca || u.nome?.toLowerCase().includes(busca) || u.email?.toLowerCase().includes(busca)
    );
    const body = document.getElementById("adBody");

    if (lista.length === 0) {
      body.innerHTML = '<tr><td colspan="4"><div class="empty"><p>Nenhuma conta encontrada</p></div></td></tr>';
      return;
    }

    body.innerHTML = lista.map(u => {
      const eu = u.id === Auth.user?.id;
      const ehAdmin = u.tipo === "admin";
      const bloqueado = !!u.bloqueado;
      return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:11px">
            <div class="avatar" style="width:34px;height:34px;font-size:12px">${UI.iniciais(u.nome)}</div>
            <div>
              <div class="cell-strong">${UI.escape(u.nome)} ${eu ? '<span class="tag tag-admin">VOCÊ</span>' : ""}</div>
              <div class="cell-dim">${UI.escape(u.email)}</div>
            </div>
          </div>
        </td>
        <td><span class="${ehAdmin ? "tag tag-admin" : "tag tag-neutral"}">${ehAdmin ? "ADMIN" : "USUÁRIO"}</span></td>
        <td><span class="tag ${bloqueado ? "tag-danger" : "tag-in"}">${bloqueado ? "BLOQUEADO" : "ATIVO"}</span></td>
        <td>
          <div class="row-actions">
            ${eu ? '<span class="cell-dim" style="align-self:center">—</span>' : `
              <button class="btn btn-sm ${bloqueado ? "btn-ok" : "btn-warn"}" data-act="block" data-id="${u.id}" data-bloq="${bloqueado}"
                title="${bloqueado ? "Desbloquear" : "Bloquear"} conta">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#${bloqueado ? "i-unlock" : "i-lock"}"/></svg>
                ${bloqueado ? "Desbloquear" : "Bloquear"}
              </button>
              <button class="btn btn-sm btn-primary" data-act="role" data-id="${u.id}" data-admin="${ehAdmin}" title="${ehAdmin ? "Rebaixar para usuário" : "Promover a admin"}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#${ehAdmin ? "i-users" : "i-award"}"/></svg>
                ${ehAdmin ? "Rebaixar" : "Promover"}
              </button>
              <button class="btn btn-danger btn-sm btn-icon" data-act="del" data-id="${u.id}" title="Excluir conta">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#i-trash"/></svg>
              </button>`}
          </div>
        </td>
      </tr>`;
    }).join("");

    body.querySelectorAll("[data-act]").forEach(btn => {
      btn.onclick = () => this.acao(btn.dataset.act, btn.dataset.id, btn.dataset);
    });
  },

  async acao(act, id, dados) {
    const user = this.usuarios.find(u => String(u.id) === String(id));
    if (!user) return;

    if (act === "block") {
      const novo = dados.bloq === "true" ? false : true;
      UI.loading(true);
      const { error } = await DB.setBloqueado(id, novo);
      UI.loading(false);
      if (error) return UI.toast("Erro ao atualizar conta", "err");
      UI.toast(novo ? `⛔ ${user.nome} foi bloqueado` : `✅ ${user.nome} foi desbloqueado`, novo ? "warn" : "ok");
      await this.carregarUsuarios();
    }

    if (act === "role") {
      const ehAdmin = dados.admin === "true";
      const ok = await UI.confirm({
        titulo: ehAdmin ? "Rebaixar administrador" : "Promover a administrador",
        texto: ehAdmin
          ? `<b>${UI.escape(user.nome)}</b> voltará a ser usuário comum e perderá o acesso ao painel de administração.`
          : `<b>${UI.escape(user.nome)}</b> terá acesso total ao sistema: gestão de contas, alunos e registros.`,
        icone: "i-award", cor: "i-accent",
        okText: ehAdmin ? "Rebaixar" : "Promover",
        okClass: "btn-primary"
      });
      if (!ok) return;
      UI.loading(true);
      const { error } = await DB.setTipo(id, ehAdmin ? "usuario" : "admin");
      UI.loading(false);
      if (error) return UI.toast("Erro ao alterar nível", "err");
      UI.toast(ehAdmin ? `${user.nome} agora é usuário` : `🎉 ${user.nome} agora é admin`, "ok");
      await this.carregarUsuarios();
    }

    if (act === "del") {
      const ok = await UI.confirm({
        titulo: "Excluir conta",
        texto: `Excluir a conta de <b>${UI.escape(user.nome)}</b> (${UI.escape(user.email)}) permanentemente? Essa ação não pode ser desfeita.`,
        icone: "i-trash", cor: "i-danger", okText: "Excluir conta"
      });
      if (!ok) return;
      UI.loading(true);
      const { error } = await DB.excluirUsuario(id);
      UI.loading(false);
      if (error) return UI.toast("Erro ao excluir conta", "err");
      UI.toast("Conta excluída", "ok");
      await this.carregarUsuarios();
    }
  },

  criarAdmin() {
    const root = document.getElementById("modalRoot");
    root.innerHTML = `
      <div class="modal">
        <div class="modal-icon i-accent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#i-shield"/></svg>
        </div>
        <h3>Criar conta de administrador</h3>
        <p>A conta já nasce com permissões de admin.</p>
        <div style="margin-top:16px;text-align:left">
          <div class="field"><label class="label">Nome</label><input class="input" id="naNome" placeholder="Nome completo"/></div>
          <div class="field"><label class="label">E-mail</label><input class="input" id="naEmail" type="email" placeholder="admin@escola.com"/></div>
          <div class="field" style="margin-bottom:0"><label class="label">Senha</label><input class="input" id="naSenha" type="password" placeholder="mínimo 4 caracteres"/></div>
        </div>
        <div class="modal-actions">
          <button class="btn" id="naCancel">Cancelar</button>
          <button class="btn btn-primary" id="naOk">Criar admin</button>
        </div>
      </div>`;
    root.classList.add("open");

    const fechar = () => { root.classList.remove("open"); root.innerHTML = ""; };
    root.querySelector("#naCancel").onclick = fechar;
    root.querySelector("#naOk").onclick = async () => {
      const nome = root.querySelector("#naNome").value.trim();
      const email = root.querySelector("#naEmail").value.trim().toLowerCase();
      const senha = root.querySelector("#naSenha").value.trim();
      if (!nome || !email || !senha) return UI.toast("Preencha todos os campos", "warn");
      if (senha.length < 4) return UI.toast("Senha muito curta", "warn");

      const existe = await DB.buscarUsuarioPorEmail(email).catch(() => null);
      if (existe) { fechar(); return UI.toast("Já existe uma conta com esse e-mail", "warn"); }

      UI.loading(true);
      const { error } = await DB.criarUsuario({ nome, email, senha, tipo: "admin" });
      UI.loading(false);
      fechar();
      if (error) return UI.toast("Erro ao criar conta admin", "err");
      UI.toast(`🎉 Admin ${nome.split(" ")[0]} criado com sucesso!`, "ok");
      await this.carregarUsuarios();
    };
  },

  /* ================= ALUNOS ================= */
  renderAlunos() {
    const busca = (document.getElementById("adAlunoBusca").value || "").toLowerCase().trim();
    const lista = Face.alunos.filter(a => !busca || a.nome.toLowerCase().includes(busca));
    const body = document.getElementById("adAlunoBody");

    if (lista.length === 0) {
      body.innerHTML = '<tr><td colspan="4"><div class="empty"><p>Nenhum aluno cadastrado</p></div></td></tr>';
      return;
    }

    body.innerHTML = lista.map(a => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:11px">
            <div class="aluno-thumb">${a.foto ? `<img src="${a.foto}"/>` : UI.iniciais(a.nome)}</div>
            <div class="cell-strong">${UI.escape(a.nome)}</div>
          </div>
        </td>
        <td class="cell-dim">${UI.escape(a.matricula || "—")}</td>
        <td class="cell-dim">${UI.escape(a.turma || "—")}</td>
        <td><div class="row-actions">
          <button class="btn btn-danger btn-sm btn-icon" data-id="${a.id}" title="Excluir aluno">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#i-trash"/></svg>
          </button>
        </div></td>
      </tr>`).join("");

    body.querySelectorAll("[data-id]").forEach(btn => {
      btn.onclick = async () => {
        const aluno = Face.alunos.find(x => String(x.id) === btn.dataset.id);
        const ok = await UI.confirm({
          titulo: "Excluir aluno",
          texto: `Excluir <b>${UI.escape(aluno?.nome)}</b>, o cadastro facial e o histórico de acessos?`,
          icone: "i-trash", cor: "i-danger", okText: "Excluir"
        });
        if (!ok) return;
        UI.loading(true);
        const { error } = await DB.excluirAluno(btn.dataset.id);
        UI.loading(false);
        if (error) return UI.toast("Erro ao excluir", "err");
        UI.toast("Aluno excluído", "ok");
        await Face.carregarAlunos();
        this.renderAlunos();
        Cadastro.renderAlunos();
      };
    });
  },

  /* ================= LOGS ================= */
  async carregarLogs() {
    UI.loading(true);
    try {
      this.logs = await DB.listarLogs(200);
      const body = document.getElementById("adLogsBody");
      body.innerHTML = this.logs.length === 0
        ? '<tr><td colspan="3"><div class="empty"><p>Nenhum log no sistema</p></div></td></tr>'
        : this.logs.map(l => `
          <tr>
            <td class="cell-strong">${UI.escape(l.nome_aluno)}</td>
            <td><span class="tag ${l.status === "Entrada" ? "tag-in" : "tag-out"}">${l.status === "Entrada" ? "ENTRADA" : "SAÍDA"}</span></td>
            <td class="cell-dim">${UI.fmtDataHora(l.horario)}</td>
          </tr>`).join("");
    } catch (e) {
      console.error(e);
      UI.toast("Erro ao carregar logs", "err");
    } finally {
      UI.loading(false);
    }
  },

  exportarLogsCSV() {
    if (!this.logs.length) return UI.toast("Nada pra exportar", "warn");
    const linhas = [["Aluno", "Tipo", "Data", "Hora"]];
    this.logs.forEach(l => linhas.push([l.nome_aluno, l.status, UI.fmtData(l.horario), UI.fmtHora(l.horario)]));
    UI.baixarCSV("eye-gate-logs-sistema.csv", linhas);
    UI.toast("CSV exportado!", "ok");
  },

  async limparLogs() {
    const ok = await UI.confirm({
      titulo: "Limpar histórico completo",
      texto: "Isso apaga <b>todos os registros de entrada e saída</b> do sistema. Essa ação é irreversível!",
      icone: "i-alert", cor: "i-danger", okText: "Apagar tudo"
    });
    if (!ok) return;
    UI.loading(true);
    const { error } = await DB.limparLogs();
    UI.loading(false);
    if (error) return UI.toast("Erro ao limpar logs", "err");
    UI.toast("Histórico apagado", "ok");
    await this.carregarLogs();
  }
};
