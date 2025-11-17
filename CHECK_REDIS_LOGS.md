# Redis Log Kontrolü

## ✅ Environment Variable'lar Yüklendi

```
REDIS_URL=redis://n8n-redis-1:6379/0
REDIS_KEY_PREFIX=sellibra:
```

## 🔍 Tüm Logları Kontrol Et

### 1. Redis ile İlgili Tüm Loglar

```bash
docker logs sellibra-backend --tail 100 | grep -i redis
```

### 2. "Redis connection configured" Mesajını Ara

```bash
docker logs sellibra-backend --tail 200 | grep -i "redis connection configured"
```

### 3. Başarılı Bağlantı Mesajlarını Ara

```bash
docker logs sellibra-backend --tail 200 | grep -E "(✅|Redis connected|Redis client)"
```

### 4. Tüm Logları Görüntüle (Redis hariç)

```bash
docker logs sellibra-backend --tail 100
```

## 🔧 Olası Sorunlar

1. **"Redis is already connecting/connected"**: Redis client zaten bağlanmaya çalışıyor, bu normal olabilir
2. **Logger mesajı görünmüyor**: Log seviyesi veya timing sorunu olabilir
3. **Queue config çalışmıyor**: Workers başlatılırken connection config yüklenmemiş olabilir

## ✅ Test: Container İçinde Queue Config

```bash
# Container içinde queue config'i test et
docker exec sellibra-backend node -e "
require('dotenv').config();
const queueConfig = require('./src/config/queue');
console.log('Connection:', JSON.stringify(queueConfig.connection, null, 2));
"
```

Bu komut connection config'inin doğru olup olmadığını gösterecek.

## 🚀 Beklenen Sonuç

```bash
# Connection config
{
  "host": "n8n-redis-1",
  "port": 6379,
  "db": 0,
  "maxRetriesPerRequest": null
}

# Loglar
Redis connection configured: n8n-redis-1:6379/0
✅ Redis connected successfully
✅ AI workers initialized
```

