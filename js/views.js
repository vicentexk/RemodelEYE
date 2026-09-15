/* ============================================================
   EYE GATE v2 — Views: Dashboard, Registros, Relatórios
   ============================================================ */

const Views = {
  logsCache: [],

  /* ================= DASHBOARD ================= */
  async carregarDashboard() {
    try {
      const [alunos, usuarios, logs] = await Promise.all([
        Face.pronto ? Face.alunos : DB.listarAlunos(),
        Auth.ehAdmin() ? DB.listarUsuarios().catch(() => []) : Promise.resolve([]),
        DB.listarLogs(500)
      ]);

      const hoje = new Date().setHours(0, 0, 0, 0);
      const logsHoje = logs.filter(l => new Date(l.horario).setHours(0, 0, 0, 0) === hoje);

      document.getElementById("stAlunos").textContent = alunos.length;
      document.getElementById("stUsuarios").textContent = Auth.ehAdmin() ? usuarios.length : "—";
      document.getElementById("stHoje").textContent = logsHoje.length;
      document.getElementById("stTotal").textContent = logs.length;

      this._graficoSemana(logs);
      this._graficoDonut(logs);
      this._graficoHoras(logsHoje);
      this._feedRecent(logs);
    } catch (e) {
      console.error("Dashboard:", e);
    }
  },

  _graficoSemana(logs) {
    const dias = [], valores = [];
    const fmtDia = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      dias.push(`${fmtDia[d.getDay()]} ${d.getDate()}`);
      valores.push(logs.filter(l => new Date(l.horario).setHours(0, 0, 0, 0) === d.getTime()).length);
    }
    Charts.bars(document.getElementById("chartWeek"), { labels: dias, values: valores });
  },

  _graficoDonut(logs) {
    const semana = Date.now() - 7 * 864e5;
    const recentes = logs.filter(l => new Date(l.horario).getTime() >= semana);
    const entradas = recentes.filter(l => l.status === "Entrada").length;
    const saidas = recentes.filter(l => l.status === "Saída").length;
    Charts.donut(document.getElementById("chartDonut"), {
      segments: [
        { label: "Entradas", value: entradas, color: "#2C9FA2" },
        { label: "Saídas", value: saidas, color: "#FEB914" }
      ],
      centerLabel: "acessos / 7 dias"
    });
  },

  _graficoHoras(logsHoje) {
    const horas = Array(24).fill(0);
    logsHoje.forEach(l => horas[new Date(l.horario).getHours()]++);
    // mostra janela 6h–22h
    const labels = [], valores = [];
    for (let h = 6; h <= 22; h++) { labels.push(`${h}h`); valores.push(horas[h]); }
    Charts.bars(document.getElementById("chartHours"), { labels, values, color: "#FE8826", color2: "#FEB914" });
  },

  _feedRecent(logs) {
    const feed = document.getElementById("feedRecent");
    const ultimos = logs.slice(0, 12);
    if (ultimos.length === 0) {
      feed.innerHTML = '<div class="empty"><p>Sem acessos registrados ainda</p></div>';
      return;
    }
    feed.innerHTML = ultimos.map(l => `
      <div class="feed-item ${l.status === "Entrada" ? "t-in" : "t-out"}">
        <div class="feed-avatar">${UI.iniciais(l.nome_aluno)}</div>
        <div class="feed-info">
          <div class="feed-name">${UI.escape(l.nome_aluno)}</div>
          <div class="feed-time">${UI.fmtDataHora(l.horario)}</div>
        </div>
        <span class="tag ${l.status === "Entrada" ? "tag-in" : "tag-out"}">${l.status === "Entrada" ? "ENTRADA" : "SAÍDA"}</span>
      </div>`).join("");
  },

  /* ================= REGISTROS ================= */
  async carregarRegistros() {
    UI.loading(true);
    try {
      this.logsCache = await DB.listarLogs(500);
      this.renderRegistros();
    } catch (e) {
      console.error(e);
      UI.toast("Erro ao carregar registros", "err");
    } finally {
      UI.loading(false);
    }
  },

  renderRegistros() {
    const busca = document.getElementById("regBusca").value.toLowerCase().trim();
    const tipo = document.getElementById("regTipo").value;
    const data = document.getElementById("regData").value;

    let lista = this.logsCache;
    if (busca) lista = lista.filter(l => l.nome_aluno?.toLowerCase().includes(busca));
    if (tipo) lista = lista.filter(l => l.status === tipo);
    if (data) lista = lista.filter(l => new Date(l.horario).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) === data);

    const body = document.getElementById("regBody");
    if (lista.length === 0) {
      body.innerHTML = '<tr><td colspan="4"><div class="empty"><p>Nenhum registro encontrado</p></div></td></tr>';
    } else {
      body.innerHTML = lista.slice(0, 300).map(l => `
        <tr>
          <td class="cell-strong">${UI.escape(l.nome_aluno)}</td>
          <td><span class="tag ${l.status === "Entrada" ? "tag-in" : "tag-out"}">${l.status === "Entrada" ? "ENTRADA" : "SAÍDA"}</span></td>
          <td class="cell-dim">${UI.fmtData(l.horario)}</td>
          <td class="cell-dim">${UI.fmtHora(l.horario)}</td>
        </tr>`).join("");
    }
    document.getElementById("regInfo").textContent = `Mostrando ${Math.min(lista.length, 300)} de ${lista.length} registros`;
  },

  exportarCSVRegistros() {
    if (this.logsCache.length === 0) return UI.toast("Nada pra exportar", "warn");
    const linhas = [["Aluno", "Tipo", "Data", "Hora"]];
    this.logsCache.forEach(l => linhas.push([l.nome_aluno, l.status, UI.fmtData(l.horario), UI.fmtHora(l.horario)]));
    UI.baixarCSV(`eye-gate-registros-${new Date().toISOString().slice(0, 10)}.csv`, linhas);
    UI.toast("CSV exportado!", "ok");
  },

  /* ================= RELATÓRIOS ================= */
  relDados: null,

  async initRelatorios() {
    const sel = document.getElementById("relAluno");
    if (!Face.alunos.length) await Face.carregarAlunos();
    sel.innerHTML = '<option value="">Selecione o aluno…</option>' +
      Face.alunos.map(a => `<option value="${a.id}">${UI.escape(a.nome)}</option>`).join("");
  },

  async gerarRelatorio() {
    const alunoId = document.getElementById("relAluno").value;
    const de = document.getElementById("relDe").value;
    const ate = document.getElementById("relAte").value;
    if (!alunoId) return UI.toast("Selecione um aluno", "warn");

    const aluno = Face.alunos.find(a => String(a.id) === String(alunoId));
    const deISO = de ? new Date(de + "T00:00:00").toISOString() : null;
    const ateISO = ate ? new Date(ate + "T23:59:59").toISOString() : null;

    UI.loading(true);
    try {
      const logs = await DB.logsDoAluno(alunoId, deISO, ateISO);
      this.relDados = { aluno, logs, de, ate };

      const entradas = logs.filter(l => l.status === "Entrada").length;
      const saidas = logs.filter(l => l.status === "Saída").length;

      document.getElementById("relResumo").innerHTML = `
        <div style="text-align:center;padding:8px 0 4px">
          <div class="avatar" style="width:56px;height:56px;font-size:19px;margin:0 auto 10px">${UI.iniciais(aluno?.nome)}</div>
          <b style="font-size:16px">${UI.escape(aluno?.nome)}</b>
          <p style="color:var(--text-faint);font-size:12.5px">${logs.length} registros no período</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">
          <div style="background:var(--ok-soft);border-radius:12px;padding:14px;text-align:center">
            <div style="font-size:26px;font-weight:800;color:var(--ok)">${entradas}</div>
            <div style="font-size:11.5px;color:var(--text-dim)">Entradas</div>
          </div>
          <div style="background:var(--warn-soft);border-radius:12px;padding:14px;text-align:center">
            <div style="font-size:26px;font-weight:800;color:var(--warn)">${saidas}</div>
            <div style="font-size:11.5px;color:var(--text-dim)">Saídas</div>
          </div>
        </div>`;

      const body = document.getElementById("relBody");
      body.innerHTML = logs.length === 0
        ? '<tr><td colspan="3"><div class="empty"><p>Sem registros nesse período</p></div></td></tr>'
        : logs.map(l => `
          <tr>
            <td><span class="tag ${l.status === "Entrada" ? "tag-in" : "tag-out"}">${l.status === "Entrada" ? "ENTRADA" : "SAÍDA"}</span></td>
            <td class="cell-dim">${UI.fmtData(l.horario)}</td>
            <td class="cell-dim">${UI.fmtHora(l.horario)}</td>
          </tr>`).join("");

      document.getElementById("btnRelPdf").disabled = false;
      document.getElementById("btnRelPrint").disabled = false;

      if (logs.length === 0) UI.toast("Nenhum registro no período", "warn");
    } catch (e) {
      console.error(e);
      UI.toast("Erro ao gerar relatório", "err");
    } finally {
      UI.loading(false);
    }
  },

  baixarPDF() {
    if (!this.relDados) return;
    const { aluno, logs, de, ate } = this.relDados;
    if (!logs.length) return UI.toast("Nada pra gerar", "warn");

    try {
      const doc = new jspdf.jsPDF();
      const entradas = logs.filter(l => l.status === "Entrada").length;
      const saidas = logs.length - entradas;

      // header
      doc.setFillColor(13, 19, 34);
      doc.rect(0, 0, 210, 34, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.text("EYE GATE", 14, 15);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(160, 170, 190);
      doc.text("Relatório de acessos — controle de entrada e saída", 14, 22);

      // dados do aluno
      doc.setTextColor(30, 35, 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(aluno.nome, 14, 46);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 110, 130);
      const periodo = de || ate ? `Período: ${de ? UI.fmtData(de) : "início"} até ${ate ? UI.fmtData(ate) : "hoje"}` : "Período: completo";
      doc.text(`${periodo}  ·  Matrícula: ${aluno.matricula || "—"}  ·  Turma: ${aluno.turma || "—"}`, 14, 53);

      // resumo (caixinhas)
      const box = (x, cor, valor, label) => {
        doc.setFillColor(...cor);
        doc.roundedRect(x, 60, 58, 18, 2.5, 2.5, "F");
        doc.setTextColor(...(cor[0] === 61 ? [16, 94, 66] : [140, 96, 20]));
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(String(valor), x + 29, 70.5, { align: "center" });
        doc.setFontSize(8);
        doc.text(label, x + 29, 75, { align: "center" });
      };
      box(14, [222, 247, 236], entradas, "ENTRADAS");
      box(76, [255, 244, 222], saidas, "SAÍDAS");
      box(138, [232, 235, 250], logs.length, "TOTAL");

      // tabela
      let y = 92;
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(35, 45, 75);
      doc.roundedRect(14, y - 6, 182, 8, 1.5, 1.5, "F");
      doc.text("TIPO", 20, y);
      doc.text("DATA", 80, y);
      doc.text("HORÁRIO", 130, y);
      y += 8;
      doc.setTextColor(50, 55, 70);
      doc.setFont("helvetica", "normal");

      for (const l of logs.slice().reverse()) {
        if (y > 278) { doc.addPage(); y = 20; }
        doc.text(l.status, 20, y);
        doc.text(UI.fmtData(l.horario), 80, y);
        doc.text(UI.fmtHora(l.horario), 130, y);
        y += 6.5;
      }

      // rodapé
      doc.setFontSize(8);
      doc.setTextColor(150, 155, 170);
      doc.text(`Gerado pelo EYE GATE em ${new Date().toLocaleString("pt-BR")} · Protótipo educacional`, 14, 290);

      doc.save(`relatorio-${aluno.nome.toLowerCase().replace(/\s+/g, "-")}.pdf`);
      UI.toast("PDF gerado!", "ok");
    } catch (e) {
      console.error(e);
      UI.toast("Erro no PDF — use Imprimir como alternativa", "err");
    }
  },

  imprimirRelatorio() {
    if (!this.relDados) return;
    const { aluno, logs, de, ate } = this.relDados;
    const area = document.getElementById("printArea");
    area.innerHTML = `
      <h1 style="font-size:20px;margin-bottom:2px">EYE GATE — Relatório de acessos</h1>
      <p style="font-size:12px;color:#555">Aluno: <b>${UI.escape(aluno.nome)}</b> · ${de || ate ? `${de || "início"} a ${ate || "hoje"}` : "período completo"}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:12px">
        <thead><tr><th style="text-align:left;border-bottom:2px solid #333;padding:6px">Tipo</th><th style="text-align:left;border-bottom:2px solid #333;padding:6px">Data</th><th style="text-align:left;border-bottom:2px solid #333;padding:6px">Horário</th></tr></thead>
        <tbody>${logs.slice().reverse().map(l => `<tr><td style="padding:5px;border-bottom:1px solid #ddd">${l.status}</td><td style="padding:5px;border-bottom:1px solid #ddd">${UI.fmtData(l.horario)}</td><td style="padding:5px;border-bottom:1px solid #ddd">${UI.fmtHora(l.horario)}</td></tr>`).join("")}</tbody>
      </table>`;
    area.style.display = "block";
    window.print();
    setTimeout(() => (area.style.display = "none"), 400);
  }
};
