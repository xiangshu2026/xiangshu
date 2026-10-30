# 在桌面创建「象数工坊」快捷方式（可重复执行）
# 用法： powershell -File create-shortcut.ps1 [-Icon assets\xiangshu.ico]
param([string]$Icon = 'assets\xiangshu.ico')
$ErrorActionPreference = 'Stop'
$proj = Split-Path -Parent $PSScriptRoot          # 项目根目录
$target = Join-Path $proj 'index.html'
$ico = Join-Path $proj $Icon
if (-not (Test-Path $target)) { throw "找不到 $target" }

# 复制到纯 ASCII 路径，快捷方式引用该副本（规避图标缓存键与非 ASCII 路径问题）
$icoSrc = Join-Path $proj $Icon
if (-not (Test-Path $icoSrc)) { throw "找不到图标文件 $icoSrc" }
$icoDir = Join-Path $env:LOCALAPPDATA 'XiangShu'
New-Item -ItemType Directory -Force -Path $icoDir | Out-Null
$ico = Join-Path $icoDir 'app.ico'
Copy-Item $icoSrc $ico -Force

$desktop = [Environment]::GetFolderPath('Desktop')
$lnkPath = Join-Path $desktop '象数工坊.lnk'

$sh = New-Object -ComObject WScript.Shell
$lnk = $sh.CreateShortcut($lnkPath)
$lnk.TargetPath       = $target
$lnk.WorkingDirectory = $proj
$lnk.Description      = '象数工坊 · 生辰八字 / 梅花易数 / 六爻纳甲 / 小六壬'
if (Test-Path $ico) { $lnk.IconLocation = "$ico,0" }
$lnk.Save()
Write-Output "已创建: $lnkPath"
