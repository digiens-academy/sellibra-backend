# Docker Container .env ve Redis Düzeltme

## 🔴 Sorunlar

1. Container içinde `.env` dosyası yok
2. Container içinde `nano` ve `vi` yok
3. Docker Compose'da Redis servisi tanımlı değil

## ✅ Çözüm

### 1. .env Dosyasının Yerini Bul

```bash
# Container'dan çık
exit

# Container içinde .env dosyasını ara
docker exec sellibra-backend find /app -name ".env" 2>/dev/null

# VEYA environment variable olarak mı kullanılıyor?
docker exec sellibra-backend env | grep REDIS
```

### 2. .env Dosyasını Container'a Kopyala

**Yöntem 1: Host'tan Container'a**

```bash
# Host'ta .env dosyasını oluştur/düzenle
cd /home/root/sellibra/deployment
nano .env

# Container'a kopyala
docker cp .env sellibra-backend:/app/.env
```

**Yöntem 2: Docker Compose Environment Variables**

`docker-compose.yml` dosyasını düzenle:

```yaml
services:
  backend:
    environment:
      - REDIS_URL=redis://redis:6379/0
      - REDIS_KEY_PREFIX=sellibra:
      # VEYA .env dosyasından oku
      - REDIS_URL=${REDIS_URL}
```

### 3. Redis Container'ını Ekle

`docker-compose.yml` dosyasına Redis servisi ekle:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: sellibra-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  backend:
    # ... mevcut ayarlar ...
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://sellibra-redis:6379/0
      - REDIS_KEY_PREFIX=sellibra:

volumes:
  redis-data:
```

### 4. Container İçinde .env Oluştur (echo ile)

```bash
# Container içine gir
docker exec -it sellibra-backend bash

# .env dosyası oluştur
cat > .env << 'EOF'
REDIS_URL=redis://sellibra-redis:6379/0
REDIS_KEY_PREFIX=sellibra:
EOF

# Kontrol et
cat .env
```

### 5. Mevcut Redis Container'ını Kullan

Eğer başka bir Redis container'ı varsa (n8n-redis-1 gibi):

```bash
# Container içinde .env oluştur
docker exec -it sellibra-backend bash

# echo ile oluştur
echo "REDIS_URL=redis://n8n-redis-1:6379/0" > .env
echo "REDIS_KEY_PREFIX=sellibra:" >> .env

# Kontrol et
cat .env
```

## 🚀 Hızlı Çözüm

### Adım 1: Host'ta .env Oluştur

```bash
cd /home/root/sellibra/deployment
cat > .env << 'EOF'
REDIS_URL=redis://n8n-redis-1:6379/0
REDIS_KEY_PREFIX=sellibra:
EOF
```

### Adım 2: Container'a Kopyala

```bash
docker cp .env sellibra-backend:/app/.env
```

### Adım 3: Container'ı Yeniden Başlat

```bash
docker restart sellibra-backend
```

### Adım 4: Logları Kontrol Et

```bash
docker logs sellibra-backend --tail 30 | grep -i redis
```

## 🔍 Redis Container İsmini Bul

```bash
# Tüm Redis container'larını listele
docker ps | grep redis

# Network'leri kontrol et
docker network ls

# Backend container'ının network'ünü kontrol et
docker inspect sellibra-backend | grep -A 10 NetworkSettings

# Redis container'ının network'ünü kontrol et
docker inspect n8n-redis-1 | grep -A 10 NetworkSettings
```

**ÖNEMLİ:** Her iki container da aynı network'te olmalı!

## 📝 Örnek docker-compose.yml

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: sellibra-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  backend:
    build: .
    container_name: sellibra-backend
    environment:
      - REDIS_URL=redis://sellibra-redis:6379/0
      - REDIS_KEY_PREFIX=sellibra:
    depends_on:
      - redis

volumes:
  redis-data:
```

## ✅ Doğrulama

```bash
# Container içinde .env kontrolü
docker exec sellibra-backend cat /app/.env

# Redis bağlantı testi
docker exec sellibra-backend sh -c "echo 'PING' | nc sellibra-redis 6379"
# PONG dönmeli

# Logları kontrol et
docker logs sellibra-backend | grep -i redis
```

