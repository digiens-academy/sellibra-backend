# Redis Hızlı Kurulum - Server

## ✅ Database 0 Boş - Kullanılabilir

Database 0 boş görünüyor. İki seçeneğiniz var:

### Seçenek 1: Database 0'ı Kullan (Önerilen - Boş)

```bash
# .env dosyasını düzenle
nano .env
```

Şunu ekleyin/güncelleyin:
```env
REDIS_URL=redis://redis:6379/0
REDIS_KEY_PREFIX=sellibra:
```

### Seçenek 2: Database 1'i Kullan (Alternatif)

Eğer diğer proje database 0'ı kullanıyorsa:

```bash
# Database 1'i kontrol et
redis-cli -n 1 DBSIZE
# 0 dönerse boş

# .env dosyasını düzenle
nano .env
```

```env
REDIS_URL=redis://redis:6379/1
REDIS_KEY_PREFIX=sellibra:
```

## 🚀 Hızlı Kurulum Adımları

### 1. Tüm Database'leri Kontrol Et

```bash
# Tüm database'leri kontrol et
for i in {0..5}; do
  echo "=== Database $i ==="
  redis-cli -n $i DBSIZE
  redis-cli -n $i KEYS "*" | head -3
  echo ""
done
```

### 2. .env Dosyasını Güncelle

```bash
cd /home/root/sellibra/deployment
nano .env
```

**Database 0 kullanmak için:**
```env
REDIS_URL=redis://redis:6379/0
REDIS_KEY_PREFIX=sellibra:
```

**VEYA Database 1 kullanmak için:**
```env
REDIS_URL=redis://redis:6379/1
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
pm2 logs sellibra-backend --lines 30
```

Şunları görmelisiniz:
```
✅ Redis connected successfully
✅ AI workers initialized
✅ Google Sheets sync worker initialized
```

### 5. Redis Bağlantısını Test Et

```bash
# Database 0'a bağlan
redis-cli -n 0

# Key'leri kontrol et
KEYS "sellibra:*"

# Test key ekle
SET sellibra:test "hello"
GET sellibra:test
# "hello" dönmeli

# Çıkış
exit
```

## 📝 Örnek .env (Database 0)

```env
# ... diğer ayarlar ...

# Redis - Database 0 kullan
REDIS_URL=redis://redis:6379/0
REDIS_KEY_PREFIX=sellibra:

# ... diğer ayarlar ...
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

### Database Kontrolü

```bash
# Database 0'da ne var?
redis-cli -n 0 KEYS "*"

# Database 1'de ne var?
redis-cli -n 1 KEYS "*"

# Database 0'ın boyutu
redis-cli -n 0 DBSIZE
```

### PM2 Logları

```bash
# Son 50 satır
pm2 logs sellibra-backend --lines 50

# Canlı loglar
pm2 logs sellibra-backend

# Sadece Redis ile ilgili
pm2 logs sellibra-backend | grep -i redis
```

## ✅ Doğrulama

```bash
# 1. Redis bağlantısı
redis-cli -n 0 PING
# PONG

# 2. Key'leri kontrol et
redis-cli -n 0 KEYS "sellibra:*"

# 3. PM2 durumu
pm2 status

# 4. PM2 logları
pm2 logs sellibra-backend | grep "Redis"
```

## 💡 Öneri

Database 0 boş olduğu için **Database 0'ı kullanabilirsiniz**. Eğer ileride diğer proje database 0'ı kullanmaya başlarsa, Database 1'e geçebilirsiniz (kod zaten hazır).

