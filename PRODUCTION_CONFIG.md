# APRSwx Production Configuration

## 🔧 Production Settings

### Environment Variables
Create a `.env` file in the backend directory:

```env
# Django Settings
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/aprswx

# Redis Configuration (for WebSocket/Channels)
REDIS_URL=redis://localhost:6379/0

# APRS-IS Configuration
APRS_IS_SERVER=rotate.aprs2.net
APRS_IS_PORT=14580

# Weather Radar Configuration
NEXRAD_API_KEY=your-api-key-here
WEATHER_UPDATE_INTERVAL=300

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE=/var/log/aprswx/aprswx.log
```

### Web Server Configuration (Nginx)

```nginx
# /etc/nginx/sites-available/aprswx
server {
    listen 80;
    server_name your-domain.com;
    
    # Frontend (React build)
    location / {
        root /path/to/APRSwx/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket connections
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /static/ {
        alias /path/to/APRSwx/backend/static/;
    }
    
    # Media files
    location /media/ {
        alias /path/to/APRSwx/backend/media/;
    }
}
```

### Database Setup (PostgreSQL)

```sql
-- Create database and user
CREATE DATABASE aprswx;
CREATE USER aprswx WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE aprswx TO aprswx;

-- Enable PostGIS extension
\c aprswx
CREATE EXTENSION postgis;
```

### Systemd Service Configuration

#### Backend Service
```ini
# /etc/systemd/system/aprswx-backend.service
[Unit]
Description=APRSwx Backend Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=aprswx
Group=aprswx
WorkingDirectory=/opt/APRSwx/backend
Environment=PATH=/opt/APRSwx/venv/bin
ExecStart=/opt/APRSwx/venv/bin/daphne -b 0.0.0.0 -p 8000 aprs_server.asgi:application
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

#### Celery Worker (for background tasks)
```ini
# /etc/systemd/system/aprswx-celery.service
[Unit]
Description=APRSwx Celery Worker
After=network.target redis.service

[Service]
Type=simple
User=aprswx
Group=aprswx
WorkingDirectory=/opt/APRSwx/backend
Environment=PATH=/opt/APRSwx/venv/bin
ExecStart=/opt/APRSwx/venv/bin/celery -A aprs_server worker -l info
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### SSL/TLS Configuration (Let's Encrypt)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Monitoring and Logging

#### Log Rotation
```bash
# /etc/logrotate.d/aprswx
/var/log/aprswx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 aprswx aprswx
    postrotate
        systemctl reload aprswx-backend
    endscript
}
```

#### Health Check Script
```bash
#!/bin/bash
# /opt/APRSwx/scripts/health_check.sh

# Check backend health
curl -f http://localhost:8000/api/health/ || exit 1

# Check WebSocket connection
curl -f -H "Upgrade: websocket" http://localhost:8000/ws/ || exit 1

echo "APRSwx health check passed"
```

### Backup Configuration

```bash
#!/bin/bash
# /opt/APRSwx/scripts/backup.sh

# Database backup
pg_dump -U aprswx aprswx > /backup/aprswx_$(date +%Y%m%d_%H%M%S).sql

# Configuration backup
tar -czf /backup/aprswx_config_$(date +%Y%m%d_%H%M%S).tar.gz \
    /opt/APRSwx/backend/.env \
    /opt/APRSwx/backend/aprs_server/settings.py \
    /etc/nginx/sites-available/aprswx \
    /etc/systemd/system/aprswx-*

# Cleanup old backups (keep 30 days)
find /backup -name "aprswx_*" -mtime +30 -delete
```

### Performance Tuning

#### Database Optimization
```sql
-- PostgreSQL configuration tuning
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
```

#### Redis Configuration
```ini
# /etc/redis/redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Security Configuration

#### Firewall Rules
```bash
# UFW configuration
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 8000/tcp
sudo ufw enable
```

#### Fail2Ban Configuration
```ini
# /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
maxretry = 10
```

This configuration provides a robust production environment for APRSwx with proper security, monitoring, and performance optimization.
