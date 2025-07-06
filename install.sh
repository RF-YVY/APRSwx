#!/bin/bash
# APRSwx Quick Install Script from GitHub Packages

set -e

echo "🚀 APRSwx Quick Installation from GitHub Packages"
echo "=================================================="

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose found"

# Create APRSwx directory
mkdir -p aprswx
cd aprswx

# Download configuration files
echo "📥 Downloading configuration files..."
curl -sSL https://raw.githubusercontent.com/RF-YVY/APRSwx/main/docker-compose.yml -o docker-compose.yml
curl -sSL https://raw.githubusercontent.com/RF-YVY/APRSwx/main/nginx.conf -o nginx.conf

# Create environment file
cat > .env << EOF
DEBUG=False
SECRET_KEY=$(openssl rand -base64 32)
DATABASE_URL=postgresql://aprswx:aprswx_password@db:5432/aprswx
REDIS_URL=redis://redis:6379/0
EOF

echo "⚙️ Configuration files created"

# Pull and start services
echo "🐳 Pulling Docker images from GitHub Packages..."
docker-compose pull

echo "🚀 Starting APRSwx services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Run database migrations
echo "🗃️ Setting up database..."
docker-compose exec -T app python manage.py migrate

echo "✅ APRSwx installation complete!"
echo ""
echo "🌐 Access your APRSwx installation at:"
echo "   Frontend: http://localhost"
echo "   Backend:  http://localhost/api/"
echo "   Admin:    http://localhost/admin/"
echo ""
echo "📋 Useful commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop:         docker-compose down"
echo "   Restart:      docker-compose restart"
echo "   Update:       docker-compose pull && docker-compose up -d"
echo ""
echo "📖 For more information, visit:"
echo "   https://github.com/RF-YVY/APRSwx"
