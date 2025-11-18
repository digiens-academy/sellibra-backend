# Docker Prisma Client Hatası - Çözüm Rehberi

## 🐛 Sorun

```
Error: @prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.
```

Docker container'ı başlatıldığında Prisma Client generate edilmemiş olarak kalıyordu.

## ✅ Çözümler

### 1. **Dockerfile Düzeltmeleri**

#### a) Builder Stage'de Generate
```dockerfile
# ÖNCE (Yanlış - hata görmezden geliniyordu):
RUN npx prisma generate --schema=./prisma/schema.prisma --platform=linux-x64 || true

# SONRA (Doğru - hata fırlatılıyor):
RUN npx prisma generate
```

#### b) Runtime Stage'de Tekrar Generate
```dockerfile
# Builder'dan artefact'lar (Prisma Client dahil)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --chown=nodejs:nodejs . .

# Prisma Client'ı tekrar generate et
USER root
RUN npx prisma generate
USER nodejs
```

### 2. **Entrypoint Script Eklendi**

`docker-entrypoint.sh` dosyası oluşturuldu:
- Database bağlantısını bekler
- Prisma migrations'ı çalıştırır
- Uygulamayı başlatır

```bash
#!/bin/bash
set -e

echo "🚀 Starting Sellibra Backend..."

# Wait for database
echo "⏳ Waiting for database connection..."
until node -e "require('./src/config/database').connectDB()..." 2>/dev/null; do
  sleep 2
done

# Run migrations
echo "📦 Running Prisma migrations..."
npx prisma migrate deploy

# Start app
echo "🎯 Starting application..."
exec "$@"
```

### 3. **Healthcheck Eklendi**

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', r => process.exit(r.statusCode===200?0:1))"
```

## 🚀 Sunucuda Uygulama

### Adım 1: Güncel Dosyaları Çek

```bash
cd /home/root/sellibra/backend
git pull origin main
```

### Adım 2: Mevcut Container'ları Durdur

```bash
cd /home/root/sellibra/deployment
docker-compose down
```

### Adım 3: Image'i Yeniden Build Et

```bash
# Eski image'i sil
docker rmi sellibra-backend:latest

# Yeni image'i build et
docker-compose build backend --no-cache
```

### Adım 4: Container'ları Başlat

```bash
docker-compose up -d
```

### Adım 5: Logları Kontrol Et

```bash
# Backend loglarını izle
docker logs -f sellibra-backend

# Beklenen çıktı:
# 🚀 Starting Sellibra Backend...
# ⏳ Waiting for database connection...
# ✅ Database is ready!
# 📦 Running Prisma migrations...
# 🎯 Starting application...
# ✅ Database connected successfully
# 🚀 Server running in production mode on port 5000
```

### Adım 6: Health Check

```bash
curl http://localhost:5000/health

# Beklenen sonuç:
# {"success":true,"message":"Server is running","environment":"production","timestamp":"..."}
```

## 🔍 Sorun Giderme

### Hata: "Prisma Client is unable to run on this system"

```bash
# Container içinde platform kontrolü
docker exec sellibra-backend uname -m
# Sonuç: x86_64 olmalı

# Prisma Client'ı manuel generate et
docker exec sellibra-backend npx prisma generate
```

### Hata: "Migration başarısız"

```bash
# Migration durumunu kontrol et
docker exec sellibra-backend npx prisma migrate status

# Manuel migration çalıştır
docker exec sellibra-backend npx prisma migrate deploy
```

### Hata: "Database connection failed"

```bash
# PostgreSQL container'ını kontrol et
docker ps | grep postgres

# Database loglarını kontrol et
docker logs sellibra-postgres

# Network kontrolü
docker network inspect sellibra-network
```

### Container Sürekli Yeniden Başlıyor

```bash
# Detaylı logları kontrol et
docker logs sellibra-backend --tail 100

# Container durumunu kontrol et
docker inspect sellibra-backend

# Health check durumu
docker inspect sellibra-backend | grep -A 10 Health
```

## 📝 Manuel Test (Container İçinde)

```bash
# Container'a gir
docker exec -it sellibra-backend /bin/bash

# Prisma Client kontrol
node -e "const { prisma } = require('./src/config/database'); console.log('Prisma OK');"

# Database bağlantı testi
node -e "require('./src/config/database').connectDB().then(() => console.log('DB OK')).catch(console.error)"

# Migration durumu
npx prisma migrate status

# Çık
exit
```

## ⚙️ Ek Optimizasyonlar

### .dockerignore Kontrol Et

```bash
# .dockerignore dosyasında bunlar olmalı:
node_modules
npm-debug.log
.env
.git
.gitignore
*.md
uploads/*
!uploads/.gitkeep
```

### Multi-stage Build Cache

```bash
# Sadece değişen katmanları yeniden build eder
docker-compose build backend

# Tüm cache'i temizleyip build et (sorun varsa)
docker-compose build backend --no-cache
```

## 📊 Container Monitoring

```bash
# Container kaynak kullanımı
docker stats sellibra-backend

# Container inspect
docker inspect sellibra-backend

# Container processes
docker exec sellibra-backend ps aux
```

## ✅ Doğrulama Checklist

- [ ] `git pull` ile güncel kod çekildi
- [ ] `docker-compose down` ile eski container durduruldu
- [ ] `docker-compose build --no-cache` ile yeni image build edildi
- [ ] `docker-compose up -d` ile container başlatıldı
- [ ] `docker logs` ile başarılı başlama görüldü
- [ ] `curl /health` ile API çalışıyor
- [ ] Database bağlantısı başarılı
- [ ] Migrations uygulandı
- [ ] Frontend ile API iletişimi çalışıyor

---

**Tarih:** 18 Kasım 2025  
**Sorun:** Prisma Client generate hatası  
**Durum:** ✅ Çözüldü

