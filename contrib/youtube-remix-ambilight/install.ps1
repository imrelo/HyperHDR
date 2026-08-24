<#
.SYNOPSIS
    Chuan bi cai YouTube Remix Ambilight vao Edge/Chrome.

.DESCRIPTION
    Chep extension ra mot thu muc CO DINH roi mo trang extensions.

    Vi sao can chep ra cho co dinh: extension nap kieu "Load unpacked" tro
    THANG vao thu muc nguon. Neu thu muc do bi xoa, doi ten hay di chuyen —
    vi du khi ban `git clean`, doi nhanh, hay xoa ban sao repo — thi extension
    bi vo hieu hoa im lang. Chep sang %LOCALAPPDATA% thi no doc lap voi repo.

    LUU Y: script nay KHONG tu cai duoc extension vao trinh duyet.
    Xem phan "Vi sao khong tu cai duoc" trong README.md — do la gioi han cua
    Chrome/Edge chu khong phai cua script.

.PARAMETER Dest
    Thu muc dich. Mac dinh: %LOCALAPPDATA%\YouTubeRemixAmbilight

.PARAMETER Browser
    edge (mac dinh) hoac chrome.

.EXAMPLE
    .\install.ps1
    .\install.ps1 -Browser chrome
#>

[CmdletBinding()]
param(
    [string] $Dest = (Join-Path $env:LOCALAPPDATA 'YouTubeRemixAmbilight'),
    [ValidateSet('edge', 'chrome')]
    [string] $Browser = 'edge'
)

$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot

# --- kiem tra nguon -------------------------------------------------------
$required = @('manifest.json', 'background.js', 'content.js')
foreach ($f in $required) {
    if (-not (Test-Path (Join-Path $src $f))) {
        throw "Thieu file '$f' trong '$src'. Chay script tu trong thu muc extension."
    }
}

# --- chep ra thu muc co dinh ----------------------------------------------
if (-not (Test-Path $Dest)) {
    New-Item -ItemType Directory -Path $Dest -Force | Out-Null
}
foreach ($f in $required) {
    Copy-Item (Join-Path $src $f) -Destination $Dest -Force
}
Write-Host "Da chep extension sang:" -ForegroundColor Green
Write-Host "  $Dest"

# --- canh bao neu HyperHDR chua chay --------------------------------------
try {
    $body = '{"command":"serverinfo"}'
    $resp = Invoke-RestMethod -Uri 'http://localhost:8090/json-rpc' -Method Post -Body $body -TimeoutSec 3
    $names = @($resp.info.instance | ForEach-Object { "$($_.instance)=$($_.friendly_name)" })
    Write-Host "HyperHDR dang chay. Instance: $($names -join ', ')" -ForegroundColor Green
    Write-Host "  -> Kiem tra TARGET_INSTANCES trong background.js co khop khong."
}
catch {
    Write-Host "Khong lien lac duoc HyperHDR o localhost:8090." -ForegroundColor Yellow
    Write-Host "  Extension van cai duoc, nhung den chi chay khi HyperHDR bat."
}

# --- huong dan buoc cuoi (phai lam tay) -----------------------------------
$page = if ($Browser -eq 'chrome') { 'chrome://extensions' } else { 'edge://extensions' }

Write-Host ""
Write-Host "Con lai 3 buoc phai lam tay trong trinh duyet:" -ForegroundColor Cyan
Write-Host "  1. Bat 'Developer mode' (goc tren ben phai)"
Write-Host "  2. Bam 'Load unpacked'"
Write-Host "  3. Chon thu muc:  $Dest"
Write-Host ""
Write-Host "Xong la chay ngay — extension mac dinh BAT, khong can bam icon."
Write-Host ""

$exe = if ($Browser -eq 'chrome') { 'chrome.exe' } else { 'msedge.exe' }
try {
    Start-Process $exe $page
    Write-Host "Da mo $page" -ForegroundColor Green
}
catch {
    Write-Host "Khong mo duoc $exe tu dong. Tu mo $page nhe." -ForegroundColor Yellow
}

Set-Clipboard -Value $Dest
Write-Host "(Duong dan da duoc chep vao clipboard, dan thang vao o chon thu muc)" -ForegroundColor DarkGray
