# Container ve .env Dosyası Bulma

## 🔍 Container İsmini Bul

```bash
# Tüm container'ları listele
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

# Sellibra ile ilgili container'ları bul
docker ps | grep -i sellibra

# VEYA backend container'ını bul
docker ps | grep backend
```

## 📝 .env Dosyasını Oluştur ve Kopyala

### Adım 1: Container İsmini Bul

```bash
docker ps --format "{{.Names}}" | grep -i sellibra
```

### Adım 2: Host'ta .env Oluştur

```bash
cd /home/root/sellibra/deployment

# .env dosyası oluştur
cat > .env << 'EOF'
REDIS_URL=redis://n8n-redis-1:6379/0
REDIS_KEY_PREFIX=sellibra:
EOF
```

### Adım 3: Container'a Kopyala

```bash
# Container ismini değişken olarak al
CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -i sellibra | grep backend | head -1)

# Kopyala
docker cp .env $CONTAINER_NAME:/app/.env

# Kontrol et
docker exec $CONTAINER_NAME cat /app/.env
```

### Adım 4: Container'ı Yeniden Başlat

```bash
docker restart $CONTAINER_NAME
```

## 🚀 Tek Komutla Çözüm

```bash
# 1. Container ismini bul ve .env oluştur
CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -i sellibra | grep backend | head -1)
echo "Container: $CONTAINER_NAME"

# 2. .env oluştur
cat > /tmp/sellibra.env << 'EOF'
REDIS_URL=redis://n8n-redis-1:6379/0
REDIS_KEY_PREFIX=sellibra:
EOF

# 3. Container'a kopyala
docker cp /tmp/sellibra.env $CONTAINER_NAME:/app/.env

# 4. Kontrol et
docker exec $CONTAINER_NAME cat /app/.env

# 5. Container'ı yeniden başlat
docker restart $CONTAINER_NAME

# 6. Logları kontrol et
docker logs $CONTAINER_NAME --tail 30 | grep -i redis
```

## 🔍 Environment Variable Olarak Kontrol

```bash
# Container ismini bul
CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -i sellibra | grep backend | head -1)

# Environment variable'ları kontrol et
docker exec $CONTAINER_NAME env | grep -i redis

# Docker compose environment'ı kontrol et
docker inspect $CONTAINER_NAME | grep -A 20 Env
```

## 📋 Docker Compose ile .env

Eğer docker-compose kullanıyorsanız:

```bash
cd /home/root/sellibra/deployment

# docker-compose.yml dosyasını kontrol et
cat docker-compose.yml | grep -A 10 backend

# .env dosyasını oluştur (docker-compose otomatik okur)
cat > .env << 'EOF'
REDIS_URL=redis://n8n-redis-1:6379/0
REDIS_KEY_PREFIX=sellibra:
EOF

# Container'ı yeniden başlat
docker-compose restart backend
```

## ✅ Doğrulama

```bash
# Container ismini bul
CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -i sellibra | grep backend | head -1)

# .env dosyasını kontrol et
docker exec $CONTAINER_NAME cat /app/.env 2>/dev/null || echo ".env dosyası bulunamadı"

# Environment variable'ları kontrol et
docker exec $CONTAINER_NAME env | grep REDIS

# Logları kontrol et
docker logs $CONTAINER_NAME --tail 50 | grep -i redis
```

