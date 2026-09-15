/* ============================================================
   EYE GATE v2 — Camada de dados (Supabase)
   Tabelas: usuarios, admins, alunos, logs_reconhecimento
   ============================================================ */

const DB = {
  client: null,

  init() {
    this.client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    console.log("✅ Supabase conectado");
  },

  /* ---------- conexão ---------- */
  async ping() {
    try {
      const { error } = await this.client.from("usuarios").select("id").limit(1);
      return !error;
    } catch (e) { return false; }
  },

  /* ---------- usuários ---------- */
  async buscarUsuarioPorEmail(email) {
    const { data, error } = await this.client.from("usuarios").select("*").eq("email", email).maybeSingle();
    if (error) throw error;
    return data;
  },

  async loginUsuario(email, senha) {
    const { data, error } = await this.client.from("usuarios").select("*").eq("email", email).eq("senha", senha).maybeSingle();
    if (error) throw error;
    return data; // null se não achou
  },

  async loginAdmin(email, senha) {
    const { data, error } = await this.client.from("admins").select("*").eq("email", email).eq("senha", senha).maybeSingle();
    if (error) throw error;
    return data;
  },

  async criarUsuario({ nome, email, senha, tipo = "usuario" }) {
    const { data, error } = await this.client.from("usuarios").insert([{ nome, email, senha, tipo }]).select().single();
    return { data, error };
  },

  async listarUsuarios() {
    const { data, error } = await this.client.from("usuarios").select("id,nome,email,tipo,bloqueado,criado_em").order("criado_em", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async setBloqueado(id, bloqueado) {
    return this.client.from("usuarios").update({ bloqueado }).eq("id", id);
  },

  async setTipo(id, tipo) {
    return this.client.from("usuarios").update({ tipo }).eq("id", id);
  },

  async excluirUsuario(id) {
    return this.client.from("usuarios").delete().eq("id", id);
  },

  /* ---------- alunos ---------- */
  async listarAlunos() {
    const { data, error } = await this.client.from("alunos").select("id,nome,matricula,turma,foto,descriptor");
    if (error) throw error;
    return data || [];
  },

  async criarAluno({ nome, matricula, turma, foto, descriptor }) {
    return this.client.from("alunos").insert([{ nome, matricula, turma, foto, descriptor }]);
  },

  async excluirAluno(id) {
    // remove também o histórico do aluno
    await this.client.from("logs_reconhecimento").delete().eq("aluno_id", id);
    return this.client.from("alunos").delete().eq("id", id);
  },

  /* ---------- logs de reconhecimento ---------- */
  async listarLogs(limit = 200) {
    const { data, error } = await this.client.from("logs_reconhecimento").select("*").order("horario", { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  },

  async ultimoStatus(alunoId) {
    const { data } = await this.client
      .from("logs_reconhecimento").select("status")
      .eq("aluno_id", alunoId)
      .order("horario", { ascending: false }).limit(1);
    return data?.[0]?.status || null;
  },

  async inserirLog({ aluno_id, nome_aluno, status }) {
    return this.client.from("logs_reconhecimento").insert([{
      aluno_id, nome_aluno, status, horario: new Date().toISOString()
    }]);
  },

  async limparLogs() {
    return this.client.from("logs_reconhecimento").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  },

  /* ---------- relatórios ---------- */
  async logsDoAluno(alunoId, deISO, ateISO) {
    let q = this.client.from("logs_reconhecimento").select("*").eq("aluno_id", alunoId);
    if (deISO) q = q.gte("horario", deISO);
    if (ateISO) q = q.lte("horario", ateISO);
    const { data, error } = await q.order("horario", { ascending: false });
    if (error) throw error;
    return data || [];
  }
};
