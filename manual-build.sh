#!/bin/bash

# Manual Build and Package Script for APRSwx
# Use this script if GitHub Actions fails

echo "🚀 APRSwx Manual Build and Package Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
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
echo "Checking dependencies..."

if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is required but not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "Node.js/NPM is required but not installed"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    print_warning "Docker not found - Docker build will be skipped"
    DOCKER_AVAILABLE=false
else
    DOCKER_AVAILABLE=true
fi

print_status "Dependencies checked"

# Build backend
echo ""
echo "Building backend..."
cd backend

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install -r requirements-ci.txt || {
    print_warning "Full requirements failed, trying minimal install..."
    pip install Django djangorestframework django-cors-headers requests || {
        print_error "Could not install minimal Python dependencies"
        exit 1
    }
}

# Test Django
python -c "import django; print('Django version:', django.VERSION)" || {
    print_error "Django import failed"
    exit 1
}

print_status "Backend build completed"

# Build frontend
echo ""
echo "Building frontend..."
cd ../frontend

# Install NPM dependencies
print_status "Installing NPM dependencies..."
npm ci --ignore-scripts || {
    print_warning "NPM install with scripts failed, trying without scripts..."
    npm install --ignore-scripts || {
        print_error "Could not install NPM dependencies"
        exit 1
    }
}

# Build frontend
print_status "Building frontend..."
npm run build || {
    print_error "Frontend build failed"
    exit 1
}

print_status "Frontend build completed"

# Build Docker image
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo ""
    echo "Building Docker image..."
    cd ..
    
    # Try main Dockerfile first
    docker build -t aprswx:latest . || {
        print_warning "Main Docker build failed, trying simplified version..."
        docker build -f Dockerfile.simple -t aprswx:latest . || {
            print_error "Docker build failed"
            exit 1
        }
    }
    
    print_status "Docker image built successfully"
    
    # Optional: Tag for GitHub Packages
    read -p "Do you want to tag for GitHub Packages? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker tag aprswx:latest ghcr.io/rf-yvy/aprswx:latest
        print_status "Docker image tagged for GitHub Packages"
        echo "To push: docker push ghcr.io/rf-yvy/aprswx:latest"
    fi
else
    print_warning "Docker not available - skipping Docker build"
fi

# Create distribution package
echo ""
echo "Creating distribution package..."
cd ..

# Create dist directory
mkdir -p dist

# Copy important files
cp -r backend dist/
cp -r frontend dist/
cp docker-compose.yml dist/
cp install.sh dist/
cp README.md dist/
cp DISTRIBUTION_README.md dist/

# Create archive
tar -czf dist/aprswx-manual-build.tar.gz -C dist .

print_status "Distribution package created: dist/aprswx-manual-build.tar.gz"

# Summary
echo ""
echo "🎉 Manual Build Summary"
echo "======================"
print_status "Backend: Python dependencies installed and tested"
print_status "Frontend: React application built successfully"

if [ "$DOCKER_AVAILABLE" = true ]; then
    print_status "Docker: Container image built and ready"
else
    print_warning "Docker: Skipped (not available)"
fi

print_status "Distribution: Package created in dist/ directory"

echo ""
echo "📦 Installation Options:"
echo "1. Extract dist/aprswx-manual-build.tar.gz and run install.sh"
echo "2. Use docker-compose up -d (if Docker available)"
echo "3. Run backend and frontend separately for development"

echo ""
echo "🔧 Manual Commands:"
echo "Backend: cd backend && python manage.py runserver"
echo "Frontend: cd frontend && npm start"
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "Docker: docker run -p 8000:8000 aprswx:latest"
fi

echo ""
print_status "Manual build process completed successfully!"
