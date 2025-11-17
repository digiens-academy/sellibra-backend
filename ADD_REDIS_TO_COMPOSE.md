# Docker Compose'a Redis Environment Variables Ekleme

## 🔴 Sorun

`docker-compose.yml` dosyasında `REDIS_URL` ve `REDIS_KEY_PREFIX` environment variable'ları eksik.

## ✅ Çözüm

### 1. docker-compose.yml Dosyasını Düzenle

```bash
cd /home/root/sellibra/deployment
nano docker-compose.yml
```

### 2. Backend servisinin `environment` bölümüne ekleyin:

`RESEND_API_KEY: ${RESEND_API_KEY}` satırından sonra şunları ekleyin:

```yaml
      RESEND_API_KEY: ${RESEND_API_KEY}
      REDIS_URL: redis://n8n-redis-1:6379/0
      REDIS_KEY_PREFIX: "sellibra:"
      TZ: Europe/Istanbul
```

### 3. Tam Backend Environment Bölümü (Örnek)

```yaml
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
      REDIS_KEY_PREFIX: "sellibra:"
      TZ: Europe/Istanbul
```

### 4. Container'ı Yeniden Oluştur

```bash
# Container'ı yeniden oluştur
docker-compose up -d backend

# Biraz bekleyin
sleep 15

# Environment variable'ları kontrol et
docker exec sellibra-backend env | grep REDIS

# Logları kontrol et
docker logs sellibra-backend --tail 50 | grep -i "redis connection configured"
```

## 🚀 Sed ile Hızlı Ekleme (Alternatif)

```bash
cd /home/root/sellibra/deployment

# RESEND_API_KEY satırından sonra Redis satırlarını ekle
sed -i '/RESEND_API_KEY: ${RESEND_API_KEY}/a\      REDIS_URL: redis://n8n-redis-1:6379/0\n      REDIS_KEY_PREFIX: "sellibra:"' docker-compose.yml

# Kontrol et
cat docker-compose.yml | grep -A 3 "RESEND_API_KEY"

# Container'ı yeniden oluştur
docker-compose up -d backend
```

## ✅ Doğrulama

```bash
# Environment variable'ları kontrol et
docker exec sellibra-backend env | grep REDIS
# Çıktı:
# REDIS_URL=redis://n8n-redis-1:6379/0
# REDIS_KEY_PREFIX=sellibra:

# Logları kontrol et
docker logs sellibra-backend --tail 30 | grep -i "redis connection configured"
# Çıktı:
# Redis connection configured: n8n-redis-1:6379/0
```

