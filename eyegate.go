// ============================================================
// EYE GATE — Lançador Windows (.exe auto-contido)
//
// Este binário embute todo o aplicativo (HTML/CSS/JS/modelos de IA)
// e serve tudo em http://localhost:8135, abrindo o navegador padrão.
// A câmera funciona porque localhost é considerado contexto seguro.
// A internet só é necessária para o banco (Supabase).
//
// Build Windows (cross-compile a partir do Linux):
//   GOOS=windows GOARCH=amd64 go build -ldflags "-s -w" -o EyeGate.exe eyegate.go
// ============================================================
package main

import (
	"embed"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os/exec"
	"runtime"
)

//go:embed index.html face-api.min.js css js vendor models img landing
var conteudo embed.FS

const porta = "8135"
const url = "http://localhost:" + porta

func abrirNavegador(link string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", "", link)
	case "darwin":
		cmd = exec.Command("open", link)
	default:
		cmd = exec.Command("xdg-open", link)
	}
	_ = cmd.Start()
}

func main() {
	sub, err := fs.Sub(conteudo, ".")
	if err != nil {
		panic(err)
	}
	mux := http.NewServeMux()
	mux.Handle("/", http.FileServer(http.FS(sub)))

	ln, err := net.Listen("tcp", "127.0.0.1:"+porta)
	if err != nil {
		// porta ocupada = provavelmente já está rodando; só abre o navegador
		fmt.Println("Servidor já ativo em " + url + " — abrindo navegador…")
		abrirNavegador(url)
		return
	}

	fmt.Println("==============================================")
	fmt.Println("  👁  EYE GATE — Controle de acesso escolar")
	fmt.Println()
	fmt.Println("  App rodando em: " + url)
	fmt.Println("  Mantenha esta janela ABERTA enquanto usa.")
	fmt.Println("  Para encerrar, feche esta janela.")
	fmt.Println("==============================================")

	go abrirNavegador(url)
	_ = http.Serve(ln, mux)
}
