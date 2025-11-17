# Queue.js Dosyasını Kontrol Etme

## 🔴 Sorun

Container yeniden build edildi ama hala `127.0.0.1` kullanıyor. Kod değişikliği container'a yüklenmemiş olabilir.

## ✅ Kontrol Adımları

### 1. Container İçinde queue.js Dosyasını Kontrol Et

```bash
# Container içinde queue.js dosyasını kontrol et
docker exec sellibra-backend cat /app/src/config/queue.js | grep -A 20 "if (process.env.REDIS_URL)"
```

Eğer eski kod görüyorsanız (string kullanıyor), yeni kod yüklenmemiş demektir.

### 2. Git Pull Kontrolü

```bash
# Backend dizininde git pull yapıldı mı kontrol et
cd /home/root/sellibra/backend
git log --oneline -5
git status
```

### 3. Container İçinde Environment Variable Kontrolü

```bash
# Environment variable'ları kontrol et
docker exec sellibra-backend env | grep REDIS_URL

# Node.js'den test et
docker exec sellibra-backend node -e "
const url = process.env.REDIS_URL;
console.log('REDIS_URL:', url);
if (url) {
  const u = new URL(url);
  console.log('Host:', u.hostname);
  console.log('Port:', u.port);
  console.log('Path:', u.pathname);
}
"
```

## 🔧 Çözüm: Manuel Dosya Kopyalama

Eğer git pull çalışmıyorsa, dosyayı manuel kopyalayabilirsiniz:

### Yöntem 1: Container İçinde Düzenle

```bash
# Container içine gir
docker exec -it sellibra-backend bash

# queue.js dosyasını düzenle
# (vi veya nano yoksa, echo ile oluştur)
```

### Yöntem 2: Host'tan Container'a Kopyala

```bash
# Güncellenmiş queue.js dosyasını server'a yükle
# Sonra container'a kopyala
docker cp /path/to/queue.js sellibra-backend:/app/src/config/queue.js

# Container'ı yeniden başlat
docker restart sellibra-backend
```

## 🚀 Hızlı Test: Container İçinde Debug

```bash
# Container içinde queue config'i test et
docker exec sellibra-backend node -e "
require('dotenv').config();
const queueConfig = require('./src/config/queue');
console.log('Connection:', JSON.stringify(queueConfig.connection, null, 2));
"
```

Bu komut connection config'inin ne olduğunu gösterecek.

