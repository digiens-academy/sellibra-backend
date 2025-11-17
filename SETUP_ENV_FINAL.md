# .env Dosyası Kurulumu - Final

## ✅ Container İsmi Bulundu

- Backend Container: `sellibra-backend`
- Redis Container: `n8n-redis-1`

## 🚀 .env Dosyasını Oluştur ve Kopyala

### Adım 1: .env Dosyası Oluştur

```bash
cd /home/root/sellibra/deployment

# .env dosyası oluştur
cat > .env << 'EOF'
REDIS_URL=redis://n8n-redis-1:6379/0
REDIS_KEY_PREFIX=sellibra:
EOF

# Kontrol et
cat .env
```

### Adım 2: Container'a Kopyala

```bash
# Container'a kopyala
docker cp .env sellibra-backend:/app/.env

# Kontrol et
docker exec sellibra-backend cat /app/.env
```

### Adım 3: Container'ı Yeniden Başlat

```bash
docker restart sellibra-backend
```

### Adım 4: Logları Kontrol Et

```bash
docker logs sellibra-backend --tail 50 | grep -i redis
```

**Başarılı bağlantı için şunları görmelisiniz:**
```
✅ Redis connected successfully
✅ Redis client ready
✅ AI workers initialized
✅ Google Sheets sync worker initialized
```

## 🔍 Network Kontrolü

Container'ların aynı network'te olduğundan emin olun:

```bash
# Backend container'ının network'ünü kontrol et
docker inspect sellibra-backend | grep -A 10 NetworkSettings

# Redis container'ının network'ünü kontrol et
docker inspect n8n-redis-1 | grep -A 10 NetworkSettings
```

Eğer farklı network'lerdeyse, aynı network'e bağlayın.

## ✅ Tek Komutla Çözüm

```bash
# .env oluştur ve kopyala
cd /home/root/sellibra/deployment && \
cat > .env << 'EOF'
REDIS_URL=redis://n8n-redis-1:6379/0
REDIS_KEY_PREFIX=sellibra:
EOF
docker cp .env sellibra-backend:/app/.env && \
docker restart sellibra-backend && \
echo "✅ .env dosyası oluşturuldu ve container yeniden başlatıldı" && \
docker logs sellibra-backend --tail 30 | grep -i redis
```

## 🔧 Sorun Giderme

### Redis Bağlantı Hatası

```bash
# Container içinden Redis'e ping at
docker exec sellibra-backend sh -c "echo 'PING' | nc n8n-redis-1 6379"
# PONG dönmeli

# VEYA
docker exec sellibra-backend sh -c "timeout 2 nc -zv n8n-redis-1 6379"
```

### Network Sorunu

Eğer container'lar farklı network'lerdeyse:

```bash
# Network'leri listele
docker network ls

# Backend'in network'ünü bul
docker inspect sellibra-backend --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}'

# Redis'i aynı network'e bağla
docker network connect <network_name> n8n-redis-1
```

