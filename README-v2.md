# 👁 EYE GATE v2 — "KEYHOLE"

**Aplicativo Windows de reconhecimento facial para o controle de entrada e saída escolar.**

A identidade visual nasce da **logo oficial** (olho âmbar + fechadura): preto-fenda, âmbar `#F5A524`, tipografia Space Grotesk, cantos de mira e o olho que pisca — e segue seu mouse.

---

## 📦 O que tem aqui

| Pasta/arquivo | O que é |
|---|---|
| `index.html` + `css/` + `js/` | **O app de verdade** (roda dentro do desktop e também no navegador) |
| `landing/index.html` | **Site de apresentação** — só apresenta e aponta o download (GitHub Pages) |
| `electron/main.js` + `package.json` | Wrapper desktop (Electron): janela própria, câmera liberada, sem navegador |
| `models/`, `vendor/`, `face-api.min.js` | IA de reconhecimento e bibliotecas — **tudo local/offline** |
| `supabase/migration.sql` | **RODAR NO SUPABASE** (coluna `bloqueado` + índices) |
| `.github/workflows/build-exe.yml` | Build automático de instalador NSIS a cada tag |

---

## 🖥️ Rodar como aplicativo (.exe)

### Jeito rápido (já pronto)
O pacote **`EYE-GATE-Desktop-Windows.zip`** contém o app compilado:
1. Extrai a pasta toda em qualquer lugar
2. Roda **`EyeGate.exe`** → abre a janela do aplicativo (sem navegador)
3. SmartScreen: "Mais informações" → "Executar assim mesmo"

### Instalador bonito (automático via GitHub)
```bash
git tag v2.0.0 && git push origin v2.0.0
```
O GitHub Actions gera `EyeGate-Setup-2.0.0.exe` (instalador NSIS) e publica na aba **Releases** — que é o link que a landing usa.

### Rodar em desenvolvimento
```bash
npm install
npm start        # abre a janela do app
npm run dist     # gera instalador local (precisa Windows)
```

---

## 🌐 Publicar o site de apresentação
GitHub → **Settings → Pages** → Source: branch `main`, pasta **`/landing`**.
Ele fica em `https://vicentexk.github.io/EYE_GATE07-/` e o botão "Baixar" aponta pra aba Releases.

---

## 🚀 Antes de usar: migração no banco
1. https://supabase.com/dashboard → SQL Editor
2. Cola o conteúdo de `supabase/migration.sql` → **RUN**
3. Pronto: bloqueio de contas, promoção de admins e índices de performance ativos

---

## 🆚 O que mudou da v1

- **Design KEYHOLE completo** — baseado na logo, zero "cara de template"
- **App desktop de verdade** (Electron, janela própria)
- **Login**: olho gigante que segue o mouse, painel com cantos de mira
- **Dashboard**: módulos numerados (M.01…), gráficos em canvas próprio, marca d'água de fechadura
- **Monitor**: scanline animada, cantos de mira na câmera, 3 modos de performance, loop contínuo (até ~20x mais detecções que a v1), som e banner
- **Admin**: bloquear/desbloquear, promover/rebaixar, criar admin, excluir
- **Matcher**: média das 5 poses (mais preciso)
- **0 CDNs**: funciona mesmo sem internet (só o banco precisa de rede)

---

**Equipe:** Gian · Julio · Mozer · Raul · Richard · Vicente 💛
