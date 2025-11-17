# Docker Redis Bağlantı Hatası Düzeltme

## 🔴 Sorun

Docker container içinde çalışan uygulama `127.0.0.1:6379` üzerinden Redis'e bağlanmaya çalışıyor, ancak Redis başka bir container'da.

**Hata:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

## ✅ Çözüm

Docker'da container'lar arası iletişim için **container ismini** kullanmak gerekir.

### 1. Docker Compose Dosyasını Kontrol Et

Redis container'ının ismini kontrol edin:

```bash
docker-compose ps
```

VEYA

```bash
docker ps | grep redis
```

Redis container ismi genellikle:
- `redis`
- `sellibra-redis`
- `redis-server`

### 2. .env Dosyasını Güncelle

Docker container içindeki `.env` dosyasını düzenleyin:

```bash
# Container içine gir
docker exec -it sellibra-backend bash

# .env dosyasını düzenle
nano .env
# VEYA
vi .env
```

**REDIS_URL'i container ismi ile güncelleyin:**

```env
# Docker container ismi ile (örnek: redis)
REDIS_URL=redis://redis:6379/0
REDIS_KEY_PREFIX=sellibra:
```

**ÖNEMLİ:** `redis://redis:6379/0` formatında:
- `redis` = Docker container ismi
- `6379` = Redis port
- `0` = Database numarası

### 3. Container'ı Yeniden Başlat

```bash
# Container'dan çık
exit

# Container'ı yeniden başlat
docker-compose restart sellibra-backend
# VEYA
docker restart sellibra-backend
```

### 4. Logları Kontrol Et

```bash
docker logs sellibra-backend --tail 50
```

**Başarılı bağlantı için şunları görmelisiniz:**

```
✅ Redis client connected
✅ Redis client ready
✅ Redis connected successfully
✅ AI workers initialized
```

## 🔍 Container İsmini Bulma

### Yöntem 1: Docker Compose

```bash
# docker-compose.yml dosyasını kontrol et
cat docker-compose.yml | grep -A 5 redis
```

### Yöntem 2: Docker PS

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```

### Yöntem 3: Network İçinde

```bash
# Container network'ünü kontrol et
docker network inspect <network_name> | grep -A 10 redis
```

## 📝 Örnek Docker Compose

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  backend:
    build: .
    container_name: sellibra-backend
    environment:
      - REDIS_URL=redis://redis:6379/0
      - REDIS_KEY_PREFIX=sellibra:
    depends_on:
      - redis
```

Bu durumda `.env` dosyasında:
```env
REDIS_URL=redis://redis:6379/0
```

## 🔧 Alternatif: Host Network Kullanımı

Eğer container'lar aynı network'te değilse:

```yaml
services:
  backend:
    network_mode: "host"
    environment:
      - REDIS_URL=redis://localhost:6379/0
```

## ✅ Doğrulama

### 1. Container İçinden Test

```bash
docker exec -it sellibra-backend bash

# Redis'e ping at
redis-cli -h redis -p 6379 PING
# PONG dönmeli

# VEYA
nc -zv redis 6379
# Connection successful
```

### 2. Logları Kontrol

```bash
docker logs sellibra-backend | grep -i redis
```

### 3. Network Kontrolü

```bash
# Container'ın hangi network'te olduğunu kontrol et
docker inspect sellibra-backend | grep -A 20 NetworkSettings

# Redis container'ının network'ünü kontrol et
docker inspect redis | grep -A 20 NetworkSettings
```

**ÖNEMLİ:** Her iki container da aynı network'te olmalı!

## 🚨 Yaygın Hatalar

### Hata 1: Container İsmi Yanlış

```bash
# Container ismini kontrol et
docker ps --format "{{.Names}}" | grep redis
```

### Hata 2: Farklı Network'ler

```bash
# Container'ları aynı network'e bağla
docker network connect <network_name> sellibra-backend
docker network connect <network_name> redis
```

### Hata 3: Port Mapping

Redis container'ında port mapping olmalı:
```yaml
redis:
  ports:
    - "6379:6379"
```

## 💡 Hızlı Çözüm

1. Redis container ismini bul: `docker ps | grep redis`
2. `.env` dosyasını güncelle: `REDIS_URL=redis://<container_name>:6379/0`
3. Container'ı yeniden başlat: `docker-compose restart sellibra-backend`
4. Logları kontrol et: `docker logs sellibra-backend`

