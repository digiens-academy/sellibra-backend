# Redis Bağlantı Debug

## 🔴 Sorun

Queue config hala `127.0.0.1:6379` kullanıyor. `.env` dosyası yüklendi ama BullMQ doğru parse etmiyor.

## ✅ Çözüm: Container İçinde Kontrol

### 1. Container İçinde .env Kontrolü

```bash
docker exec sellibra-backend cat /app/.env
```

### 2. Environment Variable Kontrolü

```bash
docker exec sellibra-backend env | grep REDIS
```

### 3. Container İçinde Test

```bash
# Container içine gir
docker exec -it sellibra-backend bash

# Environment variable'ları kontrol et
echo $REDIS_URL

# Redis'e bağlanmayı test et
node -e "const Redis = require('ioredis'); const r = new Redis(process.env.REDIS_URL || 'redis://n8n-redis-1:6379/0'); r.ping().then(console.log).catch(console.error);"
```

## 🔧 BullMQ REDIS_URL Formatı

BullMQ için REDIS_URL formatı:

```javascript
// BullMQ connection string format
redis://[password@]host[:port][/database]
```

Örnek:
- `redis://n8n-redis-1:6379/0` ✅
- `redis://n8n-redis-1:6379` ✅ (database 0 varsayılan)

## 🚀 Düzeltme: Docker Compose Environment Variables

Eğer docker-compose kullanıyorsanız, environment variable'ları orada tanımlayın:

```yaml
services:
  backend:
    environment:
      - REDIS_URL=redis://n8n-redis-1:6379/0
      - REDIS_KEY_PREFIX=sellibra:
```

VEYA `.env` dosyasını docker-compose'un okuması için:

```yaml
services:
  backend:
    env_file:
      - .env
```

## 🔍 Debug Adımları

### 1. Container Loglarını Kontrol Et

```bash
docker logs sellibra-backend --tail 100 | grep -i redis
```

### 2. Container İçinde Environment Variable'ları Kontrol Et

```bash
docker exec sellibra-backend sh -c 'echo "REDIS_URL=$REDIS_URL"'
```

### 3. Node.js'den Test Et

```bash
docker exec sellibra-backend node -e "
const Redis = require('ioredis');
const url = process.env.REDIS_URL || 'redis://n8n-redis-1:6379/0';
console.log('Connecting to:', url);
const r = new Redis(url);
r.ping()
  .then(() => { console.log('✅ Redis connected'); r.quit(); })
  .catch(err => { console.error('❌ Error:', err.message); });
"
```

## 💡 Olası Sorunlar

1. **.env dosyası yüklenmiyor**: Docker Compose `env_file` kullanmıyor
2. **Environment variable yok**: Container başlatılırken `.env` okunmuyor
3. **BullMQ parse hatası**: REDIS_URL formatı yanlış

## ✅ Hızlı Çözüm

Docker Compose kullanıyorsanız:

```bash
cd /home/root/sellibra/deployment

# docker-compose.yml dosyasını düzenle
nano docker-compose.yml

# Backend servisine ekle:
#   environment:
#     - REDIS_URL=redis://n8n-redis-1:6379/0
#     - REDIS_KEY_PREFIX=sellibra:

# VEYA env_file ekle:
#   env_file:
#     - .env

# Container'ı yeniden başlat
docker-compose restart backend
```

