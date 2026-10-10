$root = 'f:/coding/bora codes/v1/official_bora_page'
$paths = @(
  "$root/app/components/charts/MomentChart.tsx"
  "$root/app/components/charts/TopPerformers.tsx"
  "$root/app/components/workflow/TopBarHeader.tsx"
  "$root/app/components/workflow/HeaderGUI.tsx"
)
$pat = 'font-family|font-cinzel|font-inter|font-sans|bora-text-display|bora-text-headline|bora-text-title|bora-font-display|bora-font-body'
foreach ($p in $paths) {
  Write-Host "=== $p ==="
  Select-String -Path $p -Pattern $pat | Select-Object Path, LineNumber, Line | Format-Table -AutoSize
}
