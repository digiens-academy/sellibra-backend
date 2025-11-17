# Docker Compose Redis Düzeltme

## 🔴 Sorun

`docker-compose.yml` dosyasında `REDIS_URL` ve `REDIS_KEY_PREFIX` environment variable'ları eksik.

## ✅ Çözüm: docker-compose.yml'e Redis Ekleyin

### Backend servisine şunları ekleyin:

```yaml
  backend:
    environment:
      NODE_ENV: production
      PORT: 5000
      DATABASE_URL: postgresql://digiens:${POSTGRES_PASSWORD}@postgres:5432/digiens_db
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRE: ${JWT_EXPIRE:-7d}
      FRONTEND_URL: ${FRONTEND_URL}
      GOOGLE_SHEETS_CREDENTIALS_PATH: ${GOOGLE_SHEETS_CREDENTIALS_PATH}
      GOOGLE_SHEETS_ID: ${GOOGLE_SHEETS_ID}
      VITE_PRINTNEST_URL: ${VITE_PRINTNEST_URL}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      REMOVE_BG_API_KEY: ${REMOVE_BG_API_KEY}
      RESEND_API_KEY: ${RESEND_API_KEY}
      REDIS_URL: redis://n8n-redis-1:6379/0          # ← EKLE
      REDIS_KEY_PREFIX: sellibra:                     # ← EKLE
      TZ: Europe/Istanbul
```

## 🚀 Adım Adım

### 1. docker-compose.yml Dosyasını Düzenle

```bash
cd /home/root/sellibra/deployment
nano docker-compose.yml
```

### 2. Backend servisinin `environment` bölümüne ekleyin:

```yaml
      RESEND_API_KEY: ${RESEND_API_KEY}
      REDIS_URL: redis://n8n-redis-1:6379/0
      REDIS_KEY_PREFIX: sellibra:
      TZ: Europe/Istanbul
```

### 3. Container'ı Yeniden Başlat

```bash
docker-compose restart backend
# VEYA
docker-compose down && docker-compose up -d
```

### 4. Kontrol Et

```bash
# Environment variable'ları kontrol et
docker exec sellibra-backend env | grep REDIS

# Logları kontrol et
docker logs sellibra-backend --tail 50 | grep -i redis
```

## 📝 Tam Örnek (Backend Bölümü)

```yaml
  backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
    container_name: sellibra-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 5000
      DATABASE_URL: postgresql://digiens:${POSTGRES_PASSWORD}@postgres:5432/digiens_db
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRE: ${JWT_EXPIRE:-7d}
      FRONTEND_URL: ${FRONTEND_URL}
      GOOGLE_SHEETS_CREDENTIALS_PATH: ${GOOGLE_SHEETS_CREDENTIALS_PATH}
      GOOGLE_SHEETS_ID: ${GOOGLE_SHEETS_ID}
      VITE_PRINTNEST_URL: ${VITE_PRINTNEST_URL}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      REMOVE_BG_API_KEY: ${REMOVE_BG_API_KEY}
      RESEND_API_KEY: ${RESEND_API_KEY}
      REDIS_URL: redis://n8n-redis-1:6379/0
      REDIS_KEY_PREFIX: sellibra:
      TZ: Europe/Istanbul
    volumes:
      - backend-uploads:/app/uploads
      - ../backend/src/config/google-credentials.json:/app/src/config/google-credentials.json:ro
      - /etc/localtime:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - sellibra-network
    healthcheck:
      test: ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost:5001/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    ports:
      - "5001:5000"
```

## ✅ Doğrulama

```bash
# 1. Environment variable'ları kontrol et
docker exec sellibra-backend env | grep REDIS
# Çıktı:
# REDIS_URL=redis://n8n-redis-1:6379/0
# REDIS_KEY_PREFIX=sellibra:

# 2. Logları kontrol et
docker logs sellibra-backend --tail 30 | grep -i redis
# Şunları görmelisiniz:
# ✅ Redis connected successfully
# ✅ AI workers initialized
```

