!include "nsDialogs.nsh"


; =========================================================
; 快捷方式选择变量
; =========================================================

Var DesktopShortcutCheckbox
Var StartMenuShortcutCheckbox


; =========================================================
; 在“选择安装目录”之后显示自定义页面
; =========================================================

!macro customPageAfterChangeDir

  Page custom ShortcutPageCreate ShortcutPageLeave

!macroend


; =========================================================
; 创建自定义页面
; =========================================================

Function ShortcutPageCreate

  nsDialogs::Create 1018
  Pop $0

  ${If} $0 == error
    Abort
  ${EndIf}


  ; 页面标题
  ${NSD_CreateLabel} 0 0 100% 20u \
    "请选择要创建的快捷方式："
  Pop $0


  ; -------------------------------------------------------
  ; 桌面快捷方式
  ; -------------------------------------------------------

  ${NSD_CreateCheckbox} 0 35u 100% 14u \
    "创建桌面快捷方式"
  Pop $DesktopShortcutCheckbox

  ; 默认勾选
  ${NSD_Check} $DesktopShortcutCheckbox


  ; -------------------------------------------------------
  ; 开始菜单快捷方式
  ; -------------------------------------------------------

  ${NSD_CreateCheckbox} 0 60u 100% 14u \
    "创建开始菜单快捷方式"
  Pop $StartMenuShortcutCheckbox

  ; 默认勾选
  ${NSD_Check} $StartMenuShortcutCheckbox


  nsDialogs::Show

FunctionEnd


; =========================================================
; 离开页面时保存用户选择
; =========================================================

Function ShortcutPageLeave

  ; 桌面快捷方式
  ${NSD_GetState} $DesktopShortcutCheckbox $0

  ${If} $0 == ${BST_CHECKED}
    StrCpy $DesktopShortcutCheckbox "1"
  ${Else}
    StrCpy $DesktopShortcutCheckbox "0"
  ${EndIf}


  ; 开始菜单快捷方式
  ${NSD_GetState} $StartMenuShortcutCheckbox $0

  ${If} $0 == ${BST_CHECKED}
    StrCpy $StartMenuShortcutCheckbox "1"
  ${Else}
    StrCpy $StartMenuShortcutCheckbox "0"
  ${EndIf}

FunctionEnd


; =========================================================
; 正式安装完成时创建快捷方式
; =========================================================

!macro customInstall


  ; -------------------------------------------------------
  ; 桌面快捷方式
  ; -------------------------------------------------------

  ${If} $DesktopShortcutCheckbox == "1"

    CreateShortCut \
      "$DESKTOP\${SHORTCUT_NAME}.lnk" \
      "$INSTDIR\${APP_EXECUTABLE_FILENAME}"

  ${EndIf}


  ; -------------------------------------------------------
  ; 开始菜单快捷方式
  ; -------------------------------------------------------

  ${If} $StartMenuShortcutCheckbox == "1"

    CreateDirectory "$SMPROGRAMS\${SHORTCUT_NAME}"

    CreateShortCut \
      "$SMPROGRAMS\${SHORTCUT_NAME}\${SHORTCUT_NAME}.lnk" \
      "$INSTDIR\${APP_EXECUTABLE_FILENAME}"

  ${EndIf}


!macroend














; =========================================================
; 卸载：是否保留 data 文件夹
; 默认勾选 = 保留 data
; =========================================================

Var KeepDataCheckbox


; =========================================================
; 在标准卸载欢迎页之后增加 data 选项页
; =========================================================

!macro customUnWelcomePage

  !insertmacro MUI_UNPAGE_WELCOME

  UninstPage custom un.UninstallOptionsPageCreate un.UninstallOptionsPageLeave

!macroend


; =========================================================
; 创建卸载选项页
; =========================================================

Function un.UninstallOptionsPageCreate

  nsDialogs::Create 1018
  Pop $0

  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 20u \
    "请选择卸载后如何处理 data 文件夹："
  Pop $0

  ${NSD_CreateCheckbox} 0 35u 100% 14u \
    "保留 data 文件夹"
  Pop $KeepDataCheckbox

  ; 默认勾选
  ${NSD_Check} $KeepDataCheckbox

  nsDialogs::Show

FunctionEnd


; =========================================================
; 离开卸载选项页
; =========================================================

Function un.UninstallOptionsPageLeave

  ${NSD_GetState} $KeepDataCheckbox $0

  ${If} $0 == ${BST_CHECKED}
    StrCpy $KeepDataCheckbox "1"
  ${Else}
    StrCpy $KeepDataCheckbox "0"
  ${EndIf}

FunctionEnd


; =========================================================
; 自定义卸载文件删除
; =========================================================

!macro customRemoveFiles

  ; -------------------------------------------------------
  ; 用户取消“保留 data”
  ; 直接删除 data
  ; -------------------------------------------------------

  ${If} $KeepDataCheckbox == "0"

    RMDir /r "$INSTDIR\data"

  ${EndIf}


  ; -------------------------------------------------------
  ; 删除 Golden Apple 安装目录中除 data 外的所有内容
  ; -------------------------------------------------------

  FindFirst $0 $1 "$INSTDIR\*.*"

  loop:

    StrCmp $1 "" done

    StrCmp $1 "." next
    StrCmp $1 ".." next
    StrCmp $1 "data" next

    IfFileExists "$INSTDIR\$1\*.*" 0 deleteFile

    ; 是目录
    RMDir /r "$INSTDIR\$1"

    Goto next


  deleteFile:

    Delete "$INSTDIR\$1"


  next:

    FindNext $0 $1
    Goto loop


  done:

    FindClose $0

    ; -----------------------------------------------------
    ; 删除空的安装目录
    ; 如果 data 被保留，这里会因为非空而失败，
    ; 正好保留 Golden Apple\data\
    ; -----------------------------------------------------

    RMDir "$INSTDIR"

!macroend
