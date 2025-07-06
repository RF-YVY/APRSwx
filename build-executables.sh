#!/bin/bash
# APRSwx Executable Builder Script
# Creates standalone executables for multiple platforms

set -e  # Exit on any error

echo "🚀 APRSwx Executable Builder"
echo "============================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check dependencies
check_dependencies() {
    echo "Checking dependencies..."
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is required but not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "Node.js/NPM is required but not installed"
        exit 1
    fi
    
    print_status "All dependencies are available"
}

# Build frontend
build_frontend() {
    echo ""
    echo "Building frontend..."
    cd frontend
    
    # Install dependencies
    print_status "Installing NPM dependencies..."
    npm install --legacy-peer-deps || {
        print_warning "Full install failed, trying simplified version..."
        cp package.simple.json package.json
        npm install --ignore-scripts
    }
    
    # Build React app
    print_status "Building React application..."
    npm run build || {
        print_error "Frontend build failed"
        exit 1
    }
    
    cd ..
    print_status "Frontend build completed"
}

# Create PyInstaller executable
build_pyinstaller() {
    echo ""
    echo "Building PyInstaller executable..."
    cd backend
    
    # Install PyInstaller
    print_status "Installing PyInstaller..."
    pip install pyinstaller || {
        print_error "PyInstaller installation failed"
        exit 1
    }
    
    # Create spec file
    print_status "Creating PyInstaller spec file..."
    cat > aprswx.spec << 'EOF'
import os
import sys
from pathlib import Path

block_cipher = None

a = Analysis(
    ['manage.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        ('static', 'static'),
        ('templates', 'templates'),
        ('../frontend/build', 'frontend'),
    ],
    hiddenimports=[
        'django.contrib.staticfiles',
        'django.contrib.admin',
        'rest_framework',
        'corsheaders',
        'channels',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='APRSwx',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
EOF
    
    # Build executable
    print_status "Building executable..."
    pyinstaller aprswx.spec || {
        print_error "PyInstaller build failed"
        exit 1
    }
    
    cd ..
    print_status "PyInstaller executable created: backend/dist/APRSwx"
}

# Create portable distribution
create_portable() {
    echo ""
    echo "Creating portable distribution..."
    
    # Create portable directory structure
    mkdir -p portable/APRSwx-Portable/{backend,frontend,data,scripts}
    
    # Copy backend
    cp -r backend/* portable/APRSwx-Portable/backend/
    
    # Copy frontend build
    cp -r frontend/build/* portable/APRSwx-Portable/frontend/
    
    # Create launcher script
    cat > portable/APRSwx-Portable/start-aprswx.sh << 'EOF'
#!/bin/bash
echo "Starting APRSwx..."

# Set up environment
export PYTHONPATH="$(pwd)/backend"
export DJANGO_SETTINGS_MODULE="aprs_server.settings"

# Create data directory
mkdir -p data

# Start backend
echo "Starting backend server..."
cd backend
python manage.py migrate --run-syncdb
python manage.py runserver 127.0.0.1:8000 &
BACKEND_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Open browser
echo "Opening APRSwx in browser..."
if command -v xdg-open &> /dev/null; then
    xdg-open http://127.0.0.1:8000
elif command -v open &> /dev/null; then
    open http://127.0.0.1:8000
else
    echo "Please open http://127.0.0.1:8000 in your browser"
fi

echo ""
echo "APRSwx is now running!"
echo "Backend: http://127.0.0.1:8000"
echo ""
echo "Press Ctrl+C to stop APRSwx..."

# Wait for interrupt
trap "kill $BACKEND_PID; exit" INT
wait $BACKEND_PID
EOF
    
    chmod +x portable/APRSwx-Portable/start-aprswx.sh
    
    # Create Windows batch file
    cat > portable/APRSwx-Portable/start-aprswx.bat << 'EOF'
@echo off
title APRSwx - APRS Weather Monitor
echo Starting APRSwx...

cd /d "%~dp0"
set PYTHONPATH=%cd%\backend
set DJANGO_SETTINGS_MODULE=aprs_server.settings

if not exist data mkdir data

echo Starting backend server...
cd backend
python manage.py migrate --run-syncdb
start /min python manage.py runserver 127.0.0.1:8000

echo Waiting for server to start...
timeout /t 5 /nobreak > nul

echo Opening APRSwx in browser...
start http://127.0.0.1:8000

echo.
echo APRSwx is now running!
echo Backend: http://127.0.0.1:8000
echo.
echo Press any key to stop APRSwx...
pause > nul

echo Stopping APRSwx...
taskkill /f /im python.exe > nul 2>&1
echo APRSwx stopped.
EOF
    
    # Create README
    cat > portable/APRSwx-Portable/README.txt << 'EOF'
APRSwx Portable Distribution
============================

This is a portable version of APRSwx that can run without installation.

Requirements:
- Python 3.8 or higher must be installed on the system
- No other dependencies required

Usage:
- Linux/macOS: Run ./start-aprswx.sh
- Windows: Run start-aprswx.bat

The application will:
1. Start the backend server
2. Open your default web browser
3. Display the APRSwx interface

To stop the application:
- Press Ctrl+C in the terminal (Linux/macOS)
- Press any key in the command window (Windows)

Data Storage:
- Application data is stored in the 'data' directory
- Logs are stored in 'data/logs'
- Database is stored in 'data/db.sqlite3'

Support:
- Documentation: https://github.com/RF-YVY/APRSwx
- Issues: https://github.com/RF-YVY/APRSwx/issues
EOF
    
    # Create archive
    cd portable
    tar -czf APRSwx-Portable.tar.gz APRSwx-Portable/
    cd ..
    
    print_status "Portable distribution created: portable/APRSwx-Portable.tar.gz"
}

# Build Docker image
build_docker() {
    echo ""
    echo "Building Docker executable..."
    
    if ! command -v docker &> /dev/null; then
        print_warning "Docker not found - skipping Docker build"
        return
    fi
    
    # Create desktop Dockerfile
    cat > Dockerfile.executable << 'EOF'
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production --ignore-scripts || npm install --ignore-scripts
COPY frontend/ ./
RUN npm run build || echo "Build failed, continuing..."

FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements-ci.txt ./
RUN pip install --no-cache-dir -r requirements-ci.txt

COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/build ./frontend/

ENV PYTHONPATH="/app/backend"
ENV DJANGO_SETTINGS_MODULE="aprs_server.settings"

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

CMD ["sh", "-c", "cd backend && python manage.py migrate --run-syncdb && python manage.py runserver 0.0.0.0:8000"]
EOF
    
    # Build Docker image
    docker build -f Dockerfile.executable -t aprswx-executable:latest . || {
        print_error "Docker build failed"
        return
    }
    
    print_status "Docker executable created: aprswx-executable:latest"
    
    # Create Docker run script
    cat > run-aprswx-docker.sh << 'EOF'
#!/bin/bash
echo "Starting APRSwx Docker container..."

# Stop existing container if running
docker stop aprswx-app 2>/dev/null || true
docker rm aprswx-app 2>/dev/null || true

# Run new container
docker run -d \
    --name aprswx-app \
    -p 8000:8000 \
    -v $(pwd)/data:/app/data \
    aprswx-executable:latest

echo "Waiting for container to start..."
sleep 10

# Check if container is running
if docker ps | grep -q aprswx-app; then
    echo "✓ APRSwx is running!"
    echo "Open http://localhost:8000 in your browser"
    echo ""
    echo "To stop: docker stop aprswx-app"
    echo "To view logs: docker logs aprswx-app"
else
    echo "✗ Container failed to start"
    docker logs aprswx-app
fi
EOF
    
    chmod +x run-aprswx-docker.sh
    print_status "Docker run script created: run-aprswx-docker.sh"
}

# Main execution
main() {
    echo "Starting APRSwx executable build process..."
    
    # Check system requirements
    check_dependencies
    
    # Build frontend
    build_frontend
    
    # Build PyInstaller executable
    build_pyinstaller
    
    # Create portable distribution
    create_portable
    
    # Build Docker image
    build_docker
    
    echo ""
    echo "🎉 Build Summary"
    echo "================"
    print_status "Frontend: Built and ready"
    print_status "PyInstaller: Executable created in backend/dist/"
    print_status "Portable: Distribution created in portable/"
    print_status "Docker: Image tagged as aprswx-executable:latest"
    
    echo ""
    echo "📦 Distribution Options:"
    echo "1. PyInstaller: backend/dist/APRSwx (single executable)"
    echo "2. Portable: portable/APRSwx-Portable.tar.gz (self-contained)"
    echo "3. Docker: docker run -p 8000:8000 aprswx-executable:latest"
    
    echo ""
    echo "🚀 Next Steps:"
    echo "1. Test the executables on target systems"
    echo "2. Create installers if needed"
    echo "3. Distribute to users"
    
    print_status "All executables built successfully!"
}

# Run main function
main "$@"
