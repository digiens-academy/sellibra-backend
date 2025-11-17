# Redis Kurulum Doğrulama

## ✅ .env Dosyası Hazır

```
REDIS_URL=redis://redis:6379/0
REDIS_KEY_PREFIX=sellibra:
```

## 🚀 Sonraki Adımlar

### 1. Uygulamayı Yeniden Başlat

```bash
pm2 restart sellibra-backend
```

VEYA tüm uygulamaları:

```bash
pm2 restart all
```

### 2. Logları Kontrol Et

```bash
pm2 logs sellibra-backend --lines 50
```

**Başarılı bağlantı için şunları görmelisiniz:**

```
✅ Redis client connected
✅ Redis client ready
✅ Redis connected successfully
✅ AI workers initialized
✅ Google Sheets sync worker initialized
```

### 3. Redis Bağlantısını Test Et

```bash
# Database 0'a bağlan
redis-cli -n 0

# Key'leri kontrol et
KEYS "*"
# Henüz boş olabilir (uygulama yeni başladıysa)

# Test key ekle
SET sellibra:test "hello"
GET sellibra:test
# "hello" dönmeli

# Tüm sellibra key'lerini gör
KEYS "sellibra:*"

exit
```

### 4. PM2 Durumunu Kontrol Et

```bash
pm2 status
```

Tüm process'lerin `online` olduğundan emin olun.

### 5. Canlı Logları İzle

```bash
pm2 logs sellibra-backend
```

Ctrl+C ile çıkabilirsiniz.

## 🔍 Sorun Giderme

### Redis Bağlantı Hatası Görüyorsanız

```bash
# Redis durumunu kontrol et
redis-cli PING
# PONG dönmeli

# Redis servisini kontrol et
sudo systemctl status redis-server

# Redis loglarını kontrol et
sudo tail -f /var/log/redis/redis-server.log
```

### PM2 Loglarında Hata

```bash
# Sadece hataları göster
pm2 logs sellibra-backend --err --lines 50

# Tüm logları göster
pm2 logs sellibra-backend --lines 100
```

### Database 0'da Key'ler Görünmüyor

Uygulama kullanıldıkça key'ler oluşacak:
- User cache: `sellibra:user:123:profile`
- Subscription cache: `sellibra:user:123:subscription`
- Queue jobs: BullMQ key'leri

## ✅ Başarı Kriterleri

1. ✅ PM2 loglarında `✅ Redis connected successfully` görünüyor
2. ✅ PM2 loglarında `✅ AI workers initialized` görünüyor
3. ✅ `redis-cli -n 0 PING` → `PONG` dönüyor
4. ✅ PM2 status'ta tüm process'ler `online`

## 🎯 Test Senaryosu

Uygulamayı test etmek için:

1. Bir kullanıcı girişi yapın
2. Bir AI işlemi başlatın (arka plan kaldırma, vb.)
3. Redis'te key'lerin oluştuğunu kontrol edin:

```bash
redis-cli -n 0 KEYS "sellibra:*"
```

Key'ler görünüyorsa Redis çalışıyor demektir! 🎉

