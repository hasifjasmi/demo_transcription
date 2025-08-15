#!/bin/bash

# Demo Transcription Docker Services
# This script helps you run the transcription application using Docker

show_help() {
    echo "Demo Transcription Docker Manager"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev        Start development environment with hot reload"
    echo "  prod       Start production environment"
    echo "  build      Build all Docker images"
    echo "  stop       Stop all running services"
    echo "  clean      Stop services and remove containers/images"
    echo "  logs       Show logs from all services"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev     # Start development environment"
    echo "  $0 prod    # Start production environment"
    echo "  $0 logs    # View service logs"
}

case "$1" in
    "dev")
        echo "🚀 Starting development environment..."
        docker-compose -f docker-compose.dev.yml up --build
        ;;
    "prod")
        echo "🚀 Starting production environment..."
        docker-compose up --build -d
        echo "✅ Services started:"
        echo "   - Next.js Frontend: http://localhost:3000"
        echo "   - Python API: http://localhost:8000"
        echo "   - API Health Check: http://localhost:8000/health"
        ;;
    "build")
        echo "🔨 Building Docker images..."
        docker-compose build
        ;;
    "stop")
        echo "🛑 Stopping services..."
        docker-compose down
        docker-compose -f docker-compose.dev.yml down
        ;;
    "clean")
        echo "🧹 Cleaning up containers and images..."
        docker-compose down --rmi all --volumes --remove-orphans
        docker-compose -f docker-compose.dev.yml down --rmi all --volumes --remove-orphans
        ;;
    "logs")
        echo "📋 Showing service logs..."
        docker-compose logs -f
        ;;
    "help"|"")
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
