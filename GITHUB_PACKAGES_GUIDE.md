# 📦 APRSwx GitHub Packages Usage Guide

## 🎯 Available Packages

APRSwx is now available as multiple packages on GitHub Packages for easy distribution and deployment:

### 1. 🐳 Docker Container Package
**Registry**: `ghcr.io/rf-yvy/aprswx`

#### Quick Start
```bash
# Pull and run the latest version
docker pull ghcr.io/rf-yvy/aprswx:latest
docker run -p 8000:8000 ghcr.io/rf-yvy/aprswx:latest
```

#### Production Deployment
```bash
# Download docker-compose.yml
curl -O https://raw.githubusercontent.com/RF-YVY/APRSwx/main/docker-compose.yml

# Start all services (app, database, redis, nginx)
docker-compose up -d

# Check status
docker-compose ps
```

#### Available Tags
- `latest` - Latest stable build from main branch
- `v1.0.0` - Specific version release
- `main` - Latest development build

### 2. 📦 NPM Package (Frontend Components)
**Registry**: `@rf-yvy/aprswx-frontend`

#### Installation
```bash
npm install @rf-yvy/aprswx-frontend
# or
yarn add @rf-yvy/aprswx-frontend
```

#### Usage
```javascript
import { APRSMap, StationList, WeatherPanel } from '@rf-yvy/aprswx-frontend';

function MyApp() {
  return (
    <div>
      <APRSMap userLocation={location} />
      <StationList stations={stations} />
      <WeatherPanel data={weatherData} />
    </div>
  );
}
```

### 3. 🚀 One-Line Installation
```bash
curl -sSL https://raw.githubusercontent.com/RF-YVY/APRSwx/main/install.sh | bash
```
This script will:
- Download all necessary configuration files
- Set up Docker containers with proper networking
- Configure PostgreSQL database and Redis
- Start the complete APRSwx system
- Provide access URLs and management commands

## 🔧 Configuration Options

### Environment Variables
```bash
# Create .env file for custom configuration
cat > .env << EOF
DEBUG=False
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:pass@host:port/dbname
REDIS_URL=redis://host:port/db
APRS_IS_SERVER=rotate.aprs2.net
APRS_IS_PORT=14580
EOF
```

### Docker Compose Override
```yaml
# docker-compose.override.yml
version: '3.8'
services:
  app:
    environment:
      - CUSTOM_SETTING=value
    ports:
      - "8080:8000"  # Custom port
```

## 📊 Usage Examples

### 1. Development Environment
```bash
# Clone for development
git clone https://github.com/RF-YVY/APRSwx.git
cd APRSwx

# Or use Docker for quick setup
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 2. Production Deployment
```bash
# Production with SSL and custom domain
curl -O https://raw.githubusercontent.com/RF-YVY/APRSwx/main/docker-compose.yml
# Edit docker-compose.yml for your domain
docker-compose up -d
```

### 3. Kubernetes Deployment
```yaml
# aprswx-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aprswx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aprswx
  template:
    metadata:
      labels:
        app: aprswx
    spec:
      containers:
      - name: aprswx
        image: ghcr.io/rf-yvy/aprswx:v1.0.0
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          value: "postgresql://..."
```

## 🛠️ Management Commands

### Docker Management
```bash
# View logs
docker-compose logs -f app

# Update to latest version
docker-compose pull
docker-compose up -d

# Backup database
docker-compose exec db pg_dump -U aprswx aprswx > backup.sql

# Scale the application
docker-compose up -d --scale app=3
```

### Health Checks
```bash
# Check application health
curl http://localhost:8000/api/websockets/status/

# Check container health
docker-compose ps
```

## 🔒 Security Considerations

### Production Security
- Change default passwords in `docker-compose.yml`
- Use proper SSL certificates
- Configure firewall rules
- Enable log monitoring
- Regular security updates

### Network Security
```yaml
# docker-compose.yml security additions
services:
  app:
    networks:
      - internal
  nginx:
    networks:
      - internal
      - external
networks:
  internal:
    driver: bridge
    internal: true
  external:
    driver: bridge
```

## 📈 Monitoring and Logging

### Log Collection
```bash
# Centralized logging
docker-compose logs --tail=100 -f

# Export logs
docker-compose logs --no-color > aprswx.log
```

### Health Monitoring
```bash
# Add to crontab for monitoring
*/5 * * * * curl -f http://localhost:8000/api/health/ || systemctl restart aprswx
```

## 🆘 Troubleshooting

### Common Issues
```bash
# Database connection issues
docker-compose exec app python manage.py dbshell

# Reset database
docker-compose down -v
docker-compose up -d

# View detailed logs
docker-compose logs --tail=100 app
```

### Support Resources
- **GitHub Issues**: https://github.com/RF-YVY/APRSwx/issues
- **Documentation**: https://github.com/RF-YVY/APRSwx/wiki
- **Discussions**: https://github.com/RF-YVY/APRSwx/discussions

## 🎉 Success!

Your APRSwx system should now be running at:
- **Frontend**: http://localhost (or your domain)
- **API**: http://localhost/api/
- **Admin**: http://localhost/admin/

For production deployments, don't forget to:
1. Configure proper SSL certificates
2. Set up regular backups
3. Monitor system resources
4. Enable log rotation
5. Configure alerting

**Happy APRS monitoring!** 📡
