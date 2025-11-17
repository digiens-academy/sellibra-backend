# 🔴 REDIS KURULUMU - LOCAL TEST

Backend'i local'de test etmek için Redis kurmanız gerekir.

## 🪟 WINDOWS İÇİN

### Seçenek 1: Docker ile (ÖNERİLEN)
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Seçenek 2: WSL ile
```bash
# WSL'de Ubuntu açın
wsl

# Redis kurun
sudo apt update
sudo apt install redis-server -y

# Redis başlatın
sudo service redis-server start

# Test edin
redis-cli ping
# Çıktı: PONG
```

### Seçenek 3: Memurai (Windows Native Redis)
1. https://www.memurai.com/ adresinden indirin
2. Kurun ve başlatın

## 🍎 MAC İÇİN

```bash
# Homebrew ile kurun
brew install redis

# Redis başlatın
brew services start redis

# Test edin
redis-cli ping
```

## 🐧 LINUX İÇİN

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server -y
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test
redis-cli ping
```

## ✅ REDIS KURULDU MU KONTROLÜ

```bash
redis-cli ping
```

**Çıktı:** `PONG` olmalı

## 🚀 BACKEND'İ BAŞLATMA (LOCAL)

### 1. Environment Variables
`.env` dosyanızda şu satır olmalı:
```bash
REDIS_URL=redis://localhost:6379
```

### 2. Backend'i başlatın
```bash
npm install
npm run dev
```

### 3. Kontrol
Terminal'de şunları görmelisiniz:
```
✅ Redis connected successfully
🏓 Redis ping successful
🚀 Server running in development mode on port 5000
```

## ⚠️ REDIS OLMADAN ÇALIŞIR MI?

**EVET!** Backend Redis olmadan da çalışır, ancak:
- ❌ Cache çalışmaz (her istekte database sorgusu)
- ❌ Rate limiting çalışmaz (memory'de çalışır)
- ⚠️ Performans düşük olur

Redis olmazsa terminal'de göreceksiniz:
```
⚠️  Application will continue without Redis caching
```

## 🔧 REDIS KOMUTLARI

```bash
# Redis'e bağlan
redis-cli

# Tüm cache'i temizle
redis-cli FLUSHALL

# Cache'deki key'leri gör
redis-cli KEYS *

# Belirli bir key'in değerini gör
redis-cli GET user:123
```

## 📊 CACHE KONTROLÜ

Backend çalışırken:

1. Login olun → User bilgisi cache'lenir
2. Tekrar istek atın → Cache'den gelir (hızlı)
3. Logları kontrol edin:
   - `Cache HIT: User 123` → Cache'den geldi ✅
   - `Cache MISS: User 123` → Database'den geldi ❌

## 🎯 ÖNEMLİ

- Local test için Docker ile Redis en kolay yöntemdir
- Production'da mutlaka Redis kurulu olmalı
- Redis yoksa backend yine çalışır ama yavaş olur

