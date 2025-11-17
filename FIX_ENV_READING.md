# .env Dosyası Okuma Sorunu Düzeltme

## 🔴 Sorun

Redis hala `127.0.0.1` kullanıyor. `.env` dosyası container'a kopyalandı ama uygulama okumuyor.

## ✅ Çözüm: Docker Compose Environment Variables

Docker container'larında `.env` dosyası otomatik olarak environment variable olarak yüklenmez. `dotenv` paketi Node.js içinde çalışır ama bazen çalışmayabilir.

### Yöntem 1: Docker Compose'da Environment Variables (Önerilen)

```bash
cd /home/root/sellibra/deployment

# docker-compose.yml dosyasını düzenle
nano docker-compose.yml
```

Backend servisine şunları ekleyin:

```yaml
services:
  backend:
    # ... mevcut ayarlar ...
    environment:
      - REDIS_URL=redis://n8n-redis-1:6379/0
      - REDIS_KEY_PREFIX=sellibra:
      - NODE_ENV=production
      - PORT=5000
      - DATABASE_URL=postgresql://digiens:password@localhost:5433/digiens_db?connection_limit=50&pool_timeout=20&connect_timeout=10
      - JWT_SECRET=sellibra
      - JWT_EXPIRE=7d
      - GOOGLE_SHEETS_CREDENTIALS_PATH=/app/src/config/google-credentials.json
      - GOOGLE_SHEETS_ID=1OEgVwKuk4HC2sAN8agJj6gMksH6D2MIiFzn66Uu49xI
      - FRONTEND_URL=https://sellibra.com
      - PRINTNEST_URL=https://embedded.printnest.com?source=sellibra
      - RESEND_API_KEY=re_NeCUdYn6_9sFjsbdwvmuegJdqhVYWZPxq
      - OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE
      - REMOVE_BG_API_KEY=3ydUuDeT3Pjwog2vRzJH5mm8
```

VEYA `env_file` kullan:

```yaml
services:
  backend:
    # ... mevcut ayarlar ...
    env_file:
      - .env
```

### Yöntem 2: Container İçinde .env Kontrolü

```bash
# Container içinde .env dosyasını kontrol et
docker exec sellibra-backend cat /app/.env

# Environment variable'ları kontrol et
docker exec sellibra-backend env | grep REDIS_URL

# Eğer yoksa, container'ı environment variable ile yeniden başlat
docker stop sellibra-backend
docker start sellibra-backend
```

### Yöntem 3: dotenv Paketi Kontrolü

Container içinde `dotenv` paketinin doğru çalıştığını kontrol edin:

```bash
# Container içine gir
docker exec -it sellibra-backend bash

# .env dosyasını kontrol et
cat /app/.env

# Node.js'den test et
node -e "require('dotenv').config(); console.log('REDIS_URL:', process.env.REDIS_URL);"
```

## 🚀 Hızlı Çözüm

### Adım 1: docker-compose.yml'i Düzenle

```bash
cd /home/root/sellibra/deployment
nano docker-compose.yml
```

Backend servisine `env_file` ekleyin:

```yaml
services:
  backend:
    env_file:
      - .env
```

### Adım 2: Container'ı Yeniden Başlat

```bash
docker-compose restart backend
# VEYA
docker-compose down && docker-compose up -d
```

### Adım 3: Kontrol Et

```bash
# Environment variable'ları kontrol et
docker exec sellibra-backend env | grep REDIS_URL

# Logları kontrol et
docker logs sellibra-backend --tail 30 | grep -i redis
```

## 🔍 Debug

### Container İçinde Test

```bash
docker exec sellibra-backend sh -c "
cd /app && \
node -e \"
require('dotenv').config();
console.log('REDIS_URL:', process.env.REDIS_URL);
console.log('REDIS_KEY_PREFIX:', process.env.REDIS_KEY_PREFIX);
\"
"
```

Eğer `undefined` dönerse, `.env` dosyası okunmuyor demektir.

