# Docker Setup for Demo Transcription

This project includes Docker configuration to run both the Next.js frontend and Python FastAPI backend in containers.

## 🏗️ Architecture

- **Frontend**: Next.js application (port 3000)
- **Backend**: Python FastAPI with real-time transcription (port 8000)
- **Network**: Both services communicate via Docker network

## 📋 Prerequisites

- Docker Desktop installed and running
- Docker Compose v3.8 or higher

## 🚀 Quick Start

### Option 1: Using PowerShell Script (Windows)
```powershell
# Development environment with hot reload
.\docker-run.ps1 dev

# Production environment
.\docker-run.ps1 prod

# View logs
.\docker-run.ps1 logs

# Stop services
.\docker-run.ps1 stop
```

### Option 2: Using Bash Script (Linux/macOS)
```bash
# Make script executable
chmod +x docker-run.sh

# Development environment
./docker-run.sh dev

# Production environment
./docker-run.sh prod
```

### Option 3: Manual Docker Compose

#### Development Environment
```bash
# Start with hot reload
docker-compose -f docker-compose.dev.yml up --build

# Run in background
docker-compose -f docker-compose.dev.yml up --build -d
```

#### Production Environment
```bash
# Start production services
docker-compose up --build

# Run in background
docker-compose up --build -d
```

## 🔧 Available Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js application |
| API | http://localhost:8000 | FastAPI backend |
| Health Check | http://localhost:8000/health | API health status |
| Transcription | http://localhost:8000/transcribe | Real-time transcription endpoint |

## 📁 Docker Files

- `Dockerfile` - Next.js frontend container
- `Dockerfile.python` - Python API container
- `docker-compose.yml` - Production environment
- `docker-compose.dev.yml` - Development environment
- `requirements.txt` - Python dependencies

## 🛠️ Development

### Hot Reload
The development environment supports hot reload for both services:
- Next.js: File changes trigger automatic rebuilds
- Python: uvicorn reload mode watches for code changes

### Volume Mounts
Development containers mount source code as volumes:
```yaml
volumes:
  - .:/app
  - /app/node_modules  # Exclude node_modules
```

## 🔊 Audio Device Access

The Python container requires audio device access for microphone input:

### Linux/macOS
```yaml
volumes:
  - /dev/snd:/dev/snd
devices:
  - /dev/snd
privileged: true
```

### Windows
Audio device access may require additional configuration or running the Python service outside Docker for development.

## 🧹 Cleanup

```bash
# Stop all services
docker-compose down
docker-compose -f docker-compose.dev.yml down

# Remove containers, images, and volumes
docker-compose down --rmi all --volumes --remove-orphans

# Or use the script
.\docker-run.ps1 clean
```

## 🐛 Troubleshooting

### Port Conflicts
If ports 3000 or 8000 are already in use:
```bash
# Check what's using the ports
netstat -an | findstr :3000
netstat -an | findstr :8000

# Stop existing services or modify docker-compose.yml ports
```

### Audio Issues
If microphone access fails:
1. Ensure Docker has audio permissions
2. For Windows development, consider running Python service locally
3. Check device index in `server.py` (DEVICE_INDEX = 1)

### Build Failures
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

## 📊 Monitoring

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f nextjs
docker-compose logs -f python-api
```

### Check Container Status
```bash
docker-compose ps
```

## 🔒 Environment Variables

### Next.js Environment
- `NODE_ENV=production`
- `NEXT_TELEMETRY_DISABLED=1`

### Python Environment
- `PYTHONUNBUFFERED=1`

### Custom Variables
Add environment variables to docker-compose.yml:
```yaml
environment:
  - API_KEY=your_api_key
  - DEBUG=true
```

## 🚢 Production Deployment

For production deployment:

1. Set environment variables
2. Use production docker-compose.yml
3. Configure reverse proxy (nginx)
4. Set up SSL certificates
5. Configure monitoring

Example nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
    }

    location /api/ {
        proxy_pass http://localhost:8000/;
    }
}
```
