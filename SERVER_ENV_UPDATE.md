# Server .env Dosyası Güncelleme

Mevcut `.env` dosyanızı aşağıdaki şekilde güncelleyin:

## 🔧 Güncellenmesi Gerekenler

### 1. DATABASE_URL - Connection Pool Parametreleri Ekle

**Mevcut:**
```env
DATABASE_URL="postgresql://digiens:password@localhost:5433/digiens_db"
```

**Güncellenmiş:**
```env
DATABASE_URL="postgresql://digiens:password@localhost:5433/digiens_db?connection_limit=50&pool_timeout=20&connect_timeout=10"
```

### 2. REDIS_URL - Host Kontrolü

**Mevcut:**
```env
REDIS_URL=redis://redis:6379
```

**Not:** `redis://redis:6379` Docker container ismi için. Eğer Redis aynı host'ta çalışıyorsa:

```env
REDIS_URL=redis://localhost:6379
```

VEYA ayrı ayrı ayarlar kullanabilirsiniz:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

### 3. Eksik Olanlar (Opsiyonel ama Önerilir)

```env
# JWT Expire (varsayılan 7d ama belirtmek iyi)
JWT_EXPIRE=7d

# PrintNest URL (zaten var ama format kontrolü)
PRINTNEST_URL=https://embedded.printnest.com?source=sellibra

# Google Sheets Webhook Secret (güvenlik için)
SHEETS_WEBHOOK_SECRET=GÜÇLÜ_WEBHOOK_SECRET_BURAYA
```

## 📝 Tam .env Örneği

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
SHEETS_WEBHOOK_SECRET=GÜÇLÜ_WEBHOOK_SECRET_BURAYA

# Frontend
FRONTEND_URL=https://sellibra.com

# PrintNest
PRINTNEST_URL="https://embedded.printnest.com?source=sellibra"

# Redis (localhost kullanıyorsanız)
REDIS_URL=redis://localhost:6379
# VEYA Docker container ismi ile:
# REDIS_URL=redis://redis:6379

# Resend (Email)
RESEND_API_KEY=YOUR_RESEND_API_KEY_HERE

# OpenAI
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE

# Remove.bg
REMOVE_BG_API_KEY=YOUR_REMOVE_BG_API_KEY_HERE
```

## ✅ Server'da Yapılacaklar

### 1. .env Dosyasını Güncelle

```bash
nano .env
# VEYA
vi .env
```

Yukarıdaki değişiklikleri yapın.

### 2. Redis URL Kontrolü

Eğer `redis-cli ping` çalışıyorsa ve localhost'ta çalışıyorsa:

```bash
# Redis'in nerede çalıştığını kontrol et
redis-cli INFO server | grep tcp_port
```

Eğer port 6379 ise ve localhost'ta çalışıyorsa:
```env
REDIS_URL=redis://localhost:6379
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

Şunları görmelisiniz:
```
✅ Redis connected successfully
✅ AI workers initialized
✅ Google Sheets sync worker initialized
```

## 🔍 Redis Bağlantı Testi

```bash
# Redis'e bağlan
redis-cli

# Test komutları
PING
# PONG dönmeli

INFO
# Redis bilgileri

KEYS *
# Cache'lenmiş key'leri gösterir

exit
```

## ⚠️ Önemli Notlar

1. **DATABASE_URL**: Connection pool parametreleri eklendi (2000 kullanıcı için optimize)
2. **REDIS_URL**: `redis://redis:6379` Docker için. Aynı host'ta ise `redis://localhost:6379` kullanın
3. **JWT_SECRET**: Production'da daha güçlü bir secret kullanın (32+ karakter)
4. **SHEETS_WEBHOOK_SECRET**: Güvenlik için ekleyin

