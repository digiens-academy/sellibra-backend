# Redis Connection Debug

## ✅ Kod Güncellenmiş

Yeni kod container'da var ama çalışmıyor gibi görünüyor.

## 🔍 Debug Adımları

### 1. Tüm Logları Kontrol Et (Redis connection mesajını ara)

```bash
docker logs sellibra-backend --tail 100 | grep -i "redis connection configured"
```

Eğer bu mesaj yoksa, kod çalışmıyor demektir.

### 2. Container İçinde Manuel Test

```bash
# Container içinde queue config'i test et
docker exec sellibra-backend node -e "
require('dotenv').config();
console.log('REDIS_URL:', process.env.REDIS_URL);
try {
  const url = new URL(process.env.REDIS_URL);
  console.log('Parsed URL:');
  console.log('  Hostname:', url.hostname);
  console.log('  Port:', url.port);
  console.log('  Pathname:', url.pathname);
  const dbMatch = url.pathname.match(/^\/(\d+)$/);
  const db = dbMatch ? parseInt(dbMatch[1], 10) : 0;
  console.log('  Database:', db);
  console.log('Connection object:', JSON.stringify({
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    db: db
  }, null, 2));
} catch (error) {
  console.error('Error:', error.message);
}
"
```

### 3. Queue Config'i Doğrudan Test Et

```bash
# Container içinde queue config modülünü test et
docker exec sellibra-backend node -e "
require('dotenv').config();
const queueConfig = require('./src/config/queue');
console.log('Connection:', JSON.stringify(queueConfig.connection, null, 2));
"
```

### 4. Container'ı Tamamen Yeniden Başlat

```bash
# Container'ı durdur ve sil
docker-compose stop backend
docker-compose rm -f backend

# Container'ı yeniden oluştur
docker-compose up -d backend

# Biraz bekleyin
sleep 15

# Logları kontrol et
docker logs sellibra-backend --tail 100 | grep -i redis
```

## 🔧 Olası Sorunlar

1. **Logger çalışmıyor**: `logger.info` mesajı görünmüyor
2. **URL parse hatası**: `new URL()` hata veriyor olabilir
3. **Environment variable yüklenmiyor**: `process.env.REDIS_URL` undefined olabilir

## 🚀 Hızlı Test

```bash
# Container içinde hızlı test
docker exec sellibra-backend sh -c "
cd /app && \
node -e \"
require('dotenv').config();
console.log('REDIS_URL:', process.env.REDIS_URL);
const url = new URL(process.env.REDIS_URL);
console.log('Hostname:', url.hostname);
console.log('Port:', url.port);
\"
"
```

