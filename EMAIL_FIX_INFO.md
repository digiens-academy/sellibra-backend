# E-posta Nokta Silme Sorunu - Çözüm

## 🐛 Sorun

Express-validator'ın `.normalizeEmail()` fonksiyonu varsayılan olarak Gmail adreslerindeki noktaları siliyordu:
- `a.bayrakta61@gmail.com` → `abayrakta61@gmail.com` 

Bu, kullanıcıların Etsy gibi servislerde sorun yaşamasına neden oluyordu çünkü:
- Gmail noktaları ignore eder (a.user@gmail.com = auser@gmail.com)
- Ancak diğer servisler gerçek e-postayı kullanır

## ✅ Çözüm

`src/utils/validators.js` dosyasında `.normalizeEmail()` fonksiyonuna `gmail_remove_dots: false` parametresi eklendi:

```javascript
// ÖNCE (Yanlış):
.normalizeEmail()

// SONRA (Doğru):
.normalizeEmail({ gmail_remove_dots: false })
```

Bu değişiklik hem register hem de login validasyon kurallarına uygulandı.

## 🔧 Etkilenen Alanlar

1. **Register Validation** (Satır 40)
2. **Login Validation** (Satır 79)

## 📝 Test Etme

### Yeni Kayıt
```bash
# Test için yeni bir kullanıcı kaydedin:
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test.user@gmail.com",
    "phoneNumber": "5555555555",
    "password": "password123"
  }'

# E-posta artık "test.user@gmail.com" olarak kaydedilecek (noktalar korundu)
```

### Giriş
```bash
# Noktalarla giriş yapın:
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.user@gmail.com",
    "password": "password123"
  }'

# Başarılı olmalı
```

## ⚠️ Mevcut Kullanıcılar

### Sorunlu Kayıt Kontrolü

Yanlış e-posta ile kayıtlı kullanıcıları bulmak için:

```sql
-- PostgreSQL
SELECT id, email, "firstName", "lastName", "registeredAt"
FROM users
WHERE email ~ '^[a-z]+[0-9]+@gmail\.com$'  -- Nokta içermeyen Gmail adresleri
ORDER BY "registeredAt" DESC;
```

### Manuel Düzeltme

Eğer kullanıcının gerçek e-postasını biliyorsanız:

```sql
-- PostgreSQL
UPDATE users
SET email = 'a.bayrakta61@gmail.com'  -- Doğru e-posta
WHERE email = 'abayrakta61@gmail.com'; -- Yanlış e-posta
```

**ÖNEMLİ:** 
- Kullanıcıyla iletişime geçerek doğru e-postayı öğrenin
- Rastgele düzeltme yapmayın
- Backup alın

## 🚀 Deployment

Bu değişiklik backend'de yapıldı, sunucuda güncellemek için:

```bash
cd /var/www/sellibra-backend
git pull origin main  # veya git fetch + merge
pm2 restart sellibra-backend
```

## 📌 Notlar

- Bu düzeltme sadece **yeni kayıtları** etkiler
- Mevcut kullanıcılar için manuel düzeltme gerekebilir
- Kullanıcıya yeni e-posta onaylama e-postası gönderilebilir
- Etsy mağaza entegrasyonu için doğru e-posta kritik öneme sahiptir

## ✅ Doğrulama

Düzeltmenin çalıştığını doğrulamak için:

1. Frontend'de `test.user@gmail.com` ile kayıt olun
2. Backend log'larını kontrol edin
3. Veritabanında e-postanın noktalarla kaydedildiğini doğrulayın
4. Aynı e-posta ile giriş yapın

---

**Tarih:** 18 Kasım 2025  
**Konu:** E-posta normalizasyon bug fix  
**Durum:** ✅ Çözüldü

