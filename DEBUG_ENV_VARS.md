# Environment Variable Debug

## 🔴 Sorun

Redis hala `127.0.0.1` kullanıyor. Environment variable'lar set edilmemiş olabilir.

## ✅ Kontrol Adımları

### 1. Environment Variable'ları Kontrol Et

```bash
docker exec sellibra-backend env | grep REDIS
```

Eğer hiçbir şey çıkmazsa, environment variable'lar set edilmemiş demektir.

### 2. Container İçinde .env Dosyasını Kontrol Et

```bash
docker exec sellibra-backend cat /app/.env | grep REDIS
```

### 3. Node.js'den Environment Variable'ları Test Et

```bash
docker exec sellibra-backend node -e "
require('dotenv').config();
console.log('REDIS_URL:', process.env.REDIS_URL);
console.log('REDIS_KEY_PREFIX:', process.env.REDIS_KEY_PREFIX);
"
```

### 4. Queue Config'i Debug Et

Container içinde queue config'i kontrol et:

```bash
docker exec sellibra-backend node -e "
const config = require('./src/config/queue');
console.log('Connection:', JSON.stringify(config.connection, null, 2));
"
```

## 🔧 Çözüm: Container'ı Tamamen Yeniden Başlat

Environment variable'lar bazen container restart ile yüklenmez. Container'ı tamamen yeniden oluşturun:

```bash
cd /home/root/sellibra/deployment

# Container'ı durdur ve sil
docker-compose stop backend
docker-compose rm -f backend

# Container'ı yeniden oluştur
docker-compose up -d backend

# Logları kontrol et
docker logs sellibra-backend --tail 50 | grep -i redis
```

## 🔍 Alternatif: Container İçinde Manuel Test

```bash
# Container içine gir
docker exec -it sellibra-backend bash

# Environment variable'ları kontrol et
env | grep REDIS

# .env dosyasını kontrol et
cat /app/.env | grep REDIS

# Node.js'den test et
node -e "require('dotenv').config(); console.log(process.env.REDIS_URL);"
```

