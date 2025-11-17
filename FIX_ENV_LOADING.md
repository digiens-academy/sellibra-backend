# Environment Variable Yükleme Sorunu

## 🔴 Sorun

`REDIS_URL` undefined. Environment variable container içinde yüklenmiyor.

## ✅ Çözüm: Container'ı Tamamen Yeniden Oluştur

### 1. Container'ı Durdur ve Sil

```bash
cd /home/root/sellibra/deployment

# Container'ı durdur ve sil
docker-compose stop backend
docker-compose rm -f backend
```

### 2. Environment Variable'ları Kontrol Et

```bash
# docker-compose.yml'de environment variable'ları kontrol et
cat docker-compose.yml | grep -A 20 "environment:"
```

Şunları görmelisiniz:
```yaml
      REDIS_URL: redis://n8n-redis-1:6379/0
      REDIS_KEY_PREFIX: "sellibra:"
```

### 3. Container'ı Yeniden Oluştur

```bash
# Container'ı yeniden oluştur (environment variable'lar yüklenecek)
docker-compose up -d backend

# Biraz bekleyin (15 saniye)
sleep 15

# Environment variable'ları kontrol et
docker exec sellibra-backend env | grep REDIS

# Logları kontrol et
docker logs sellibra-backend --tail 50 | grep -i redis
```

## 🔍 Debug: Environment Variable Kontrolü

```bash
# Container içinde environment variable'ları kontrol et
docker exec sellibra-backend env | grep REDIS

# Eğer yoksa, docker-compose.yml'i kontrol et
cat docker-compose.yml | grep -A 25 "backend:" | grep -A 25 "environment:"
```

## 🚀 Tek Komutla Çözüm

```bash
cd /home/root/sellibra/deployment && \
docker-compose stop backend && \
docker-compose rm -f backend && \
docker-compose up -d backend && \
sleep 15 && \
docker exec sellibra-backend env | grep REDIS && \
docker logs sellibra-backend --tail 30 | grep -i "redis connection configured"
```

## ✅ Beklenen Sonuç

```bash
# Environment variable'lar
REDIS_URL=redis://n8n-redis-1:6379/0
REDIS_KEY_PREFIX=sellibra:

# Loglar
Redis connection configured: n8n-redis-1:6379/0
✅ Redis connected successfully
```

