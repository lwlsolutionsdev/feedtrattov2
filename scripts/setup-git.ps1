# Script para configurar Git apenas no feedtratto_v2
# PowerShell

Write-Host "🔧 FeedTratto v2 - Setup Git" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
$currentPath = Get-Location
if (-not ($currentPath.Path -like "*feedtratto_v2")) {
    Write-Host "❌ Erro: Execute este script na pasta feedtratto_v2!" -ForegroundColor Red
    Write-Host "📂 Caminho atual: $currentPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Execute:" -ForegroundColor Yellow
    Write-Host 'cd "C:\Users\Leonardo Aguilar\Documents\Empresas\Microserviço de confinamento\confinamento\feedtratto_v2"' -ForegroundColor White
    exit 1
}

# Verificar se já tem Git
if (Test-Path ".git") {
    Write-Host "✅ Git já está inicializado!" -ForegroundColor Green
    git status
    exit 0
}

# Inicializar Git
Write-Host "📦 Inicializando Git..." -ForegroundColor Yellow
git init

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao inicializar Git" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Git inicializado!" -ForegroundColor Green
Write-Host ""

# Adicionar arquivos
Write-Host "📋 Adicionando arquivos..." -ForegroundColor Yellow
git add .

# Commit inicial
Write-Host "💾 Fazendo commit inicial..." -ForegroundColor Yellow
git commit -m "Initial commit - FeedTratto v2"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer commit" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Commit inicial criado!" -ForegroundColor Green
Write-Host ""

# Instruções para GitHub
Write-Host "🎯 Próximos passos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Crie um repositório no GitHub:" -ForegroundColor Yellow
Write-Host "   https://github.com/new" -ForegroundColor White
Write-Host ""
Write-Host "2. Nome sugerido: feedtratto-v2" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Depois, execute:" -ForegroundColor Yellow
Write-Host '   git remote add origin https://github.com/SEU-USUARIO/feedtratto-v2.git' -ForegroundColor White
Write-Host '   git branch -M main' -ForegroundColor White
Write-Host '   git push -u origin main' -ForegroundColor White
Write-Host ""
Write-Host "✅ Setup concluído!" -ForegroundColor Green
