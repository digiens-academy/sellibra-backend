# Redis Final Kurulum - Tüm Database'ler Boş ✅

Tüm database'ler boş, Database 0'ı kullanabilirsiniz.

## 🚀 Hızlı Kurulum

### 1. .env Dosyasını Güncelle

```bash
cd /home/root/sellibra/deployment
nano .env
```

**Şunu ekleyin/güncelleyin:**

```env
REDIS_URL=redis://redis:6379/0
REDIS_KEY_PREFIX=sellibra:
```

VEYA mevcut `REDIS_URL=redis://redis:6379` satırını şu şekilde güncelleyin:
```env
REDIS_URL=redis://redis:6379/0
REDIS_KEY_PREFIX=sellibra:
```

### 2. .env Dosyasını Kontrol Et

```bash
# Redis ayarlarını kontrol et
grep REDIS .env
```

Şunları görmelisiniz:
```
REDIS_URL=redis://redis:6379/0
REDIS_KEY_PREFIX=sellibra:
```

### 3. Uygulamayı Yeniden Başlat

```bash
pm2 restart sellibra-backend
# VEYA
pm2 restart all
```

### 4. Logları Kontrol Et

```bash
pm2 logs sellibra-backend --lines 50
```

**Şunları görmelisiniz:**
```
✅ Redis connected successfully
✅ Redis client ready
✅ AI workers initialized
✅ Google Sheets sync worker initialized
```

### 5. Redis Bağlantısını Test Et

```bash
# Database 0'a bağlan
redis-cli -n 0

# Key'leri kontrol et (henüz boş olmalı)
KEYS "*"

# Test key ekle
SET sellibra:test "hello"
GET sellibra:test
# "hello" dönmeli

# Tüm sellibra key'lerini gör
KEYS "sellibra:*"

# Çıkış
exit
```

## 📝 Örnek .env (Tam)

```env
# Environment
NODE_ENV=production
PORT=5000

# Database
POSTGRES_PASSWORD=password
DATABASE_URL="postgresql://digiens:password@localhost:5433/digiens_db?connection_limit=50&pool_timeout=20&connect_timeout=10"

# JWT
JWT_SECRET="sellibra"
JWT_EXPIRE=7d

# Google Sheets
GOOGLE_SHEETS_CREDENTIALS_PATH=/app/src/config/google-credentials.json
GOOGLE_SHEETS_ID=1OEgVwKuk4HC2sAN8agJj6gMksH6D2MIiFzn66Uu49xI

# Frontend
FRONTEND_URL=https://sellibra.com

# PrintNest
PRINTNEST_URL="https://embedded.printnest.com?source=sellibra"

# Redis - Database 0 kullan
REDIS_URL=redis://redis:6379/0
REDIS_KEY_PREFIX=sellibra:

# Resend (Email)
RESEND_API_KEY=re_NeCUdYn6_9sFjsbdwvmuegJdqhVYWZPxq

# OpenAI
OPENAI_API_KEY=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

# Remove.bg
REMOVE_BG_API_KEY=3ydUuDeT3Pjwog2vRzJH5mm8
```

## ✅ Doğrulama Adımları

### 1. Redis Bağlantısı
```bash
redis-cli -n 0 PING
# PONG dönmeli
```

### 2. PM2 Durumu
```bash
pm2 status
```

### 3. PM2 Logları
```bash
pm2 logs sellibra-backend | grep -i redis
```

### 4. Redis Key'leri
```bash
redis-cli -n 0 KEYS "sellibra:*"
```

## 🔍 Sorun Giderme

### Redis Bağlantı Hatası

```bash
# Redis durumunu kontrol et
redis-cli PING
# PONG dönmeli

# Redis servisini kontrol et
sudo systemctl status redis-server
```

### PM2 Loglarında Hata

```bash
# Detaylı loglar
pm2 logs sellibra-backend --lines 100

# Sadece hatalar
pm2 logs sellibra-backend --err --lines 50
```

### .env Dosyası Kontrolü

```bash
# Redis ayarlarını göster
cat .env | grep REDIS

# Tüm .env dosyasını göster (şifreler hariç)
cat .env | grep -v "PASSWORD\|API_KEY\|SECRET"
```

## 🎯 Özet

1. ✅ Tüm database'ler boş - Database 0 kullanılabilir
2. 📝 `.env` dosyasına `REDIS_URL=redis://redis:6379/0` ekle
3. 📝 `.env` dosyasına `REDIS_KEY_PREFIX=sellibra:` ekle
4. 🔄 `pm2 restart sellibra-backend` çalıştır
5. ✅ Logları kontrol et

## 💡 Not

- Database 0 kullanıyorsunuz (tüm database'ler boş)
- Key prefix `sellibra:` otomatik ekleniyor
- Diğer projeler farklı database numaraları kullanabilir (1, 2, 3, vb.)

