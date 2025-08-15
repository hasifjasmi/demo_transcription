# Demo Transcription Docker Services
# PowerShell script to manage Docker services

param(
    [Parameter(Position = 0)]
    [string]$Command = "help"
)

function Show-Help {
    Write-Host "Demo Transcription Docker Manager" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\docker-run.ps1 [COMMAND]" -ForegroundColor White
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Yellow
    Write-Host "  dev        Start development environment with hot reload" -ForegroundColor White
    Write-Host "  prod       Start production environment" -ForegroundColor White
    Write-Host "  build      Build all Docker images" -ForegroundColor White
    Write-Host "  stop       Stop all running services" -ForegroundColor White
    Write-Host "  clean      Stop services and remove containers/images" -ForegroundColor White
    Write-Host "  logs       Show logs from all services" -ForegroundColor White
    Write-Host "  help       Show this help message" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\docker-run.ps1 dev     # Start development environment" -ForegroundColor White
    Write-Host "  .\docker-run.ps1 prod    # Start production environment" -ForegroundColor White
    Write-Host "  .\docker-run.ps1 logs    # View service logs" -ForegroundColor White
}

switch ($Command.ToLower()) {
    "dev" {
        Write-Host "🚀 Starting development environment..." -ForegroundColor Green
        docker-compose -f docker-compose.dev.yml up --build
    }
    "prod" {
        Write-Host "🚀 Starting production environment..." -ForegroundColor Green
        docker-compose up --build -d
        Write-Host "✅ Services started:" -ForegroundColor Green
        Write-Host "   - Next.js Frontend: http://localhost:3000" -ForegroundColor White
        Write-Host "   - Python API: http://localhost:8000" -ForegroundColor White
        Write-Host "   - API Health Check: http://localhost:8000/health" -ForegroundColor White
    }
    "build" {
        Write-Host "🔨 Building Docker images..." -ForegroundColor Blue
        docker-compose build
    }
    "stop" {
        Write-Host "🛑 Stopping services..." -ForegroundColor Yellow
        docker-compose down
        docker-compose -f docker-compose.dev.yml down
    }
    "clean" {
        Write-Host "🧹 Cleaning up containers and images..." -ForegroundColor Red
        docker-compose down --rmi all --volumes --remove-orphans
        docker-compose -f docker-compose.dev.yml down --rmi all --volumes --remove-orphans
    }
    "logs" {
        Write-Host "📋 Showing service logs..." -ForegroundColor Cyan
        docker-compose logs -f
    }
    "help" {
        Show-Help
    }
    default {
        Write-Host "❌ Unknown command: $Command" -ForegroundColor Red
        Write-Host ""
        Show-Help
        exit 1
    }
}
