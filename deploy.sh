#!/bin/bash
# APRSwx Production Deployment Script

echo "🚀 APRSwx Production Deployment"
echo "================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo "⚠️  Please don't run this script as root"
  exit 1
fi

# Check system requirements
echo "🔍 Checking system requirements..."

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    echo "✅ Python $PYTHON_VERSION found"
else
    echo "❌ Python 3 not found. Please install Python 3.8+"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js $NODE_VERSION found"
else
    echo "❌ Node.js not found. Please install Node.js 16+"
    exit 1
fi

# Check Git
if command -v git &> /dev/null; then
    echo "✅ Git found"
else
    echo "❌ Git not found. Please install Git"
    exit 1
fi

# Clone repository if not exists
if [ ! -d "APRSwx" ]; then
    echo "📥 Cloning APRSwx repository..."
    git clone https://github.com/RF-YVY/APRSwx.git
    cd APRSwx
else
    echo "📁 APRSwx directory exists, updating..."
    cd APRSwx
    git pull origin main
fi

# Setup Python virtual environment
echo "🐍 Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
pip install -r requirements.txt

# Database setup
echo "🗃️ Setting up database..."
python manage.py migrate

# Frontend build (if needed)
echo "🏗️ Building frontend..."
cd ../frontend
if [ ! -d "build" ]; then
    if command -v npm &> /dev/null; then
        npm install
        npm run build
    else
        echo "⚠️  npm not found. Frontend build skipped."
    fi
fi

# Create systemd service files
echo "⚙️ Creating systemd service files..."
cd ..

# Backend service
cat > aprswx-backend.service << EOF
[Unit]
Description=APRSwx Backend Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/backend
Environment=PATH=$(pwd)/venv/bin
ExecStart=$(pwd)/venv/bin/python manage.py runserver 0.0.0.0:8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Frontend service (using serve)
cat > aprswx-frontend.service << EOF
[Unit]
Description=APRSwx Frontend Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/frontend
ExecStart=/usr/local/bin/serve -s build -l 3000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo "📋 Setup complete! To start the services:"
echo ""
echo "Manual start:"
echo "  Backend:  cd backend && python manage.py runserver"
echo "  Frontend: cd frontend && serve -s build"
echo ""
echo "System service (requires sudo):"
echo "  sudo cp aprswx-*.service /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable aprswx-backend aprswx-frontend"
echo "  sudo systemctl start aprswx-backend aprswx-frontend"
echo ""
echo "🌐 Access points:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo ""
echo "✅ APRSwx is ready for production!"
