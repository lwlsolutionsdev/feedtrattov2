# Script de Deploy para Vercel
# PowerShell

Write-Host "🚀 FeedTratto - Deploy Helper" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

# Passo 1: Verificar se tem mudanças
Write-Host "📋 Verificando mudanças..." -ForegroundColor Yellow
git status

Write-Host ""
$continue = Read-Host "Continuar com o deploy? (s/n)"
if ($continue -ne "s") {
    Write-Host "❌ Deploy cancelado" -ForegroundColor Red
    exit 0
}

# Passo 2: Testar build local
Write-Host ""
Write-Host "🔨 Testando build local..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build falhou! Corrija os erros antes de fazer deploy." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build local OK!" -ForegroundColor Green

# Passo 3: Commit
Write-Host ""
$commitMsg = Read-Host "Mensagem do commit"
if ([string]::IsNullOrWhiteSpace($commitMsg)) {
    $commitMsg = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

Write-Host "📦 Fazendo commit..." -ForegroundColor Yellow
git add .
git commit -m "$commitMsg"

# Passo 4: Push
Write-Host ""
Write-Host "🚀 Enviando para GitHub..." -ForegroundColor Yellow
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deploy iniciado!" -ForegroundColor Green
    Write-Host "🌐 Vercel vai fazer o deploy automaticamente" -ForegroundColor Cyan
    Write-Host "📊 Acompanhe em: https://vercel.com/dashboard" -ForegroundColor Cyan
} else {
    Write-Host "❌ Erro ao fazer push" -ForegroundColor Red
    exit 1
}
