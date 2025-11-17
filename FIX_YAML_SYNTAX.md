# YAML Syntax Hatası Düzeltme

## 🔴 Sorun

YAML syntax hatası: `mapping values are not allowed in this context`

Bu genellikle indentation (girinti) veya format hatasından kaynaklanır.

## ✅ Çözüm

### 1. docker-compose.yml Dosyasını Kontrol Et

```bash
cd /home/root/sellibra/deployment
cat docker-compose.yml | grep -A 5 -B 5 "REDIS"
```

### 2. YAML Syntax Kontrolü

YAML'da önemli noktalar:
- **Indentation**: Boşluklar tutarlı olmalı (genellikle 2 veya 4 boşluk)
- **Colon**: `:` işaretinden sonra boşluk olmalı
- **List items**: `-` ile başlayan satırlar aynı seviyede olmalı

### 3. Doğru Format

```yaml
  backend:
    environment:
      RESEND_API_KEY: ${RESEND_API_KEY}
      REDIS_URL: redis://n8n-redis-1:6379/0
      REDIS_KEY_PREFIX: sellibra:
      TZ: Europe/Istanbul
```

**ÖNEMLİ:** 
- `REDIS_URL:` ve `REDIS_KEY_PREFIX:` satırları diğer environment variable'larıyla aynı seviyede olmalı
- `:` işaretinden sonra mutlaka boşluk olmalı
- Tırnak işareti kullanmayın (gerekli değilse)

### 4. YAML Validator Kullan

```bash
# YAML syntax kontrolü
python3 -c "import yaml; yaml.safe_load(open('docker-compose.yml'))" 2>&1
```

VEYA online validator: https://www.yamllint.com/

## 🚀 Hızlı Düzeltme

### Adım 1: Hatalı Satırı Bul

```bash
# 44. satırı kontrol et
sed -n '40,50p' docker-compose.yml
```

### Adım 2: Düzelt

Muhtemelen şu hatalardan biri:
- `REDIS_URL:redis://...` (boşluk yok)
- `REDIS_URL: "redis://..."` (tırnak gerekli değil)
- Yanlış indentation

### Adım 3: Doğru Format

```yaml
      RESEND_API_KEY: ${RESEND_API_KEY}
      REDIS_URL: redis://n8n-redis-1:6379/0
      REDIS_KEY_PREFIX: sellibra:
      TZ: Europe/Istanbul
```

## 📝 Tam Backend Environment Bölümü (Örnek)

```yaml
    environment:
      NODE_ENV: production
      PORT: 5000
      DATABASE_URL: postgresql://digiens:${POSTGRES_PASSWORD}@postgres:5432/digiens_db
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRE: ${JWT_EXPIRE:-7d}
      FRONTEND_URL: ${FRONTEND_URL}
      GOOGLE_SHEETS_CREDENTIALS_PATH: ${GOOGLE_SHEETS_CREDENTIALS_PATH}
      GOOGLE_SHEETS_ID: ${GOOGLE_SHEETS_ID}
      VITE_PRINTNEST_URL: ${VITE_PRINTNEST_URL}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      REMOVE_BG_API_KEY: ${REMOVE_BG_API_KEY}
      RESEND_API_KEY: ${RESEND_API_KEY}
      REDIS_URL: redis://n8n-redis-1:6379/0
      REDIS_KEY_PREFIX: sellibra:
      TZ: Europe/Istanbul
```

## 🔍 Yaygın Hatalar

1. **Boşluk eksik**: `REDIS_URL:redis://...` ❌ → `REDIS_URL: redis://...` ✅
2. **Yanlış indentation**: Satırlar farklı seviyede ❌ → Aynı seviyede ✅
3. **Gereksiz tırnak**: `REDIS_URL: "redis://..."` ❌ → `REDIS_URL: redis://...` ✅
4. **Tab karakteri**: Tab kullanmayın, boşluk kullanın

