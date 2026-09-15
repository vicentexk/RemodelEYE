; ============================================================
; eye gate — Instalador Windows (NSIS)
; Instala em Program Files, cria atalhos (menu iniciar + área
; de trabalho) e desinstalador no Painel de Controle.
; Compilar:  makensis eye-gate-installer.nsi
; ============================================================

Unicode true
ManifestDPIAware true

!define APPNAME "eye gate"
!define COMPANY "Equipe eye gate"
!define VERSION "2.0.0"
!define EXEC "EyeGate.exe"

Name "${APPNAME} ${VERSION}"
OutFile "EyeGate-Setup-${VERSION}.exe"
InstallDir "$PROGRAMFILES64\${APPNAME}"
InstallDirRegKey HKLM "Software\${APPNAME}" "InstallDir"
RequestExecutionLevel admin
SetCompressor /SOLID lzma

; ícone do instalador (usa a logo do projeto, se existir)
!ifinc FileExists "..\img\logo.ico"
!define MUI_ICON "..\img\logo.ico"
!define MUI_UNICON "..\img\logo.ico"
!endif

; ---------- páginas ----------
Page directory
Page instfiles
UninstPage uninstConfirm
UninstPage instfiles

; ---------- instalação ----------
Section "Instalar"
  SetOutPath "$INSTDIR"

  ; remove instalador antigo se existir
  Delete "$INSTDIR\${EXEC}"

  ; copia TUDO da pasta do app (Electron + recursos)
  File /r "app\*.*"

  ; chave de desinstalação (Painel de Controle)
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" \
     "DisplayName" "${APPNAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" \
     "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" \
     "Publisher" "${COMPANY}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" \
     "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" \
     "DisplayIcon" "$INSTDIR\${EXEC}"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" \
     "EstimatedSize" 230000

  ; atalhos
  CreateDirectory "$SMPROGRAMS\${APPNAME}"
  CreateShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\${EXEC}"
  CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\${EXEC}"

  ; desinstalador
  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

; ---------- executa após instalar ----------
Function .onInstSuccess
  MessageBox MB_YESNO|MB_ICONQUESTION "${APPNAME} instalado com sucesso!$\n$\nAbrir agora?" IDYES abre IDNO fecha
  abre:
    Exec "$INSTDIR\${EXEC}"
    Goto fecha
  fecha:
FunctionEnd

; ---------- desinstalação ----------
Section "Uninstall"
  ; mata o app se estiver rodando
  nsExec::Exec 'taskkill /f /im ${EXEC}'

  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"

  Delete "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk"
  RMDir "$SMPROGRAMS\${APPNAME}"
  Delete "$DESKTOP\${APPNAME}.lnk"

  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
  DeleteRegKey HKLM "Software\${APPNAME}"
SectionEnd
