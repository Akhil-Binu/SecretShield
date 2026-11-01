# SecretShield 1-Click Hugging Face Spaces Deployment Script
param (
    [string]$Username,
    [string]$Token,
    [string]$SpaceName = "secretshield"
)

Write-Host "🤗 SecretShield — Hugging Face Spaces Deployer" -ForegroundColor Cyan

if (-not $Username) {
    $Username = Read-Host "Enter your Hugging Face Username"
}

if (-not $Token) {
    $Token = Read-Host "Enter your Hugging Face Access Token (from https://huggingface.co/settings/tokens)"
}

$repoUrl = "https://${Username}:${Token}@huggingface.co/spaces/${Username}/${SpaceName}"

Write-Host "`n🚀 Initializing and pushing to Hugging Face Space: ${Username}/${SpaceName}..." -ForegroundColor Yellow

# Configure git remote
git remote remove space 2>$null
git remote add space $repoUrl

# Push master to Hugging Face main branch
git push space master:main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Successfully uploaded to Hugging Face Spaces!" -ForegroundColor Green
    Write-Host "🌐 Live URL: https://huggingface.co/spaces/${Username}/${SpaceName}" -ForegroundColor Cyan
    Write-Host "Building Docker container now... It will be live in 1-2 minutes!" -ForegroundColor White
} else {
    Write-Host "`n❌ Push failed. Please verify your token has 'Write' permissions at https://huggingface.co/settings/tokens" -ForegroundColor Red
}
