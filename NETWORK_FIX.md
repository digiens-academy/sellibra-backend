# Network Sorunu Düzeltme

## 🔴 Sorun

- Backend Container: `sellibra-network`
- Redis Container: `n8n-internal`

Container'lar farklı network'lerde, bu yüzden birbirleriyle iletişim kuramıyorlar.

## ✅ Çözüm: Redis'i Backend Network'üne Bağla

### Yöntem 1: Redis Container'ını Backend Network'üne Bağla

```bash
# Redis container'ını backend network'üne bağla
docker network connect sellibra-network n8n-redis-1

# Kontrol et
docker inspect n8n-redis-1 --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
```

Artık `n8n-redis-1` hem `n8n-internal` hem de `sellibra-network` network'ünde olacak.

### Yöntem 2: Backend Container'ını Redis Network'üne Bağla

```bash
# Backend container'ını Redis network'üne bağla
docker network connect n8n-internal sellibra-backend

# Kontrol et
docker inspect sellibra-backend --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
```

## 🚀 Tam Çözüm Adımları

### 1. Network'leri Bağla

```bash
# Redis'i backend network'üne bağla
docker network connect sellibra-network n8n-redis-1
```

### 2. .env Dosyası Oluştur

```bash
cd /home/root/sellibra/deployment
cat > .env << 'EOF'
REDIS_URL=redis://n8n-redis-1:6379/0
REDIS_KEY_PREFIX=sellibra:
EOF
```

### 3. Container'a Kopyala

```bash
docker cp .env sellibra-backend:/app/.env
```

### 4. Container'ı Yeniden Başlat

```bash
docker restart sellibra-backend
```

### 5. Logları Kontrol Et

```bash
docker logs sellibra-backend --tail 50 | grep -i redis
```

## ✅ Doğrulama

```bash
# Network bağlantısını kontrol et
docker inspect n8n-redis-1 --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
# Çıktı: n8n-internal sellibra-network

# Container içinden Redis'e ping at
docker exec sellibra-backend sh -c "timeout 2 nc -zv n8n-redis-1 6379"
# Connection successful dönmeli

# VEYA
docker exec sellibra-backend sh -c "echo 'PING' | nc n8n-redis-1 6379"
# PONG dönmeli
```

## 🔧 Alternatif: Yeni Redis Container Oluştur

Eğer n8n-redis-1'i kullanmak istemiyorsanız, sellibra için ayrı bir Redis container oluşturabilirsiniz:

```bash
# docker-compose.yml dosyasına Redis servisi ekle
# VEYA manuel olarak:
docker run -d \
  --name sellibra-redis \
  --network sellibra-network \
  -p 6380:6379 \
  redis:7-alpine

# .env dosyasını güncelle
cat > .env << 'EOF'
REDIS_URL=redis://sellibra-redis:6379/0
REDIS_KEY_PREFIX=sellibra:
EOF
```

## ⚠️ Önemli Notlar

1. **Network Bağlantısı**: Redis container'ı artık iki network'te olacak (n8n-internal ve sellibra-network)
2. **Port**: Redis container'ı iç network'te 6379 portunda çalışıyor
3. **Database**: Database 0 kullanıyoruz (`/0`)

