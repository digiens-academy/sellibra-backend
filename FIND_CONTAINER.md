# Container İsmini Bulma ve .env Düzeltme

## 🔍 Adım 1: Container İsmini Bul

```bash
# Tüm çalışan container'ları listele
docker ps

# VEYA sadece isimleri
docker ps --format "{{.Names}}"

# Sellibra ile ilgili container'ları bul
docker ps | grep -i sellibra

# Backend container'ını bul
docker ps | grep backend
```

## 📝 Adım 2: .env Dosyasını Oluştur ve Kopyala

Container ismini bulduktan sonra:

```bash
# Container ismini değişken olarak al (örnek: deployment-backend)
CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -i backend | head -1)
echo "Container: $CONTAINER_NAME"

# .env dosyası oluştur
cat > /tmp/sellibra.env << 'EOF'
REDIS_URL=redis://n8n-redis-1:6379/0
REDIS_KEY_PREFIX=sellibra:
EOF

# Container'a kopyala
docker cp /tmp/sellibra.env $CONTAINER_NAME:/app/.env

# Kontrol et
docker exec $CONTAINER_NAME cat /app/.env
```

## 🚀 Tek Komutla Çözüm

```bash
# Container ismini bul ve .env oluştur
CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -E "(backend|sellibra)" | head -1)
echo "Container ismi: $CONTAINER_NAME"

# .env oluştur
cat > /tmp/sellibra.env << 'EOF'
REDIS_URL=redis://n8n-redis-1:6379/0
REDIS_KEY_PREFIX=sellibra:
EOF

# Kopyala
docker cp /tmp/sellibra.env $CONTAINER_NAME:/app/.env

# Kontrol et
docker exec $CONTAINER_NAME cat /app/.env

# Container'ı yeniden başlat
docker restart $CONTAINER_NAME

# Logları kontrol et
docker logs $CONTAINER_NAME --tail 30 | grep -i redis
```

## 🔍 Alternatif: Docker Compose Kullanıyorsanız

```bash
cd /home/root/sellibra/deployment

# Container ismini bul
docker-compose ps

# .env dosyası oluştur (docker-compose otomatik okur)
cat > .env << 'EOF'
REDIS_URL=redis://n8n-redis-1:6379/0
REDIS_KEY_PREFIX=sellibra:
EOF

# Container'ı yeniden başlat
docker-compose restart backend
```

