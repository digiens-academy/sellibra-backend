# .env Dosyası Örneği

Production server için `.env` dosyası örneği:

```env
# Environment
NODE_ENV=production
PORT=5000

# Database
POSTGRES_PASSWORD=password
DATABASE_URL=postgresql://digiens:password@localhost:5433/digiens_db?connection_limit=50&pool_timeout=20&connect_timeout=10

# JWT
JWT_SECRET=sellibra
JWT_EXPIRE=7d

# Google Sheets
GOOGLE_SHEETS_CREDENTIALS_PATH=/app/src/config/google-credentials.json
GOOGLE_SHEETS_ID=1OEgVwKuk4HC2sAN8agJj6gMksH6D2MIiFzn66Uu49xI
SHEETS_WEBHOOK_SECRET=GÜÇLÜ_WEBHOOK_SECRET_BURAYA

# Frontend
FRONTEND_URL=https://sellibra.com

# PrintNest
PRINTNEST_URL=https://embedded.printnest.com?source=sellibra

# Redis (İki yöntemden biri)
# Yöntem 1: REDIS_URL kullan (Docker için uygun)
REDIS_URL=redis://localhost:6379
# VEYA Docker container ismi ile:
# REDIS_URL=redis://redis:6379

# Yöntem 2: Ayrı ayrı ayarlar
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=şifreniz_varsa
# REDIS_DB=0

# Resend (Email)
RESEND_API_KEY=YOUR_RESEND_API_KEY_HERE

# OpenAI
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE

# Remove.bg
REMOVE_BG_API_KEY=YOUR_REMOVE_BG_API_KEY_HERE
```

## Önemli Notlar

1. **DATABASE_URL**: Connection pool parametreleri eklendi (`connection_limit=50&pool_timeout=20`)
2. **REDIS_URL**: `redis://redis:6379` formatı Docker için. Eğer aynı host'ta çalışıyorsa `redis://localhost:6379` kullanın
3. **JWT_SECRET**: Production'da daha güçlü bir secret kullanın
4. **SHEETS_WEBHOOK_SECRET**: Güvenlik için ekleyin

## Redis URL Formatı

- **Localhost**: `redis://localhost:6379`
- **Docker container**: `redis://redis:6379` (container ismi: redis)
- **Şifre ile**: `redis://:password@localhost:6379`
- **Database seçimi**: `redis://localhost:6379/0` (son rakam database numarası)

