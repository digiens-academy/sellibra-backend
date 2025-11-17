# 🚀 Production Hızlı Başlangıç Rehberi

Bu rehber, production ortamına hızlıca deploy etmek için minimal adımları içerir.

## ⚡ Hızlı Kurulum (5 Dakika)

### 1. PostgreSQL Kurulumu

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Database oluştur
sudo -u postgres psql
CREATE DATABASE sellibra_db;
CREATE USER sellibra_user WITH PASSWORD 'GÜÇLÜ_ŞİFRE';
GRANT ALL PRIVILEGES ON DATABASE sellibra_db TO sellibra_user;
\q
```

### 2. Redis Kurulumu

```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test et
redis-cli ping
# Cevap: PONG

# Redis memory limit ayarla (2GB)
sudo nano /etc/redis/redis.conf
# Şunu ekle:
# maxmemory 2gb
# maxmemory-policy allkeys-lru

sudo systemctl restart redis-server
```

### 3. Node.js ve PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
pm2 startup systemd
# Çıkan komutu çalıştır
```

### 4. Uygulama

```bash
cd /var/www
git clone <repo> sellibra-backend
cd sellibra-backend/sellibra-backend

# .env dosyası oluştur
nano .env
# (PRODUCTION_DEPLOYMENT.md'deki .env örneğini kullan)

# Kurulum
npm install --production
npm run prisma:generate
npm run prisma:migrate:deploy

# PM2 ile başlat
pm2 start src/server.js --name sellibra-backend
pm2 save
```

### 5. Nginx (Opsiyonel - Domain varsa)

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/sellibra-backend
# (PRODUCTION_DEPLOYMENT.md'deki nginx config'i kullan)

sudo ln -s /etc/nginx/sites-available/sellibra-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## ✅ Test

```bash
# Health check
curl http://localhost:5000/health

# PM2 durumu
pm2 status

# Redis test
redis-cli ping

# PostgreSQL test
sudo -u postgres psql -d sellibra_db -c "SELECT 1;"
```

## 🔧 Önemli Komutlar

```bash
# PM2
pm2 logs sellibra-backend
pm2 restart sellibra-backend
pm2 monit

# Redis
redis-cli INFO
redis-cli MONITOR

# PostgreSQL
sudo -u postgres psql -d sellibra_db
```

## 📝 .env Örneği (Minimal)

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://sellibra_user:ŞİFRE@localhost:5432/sellibra_db
JWT_SECRET=GÜÇLÜ_SECRET_32_KARAKTER
REDIS_HOST=localhost
REDIS_PORT=6379
FRONTEND_URL=https://yourdomain.com
OPENAI_API_KEY=your_key
REMOVE_BG_API_KEY=your_key
```

