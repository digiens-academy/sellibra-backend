# Production Deployment Rehberi

Bu rehber, Sellibra backend'in production ortamına deploy edilmesi için gerekli tüm adımları içerir.

## 📋 İçindekiler

1. [Sunucu Gereksinimleri](#sunucu-gereksinimleri)
2. [PostgreSQL Kurulumu](#postgresql-kurulumu)
3. [Redis Kurulumu](#redis-kurulumu)
4. [Node.js ve NPM Kurulumu](#nodejs-ve-npm-kurulumu)
5. [Uygulama Kurulumu](#uygulama-kurulumu)
6. [Environment Variables](#environment-variables)
7. [PM2 ile Process Management](#pm2-ile-process-management)
8. [Nginx Reverse Proxy](#nginx-reverse-proxy)
9. [SSL/HTTPS Kurulumu](#sslhttps-kurulumu)
10. [Monitoring ve Logging](#monitoring-ve-logging)
11. [Backup Stratejisi](#backup-stratejisi)

---

## 🖥️ Sunucu Gereksinimleri

### Minimum Gereksinimler (2000 eşzamanlı kullanıcı için)
- **CPU**: 4 core (8 core önerilir)
- **RAM**: 8GB (16GB önerilir)
- **Disk**: 50GB SSD
- **OS**: Ubuntu 20.04 LTS veya üzeri

### Önerilen Sunucu Konfigürasyonu
- **CPU**: 8 core
- **RAM**: 16GB
- **Disk**: 100GB SSD
- **Network**: 1Gbps

---

## 🐘 PostgreSQL Kurulumu

### 1. PostgreSQL Kurulumu (Ubuntu)

```bash
# PostgreSQL repository ekle
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# PostgreSQL versiyonunu kontrol et
psql --version

# PostgreSQL servisini başlat
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Database ve User Oluşturma

```bash
# PostgreSQL'e bağlan
sudo -u postgres psql

# Database oluştur
CREATE DATABASE sellibra_db;

# User oluştur ve yetki ver
CREATE USER sellibra_user WITH PASSWORD 'GÜÇLÜ_ŞİFRE_BURAYA';
GRANT ALL PRIVILEGES ON DATABASE sellibra_db TO sellibra_user;

# PostgreSQL'den çık
\q
```

### 3. PostgreSQL Optimizasyonu (2000 eşzamanlı kullanıcı için)

```bash
# PostgreSQL config dosyasını düzenle
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Aşağıdaki ayarları ekleyin/güncelleyin:

```conf
# Connection Settings
max_connections = 200
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 20MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4
```

```bash
# PostgreSQL'i yeniden başlat
sudo systemctl restart postgresql
```

### 4. Connection Pool Test

```bash
# Bağlantı sayısını test et
sudo -u postgres psql -d sellibra_db -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## 🔴 Redis Kurulumu

### 1. Redis Kurulumu (Ubuntu)

```bash
# Redis kurulumu
sudo apt update
sudo apt install -y redis-server

# Redis versiyonunu kontrol et
redis-server --version

# Redis servisini başlat
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Redis durumunu kontrol et
sudo systemctl status redis-server
```

### 2. Redis Konfigürasyonu

```bash
# Redis config dosyasını düzenle
sudo nano /etc/redis/redis.conf
```

Aşağıdaki ayarları yapın:

```conf
# Network
bind 127.0.0.1 ::1
protected-mode yes
port 6379

# Memory Management (2000 eşzamanlı kullanıcı için)
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence (Production için önemli)
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

```bash
# Redis'i yeniden başlat
sudo systemctl restart redis-server

# Redis bağlantısını test et
redis-cli ping
# Cevap: PONG olmalı
```

### 3. Redis Güvenlik Ayarları

```bash
# Redis şifresi ayarla (opsiyonel ama önerilir)
sudo nano /etc/redis/redis.conf
```

Şifre eklemek için:

```conf
# requirepass GÜÇLÜ_REDIS_ŞİFRE_BURAYA
```

```bash
# Redis'i yeniden başlat
sudo systemctl restart redis-server

# Şifre ile test et
redis-cli -a GÜÇLÜ_REDIS_ŞİFRE_BURAYA ping
```

### 4. Redis Monitoring

```bash
# Redis istatistiklerini görüntüle
redis-cli INFO

# Memory kullanımını kontrol et
redis-cli INFO memory

# Connected clients sayısını kontrol et
redis-cli INFO clients
```

### 5. Redis Persistence Kontrolü

```bash
# AOF dosyasının oluştuğunu kontrol et
ls -lh /var/lib/redis/

# Redis log dosyasını kontrol et
tail -f /var/log/redis/redis-server.log
```

---

## 📦 Node.js ve NPM Kurulumu

### 1. Node.js Kurulumu (LTS Version)

```bash
# NodeSource repository ekle
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js kurulumu
sudo apt install -y nodejs

# Versiyonları kontrol et
node --version
npm --version
```

### 2. PM2 Kurulumu (Process Manager)

```bash
# PM2 global kurulumu
sudo npm install -g pm2

# PM2 versiyonunu kontrol et
pm2 --version

# PM2'yi sistem başlangıcında çalışacak şekilde ayarla
pm2 startup systemd
# Çıkan komutu çalıştırın (sudo ile başlayan komut)
```

---

## 🚀 Uygulama Kurulumu

### 1. Proje Dosyalarını Sunucuya Yükleme

```bash
# Proje klasörüne git
cd /var/www
sudo mkdir -p sellibra-backend
sudo chown $USER:$USER sellibra-backend

# Git ile clone (veya dosyaları yükle)
git clone <repository-url> sellibra-backend
# VEYA
# SCP/FTP ile dosyaları yükle
```

### 2. Bağımlılıkları Kurma

```bash
cd /var/www/sellibra-backend/sellibra-backend
npm install --production
```

### 3. Prisma Setup

```bash
# Prisma client generate
npm run prisma:generate

# Database migration
npm run prisma:migrate:deploy
```

---

## 🔐 Environment Variables

### .env Dosyası Oluşturma

```bash
cd /var/www/sellibra-backend/sellibra-backend
nano .env
```

Aşağıdaki değişkenleri ekleyin:

```env
# Environment
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://sellibra_user:GÜÇLÜ_ŞİFRE_BURAYA@localhost:5432/sellibra_db?connection_limit=50&pool_timeout=20&connect_timeout=10
DB_CONNECTION_LIMIT=50
DB_POOL_TIMEOUT=20

# JWT
JWT_SECRET=GÜÇLÜ_JWT_SECRET_BURAYA_32_KARAKTER_+
JWT_EXPIRE=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=GÜÇLÜ_REDIS_ŞİFRE_BURAYA
REDIS_DB=0

# Google Sheets
GOOGLE_SHEETS_CREDENTIALS_PATH=/var/www/sellibra-backend/sellibra-backend/src/config/google-credentials.json
GOOGLE_SHEETS_ID=GOOGLE_SHEETS_ID_BURAYA
SHEETS_WEBHOOK_SECRET=GÜÇLÜ_WEBHOOK_SECRET_BURAYA

# Frontend
FRONTEND_URL=https://yourdomain.com

# PrintNest
PRINTNEST_URL=https://printnest.com

# Resend (Email)
RESEND_API_KEY=RESEND_API_KEY_BURAYA

# OpenAI
OPENAI_API_KEY=OPENAI_API_KEY_BURAYA

# Remove.bg
REMOVE_BG_API_KEY=REMOVE_BG_API_KEY_BURAYA
```

### Güvenlik

```bash
# .env dosyasına sadece owner erişebilsin
chmod 600 .env
```

---

## ⚙️ PM2 ile Process Management

### 1. PM2 Ecosystem Dosyası Oluşturma

```bash
cd /var/www/sellibra-backend/sellibra-backend
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'sellibra-backend',
    script: 'src/server.js',
    instances: 'max', // CPU core sayısı kadar instance
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=2048',
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
  }]
};
```

### 2. Logs Klasörü Oluşturma

```bash
mkdir -p logs
```

### 3. PM2 ile Uygulamayı Başlatma

```bash
# PM2 ile başlat
pm2 start ecosystem.config.js

# Durumu kontrol et
pm2 status

# Logları görüntüle
pm2 logs sellibra-backend

# PM2'yi kaydet (restart sonrası otomatik başlasın)
pm2 save
```

### 4. PM2 Komutları

```bash
# Uygulamayı durdur
pm2 stop sellibra-backend

# Uygulamayı yeniden başlat
pm2 restart sellibra-backend

# Uygulamayı sil
pm2 delete sellibra-backend

# Monitoring
pm2 monit

# Logları temizle
pm2 flush
```

---

## 🌐 Nginx Reverse Proxy

### 1. Nginx Kurulumu

```bash
sudo apt install -y nginx
```

### 2. Nginx Konfigürasyonu

```bash
sudo nano /etc/nginx/sites-available/sellibra-backend
```

```nginx
upstream sellibra_backend {
    least_conn;
    server 127.0.0.1:5000 max_fails=3 fail_timeout=30s;
    # Birden fazla instance için:
    # server 127.0.0.1:5001 max_fails=3 fail_timeout=30s;
    # server 127.0.0.1:5002 max_fails=3 fail_timeout=30s;
    keepalive 64;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Request size limit (10MB for file uploads)
    client_max_body_size 10M;
    client_body_timeout 60s;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting (Nginx level)
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    location / {
        proxy_pass http://sellibra_backend;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
        
        # Cache control
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint (rate limit yok)
    location /health {
        proxy_pass http://sellibra_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        limit_req off;
    }
}
```

### 3. Nginx'i Aktif Etme

```bash
# Symbolic link oluştur
sudo ln -s /etc/nginx/sites-available/sellibra-backend /etc/nginx/sites-enabled/

# Nginx config test
sudo nginx -t

# Nginx'i yeniden başlat
sudo systemctl restart nginx

# Nginx durumunu kontrol et
sudo systemctl status nginx
```

---

## 🔒 SSL/HTTPS Kurulumu (Let's Encrypt)

### 1. Certbot Kurulumu

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. SSL Sertifikası Alma

```bash
# SSL sertifikası al (Nginx otomatik yapılandırılır)
sudo certbot --nginx -d api.yourdomain.com

# Otomatik yenileme test et
sudo certbot renew --dry-run
```

### 3. Nginx SSL Konfigürasyonu (Otomatik yapılır, manuel için)

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # ... diğer ayarlar
}

# HTTP'den HTTPS'e yönlendirme
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 📊 Monitoring ve Logging

### 1. PM2 Monitoring

```bash
# PM2 monitoring dashboard
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 2. Log Rotation

```bash
sudo nano /etc/logrotate.d/sellibra-backend
```

```
/var/www/sellibra-backend/sellibra-backend/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

### 3. System Monitoring

```bash
# Htop kurulumu
sudo apt install -y htop

# Disk kullanımını kontrol et
df -h

# Memory kullanımını kontrol et
free -h

# Network trafiğini kontrol et
sudo apt install -y iftop
```

---

## 💾 Backup Stratejisi

### 1. PostgreSQL Backup

```bash
# Backup script oluştur
sudo nano /usr/local/bin/backup-postgres.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="sellibra_db"
DB_USER="sellibra_user"

mkdir -p $BACKUP_DIR

# Backup al
pg_dump -U $DB_USER -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Eski backup'ları sil (7 günden eski)
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql"
```

```bash
# Script'i çalıştırılabilir yap
sudo chmod +x /usr/local/bin/backup-postgres.sh

# Cron job ekle (her gün saat 02:00'de)
sudo crontab -e
# Şunu ekle:
0 2 * * * /usr/local/bin/backup-postgres.sh
```

### 2. Redis Backup

Redis zaten AOF (Append Only File) ile otomatik backup yapıyor. AOF dosyası:
- Konum: `/var/lib/redis/appendonly.aof`
- Otomatik olarak her saniye güncellenir

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Sunucu gereksinimleri karşılanıyor
- [ ] PostgreSQL kuruldu ve optimize edildi
- [ ] Redis kuruldu ve optimize edildi
- [ ] Node.js ve PM2 kuruldu
- [ ] .env dosyası oluşturuldu ve güvenli
- [ ] SSL sertifikası alındı

### Deployment
- [ ] Kod sunucuya yüklendi
- [ ] `npm install --production` çalıştırıldı
- [ ] `npm run prisma:generate` çalıştırıldı
- [ ] `npm run prisma:migrate:deploy` çalıştırıldı
- [ ] PM2 ile uygulama başlatıldı
- [ ] Nginx konfigürasyonu yapıldı
- [ ] SSL aktif edildi

### Post-Deployment
- [ ] Health check endpoint çalışıyor (`/health`)
- [ ] API endpoint'leri test edildi
- [ ] Redis bağlantısı çalışıyor
- [ ] PostgreSQL bağlantısı çalışıyor
- [ ] Loglar düzgün yazılıyor
- [ ] Backup sistemi çalışıyor
- [ ] Monitoring aktif

---

## 🚨 Troubleshooting

### PostgreSQL Bağlantı Hatası
```bash
# PostgreSQL servisini kontrol et
sudo systemctl status postgresql

# PostgreSQL loglarını kontrol et
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Bağlantı sayısını kontrol et
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

### Redis Bağlantı Hatası
```bash
# Redis servisini kontrol et
sudo systemctl status redis-server

# Redis loglarını kontrol et
sudo tail -f /var/log/redis/redis-server.log

# Redis bağlantısını test et
redis-cli ping
```

### PM2 Sorunları
```bash
# PM2 loglarını kontrol et
pm2 logs sellibra-backend --lines 100

# PM2 process'i yeniden başlat
pm2 restart sellibra-backend

# PM2 monitoring
pm2 monit
```

### Nginx Sorunları
```bash
# Nginx config test
sudo nginx -t

# Nginx loglarını kontrol et
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## 📞 Destek

Sorun yaşarsanız:
1. Log dosyalarını kontrol edin
2. System resource kullanımını kontrol edin
3. Database ve Redis bağlantılarını test edin
4. PM2 ve Nginx durumlarını kontrol edin

