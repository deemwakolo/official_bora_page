# BORA typography audit backup script (robust, preserves relative paths)
$ErrorActionPreference = 'Stop'

$root = 'f:/coding/bora codes/v1/official_bora_page'
$backupRoot = 'F:/coding/bora codes/v1/_backups'
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$dir = Join-Path $backupRoot ('bora-typography-audit-' + $ts)

# Create the backup root directory
New-Item -ItemType Directory -Path $dir -Force | Out-Null
if (-not (Test-Path $dir)) {
  Write-Host ('FATAL: could not create backup dir ' + $dir)
  exit 1
}

$files = @(
  'app/components/components-themes/tokens/boraTokenSpec.ts',
  'app/components/components-themes/tokens/applyBoraTokens.ts',
  'app/globals.css',
  'app/components/components-themes/MasterGUI.tsx',
  'app/components/workflow/TopBarHeader.tsx',
  'app/components/workflow/HeaderGUI.tsx',
  'app/components/charts/MomentChart.tsx',
  'app/components/charts/TopPerformers.tsx',
  'app/components/charts/momentChartsCache.ts',
  'app/components/charts/MomentGUI.tsx'
)

foreach ($f in $files) {
  $src = Join-Path $root $f
  $dst = Join-Path $dir $f
  if (Test-Path $src) {
    # Create the destination subdirectory tree before copying
    $dstParent = Split-Path $dst -Parent
    if (-not (Test-Path $dstParent)) {
      New-Item -ItemType Directory -Path $dstParent -Force | Out-Null
    }
    Copy-Item -LiteralPath $src -Destination $dst -Force
    Write-Host ('OK  ' + $f + '  ->  ' + $dst)
  } else {
    Write-Host ('MISS' + $f)
  }
}
Write-Host ('Backup root: ' + $dir)
