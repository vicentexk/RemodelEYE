/* ============================================================
   EYE GATE v2 — Configuração global
   ============================================================ */

const CONFIG = {
  SUPABASE_URL: "https://rhopvipdkeawvejztzix.supabase.co",
  SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJob3B2aXBka2Vhd3Zlanp0eml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTUxNDUsImV4cCI6MjA5NDY5MTE0NX0.U7NAbG461jLbeSqwkP6gecHFg1UoNDkKY4mUH29NtYA",

  MODELS_PATH: "./models",

  // Suporte
  SUPORTE_WHATSAPP: "5541988181009",
  SUPORTE_EMAIL: "vi2812009@gmail.com",

  // Reconhecimento
  MATCH_THRESHOLD: 0.55,     // distância máxima pro match
  DETECT_INTERVAL: 60,       // pausa entre ciclos de detecção (ms)
  DEFAULT_INPUT_SIZE: 320,   // modo equilibrado
  DEFAULT_COOLDOWN_S: 15,    // mesmo aluno re-reconhecido após N segundos
};

const POSES = [
  "Olhe para frente",
  "Vire para a esquerda",
  "Vire para a direita",
  "Olhe para cima",
  "Olhe para baixo"
];
