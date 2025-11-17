# Tam .env Dosyası Oluşturma

## 🔴 Sorun

Container sürekli restart oluyor çünkü `.env` dosyasında sadece Redis ayarları var, diğer gerekli environment variable'lar eksik.

## ✅ Çözüm: Tam .env Dosyası Oluştur

### Adım 1: Mevcut .env Dosyasını Kontrol Et

```bash
cd /home/root/sellibra/deployment
cat .env
```

### Adım 2: Tam .env Dosyası Oluştur

Daha önce paylaştığınız environment variable'ları kullanarak:

```bash
cat > .env << 'EOF'
# Environment
NODE_ENV=production
PORT=5000

# Database
POSTGRES_PASSWORD=password
DATABASE_URL=postgresql://digiens:password@localhost:5433/digiens_db?connection_limit=50&pool_timeout=20&connect_timeout=10

# JWT
JWT_SECRET=sellibra
JWT_EXPIRE=7d

# Google Sheets
GOOGLE_SHEETS_CREDENTIALS_PATH=/app/src/config/google-credentials.json
GOOGLE_SHEETS_ID=1OEgVwKuk4HC2sAN8agJj6gMksH6D2MIiFzn66Uu49xI

# Frontend
FRONTEND_URL=https://sellibra.com

# PrintNest
PRINTNEST_URL=https://embedded.printnest.com?source=sellibra

# Redis
REDIS_URL=redis://n8n-redis-1:6379/0
REDIS_KEY_PREFIX=sellibra:

# Resend (Email)
RESEND_API_KEY=re_NeCUdYn6_9sFjsbdwvmuegJdqhVYWZPxq

# OpenAI
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE

# Remove.bg
REMOVE_BG_API_KEY=3ydUuDeT3Pjwog2vRzJH5mm8
EOF
```

**ÖNEMLİ:** `OPENAI_API_KEY` değerini gerçek key'inizle değiştirin!

### Adım 3: Container'a Kopyala

```bash
docker cp .env sellibra-backend:/app/.env
```

### Adım 4: Container'ı Yeniden Başlat

```bash
docker restart sellibra-backend
```

### Adım 5: Logları Kontrol Et

```bash
# Container'ın çalışıp çalışmadığını kontrol et
docker ps | grep sellibra-backend

# Logları kontrol et
docker logs sellibra-backend --tail 50
```

## 🔍 Eğer Hala Hata Varsa

### Container Loglarını Detaylı Kontrol

```bash
docker logs sellibra-backend --tail 100
```

### Environment Variable'ları Kontrol

```bash
# Container çalıştıktan sonra
docker exec sellibra-backend env | grep -E "(JWT_SECRET|GOOGLE_SHEETS|REDIS_URL)"
```

## 💡 Not

Eğer `docker-compose.yml` kullanıyorsanız, environment variable'ları orada da tanımlayabilirsiniz:

```yaml
services:
  backend:
    env_file:
      - .env
```

VEYA direkt environment olarak:

```yaml
services:
  backend:
    environment:
      - REDIS_URL=redis://n8n-redis-1:6379/0
      - REDIS_KEY_PREFIX=sellibra:
      - JWT_SECRET=sellibra
      # ... diğerleri
```

