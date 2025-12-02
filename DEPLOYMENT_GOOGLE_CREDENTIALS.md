# 🔑 Google Credentials Deployment Guide

## ⚠️ ÖNEMLİ BİLGİ

`src/config/google-credentials.json` dosyası **güvenlik nedeniyle GitHub'a push edilmez**.
Bu dosyayı her ortamda (production, staging, local) **manuel olarak oluşturmanız** gerekir.

---

## 📋 Kontrol Listesi

### ✅ Local Development
- [x] `.gitignore` dosyasında tanımlı (satır 3 ve 13)
- [x] `src/config/google-credentials.json` dosyası oluşturuldu
- [x] Google Cloud credentials bilgileri dolduruldu
- [x] Git tarafından ignore ediliyor (test edildi)

### 🚀 Production/Staging Deployment

Server'a deploy ederken bu dosyayı aşağıdaki yöntemlerle oluşturun:

---

## 1️⃣ SSH ile Manuel Oluşturma (Basit)

```bash
# Server'a bağlanın
ssh user@your-server.com

# Backend dizinine gidin
cd /path/to/digiens-backend

# Dosyayı oluşturun
nano src/config/google-credentials.json
```

**İçeriği yapıştırın:**
- Local'deki `src/config/google-credentials.json` dosyasını açın
- Tüm içeriği kopyalayın (Ctrl+A, Ctrl+C)
- Server'da açtığınız dosyaya yapıştırın (Ctrl+Shift+V)
- Kaydedin: `Ctrl+X` → `Y` → `Enter`

**Dosya izinlerini ayarlayın:**
```bash
chmod 600 src/config/google-credentials.json
```

---

## 2️⃣ SCP ile Dosya Yükleme (Hızlı)

```bash
# Local bilgisayarınızdan çalıştırın:
scp src/config/google-credentials.json user@your-server.com:/path/to/digiens-backend/src/config/

# Dosya izinlerini ayarlayın (server'da):
ssh user@your-server.com "chmod 600 /path/to/digiens-backend/src/config/google-credentials.json"
```

---

## 3️⃣ Docker Secrets (Production - En Güvenli)

### Docker Compose ile:

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    image: digiens-backend
    volumes:
      # Google credentials'ı mount et (read-only)
      - /secure/path/google-credentials.json:/app/src/config/google-credentials.json:ro
    environment:
      - NODE_ENV=production
```

**Server'da dosyayı güvenli yere koyun:**
```bash
# Güvenli dizin oluşturun
sudo mkdir -p /secure/credentials
sudo chmod 700 /secure/credentials

# Dosyayı kopyalayın
sudo cp google-credentials.json /secure/credentials/
sudo chmod 600 /secure/credentials/google-credentials.json
```

### Kubernetes Secret ile:

```bash
# Secret oluşturun
kubectl create secret generic google-credentials \
  --from-file=google-credentials.json=./src/config/google-credentials.json

# Pod'da mount edin
# deployment.yaml
volumes:
  - name: google-creds
    secret:
      secretName: google-credentials
volumeMounts:
  - name: google-creds
    mountPath: /app/src/config/google-credentials.json
    subPath: google-credentials.json
    readOnly: true
```

---

## 4️⃣ Environment Variable Olarak (Alternatif)

Eğer dosya yerine environment variable kullanmak isterseniz:

**Backend kodunu güncelleyin:**
```javascript
// src/config/googleSheets.js
const credentials = process.env.GOOGLE_CREDENTIALS_JSON 
  ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
  : require('./google-credentials.json');
```

**Environment variable olarak set edin:**
```bash
export GOOGLE_CREDENTIALS_JSON='{"type":"service_account",...}'
```

---

## 🔍 Doğrulama

Dosyanın doğru yüklendiğini kontrol edin:

```bash
# Dosya var mı?
ls -la src/config/google-credentials.json

# İçeriği doğru mu? (ilk satırı göster)
head -n 1 src/config/google-credentials.json
# Çıktı: {

# İzinler doğru mu?
ls -l src/config/google-credentials.json
# Çıktı: -rw------- (600 izinleri)
```

**Backend'de test:**
```bash
# Backend'i başlatın
npm start

# Log'larda şunu arayin:
# "✅ Google Sheets initialized successfully"
```

---

## 🚨 Güvenlik Uyarıları

1. **Dosya izinlerini sıkı tutun:**
   ```bash
   chmod 600 src/config/google-credentials.json
   ```

2. **Git'e eklemeyin:**
   ```bash
   # Kontrol edin:
   git check-ignore src/config/google-credentials.json
   # Çıktı: .gitignore:3:src/config/google-credentials.json
   ```

3. **Backup alın:**
   - Credentials'ı güvenli bir password manager'da saklayın
   - Server'da güvenli bir yere kopyalayın

4. **Rotate edin:**
   - Service account key'i düzenli olarak yenileyin
   - Eski key'leri Google Cloud Console'dan silin

---

## 📞 Sorun Giderme

### "Google Sheets not initialized" hatası:

```bash
# Dosya var mı?
ls src/config/google-credentials.json

# Dosya geçerli JSON mi?
cat src/config/google-credentials.json | python -m json.tool

# İzinler doğru mu?
ls -l src/config/google-credentials.json
```

### "ENOENT: no such file" hatası:

```bash
# Dosya yolu doğru mu?
pwd  # Şu an neredesiniz?
ls -la src/config/  # Dosya burada mı?
```

### "Invalid credentials" hatası:

1. Google Cloud Console'da service account'u kontrol edin
2. Google Sheets API'nin aktif olduğundan emin olun
3. Sheet'i service account email'i ile paylaştınız mı?

---

## 🎯 Özet

- ✅ Local'de dosya hazır ve `.gitignore` ile korunuyor
- ✅ GitHub'a **asla** push edilmeyecek
- ✅ Server'da manuel olarak oluşturulmalı
- ✅ Docker/Kubernetes için secret olarak yönetilebilir
- ✅ Güvenlik best practices uygulanmalı

---

## 📚 İlgili Dosyalar

- `.gitignore` (satır 3 ve 13)
- `src/config/googleSheets.js`
- `src/services/googleSheets.service.js`
- `src/jobs/syncSheetToDB.js`


