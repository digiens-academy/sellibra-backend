# 🔴 Redis Kurulum Rehberi

Mevcut production sunucunuza Redis kurulumu için adım adım rehber.

## 📋 Kurulum Adımları

### 1. Redis Kurulumu

```bash
# Sistem güncellemesi
sudo apt update

# Redis kurulumu
sudo apt install -y redis-server

# Redis versiyonunu kontrol et
redis-server --version
```

### 2. Redis Servisini Başlatma

```bash
# Redis servisini başlat
sudo systemctl start redis-server

# Redis'i sistem başlangıcında otomatik başlat
sudo systemctl enable redis-server

# Redis durumunu kontrol et
sudo systemctl status redis-server
```

### 3. Redis Bağlantı Testi

```bash
# Redis'e bağlan ve test et
redis-cli ping
# Cevap: PONG olmalı ✅
```

### 4. Redis Konfigürasyonu (2000 Eşzamanlı Kullanıcı İçin)

```bash
# Redis config dosyasını düzenle
sudo nano /etc/redis/redis.conf
```

Aşağıdaki ayarları bulun ve güncelleyin:

```conf
# Network (Sadece localhost'tan erişim - güvenlik için)
bind 127.0.0.1 ::1
protected-mode yes
port 6379

# Memory Management (Sunucu RAM'inize göre ayarlayın)
# Örnek: 8GB RAM varsa 2GB, 16GB RAM varsa 4GB
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence (Production için kritik - veri kaybını önler)
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

**Önemli:** `maxmemory` değerini sunucunuzun RAM'ine göre ayarlayın:
- 8GB RAM → `maxmemory 2gb`
- 16GB RAM → `maxmemory 4gb`
- 32GB RAM → `maxmemory 8gb`

### 5. Redis'i Yeniden Başlatma

```bash
# Config değişikliklerini uygula
sudo systemctl restart redis-server

# Durumu kontrol et
sudo systemctl status redis-server
```

### 6. Redis Güvenlik (Opsiyonel ama Önerilir)

```bash
# Redis config dosyasını düzenle
sudo nano /etc/redis/redis.conf
```

Şifre eklemek için şu satırı bulun ve düzenleyin:

```conf
# requirepass GÜÇLÜ_REDIS_ŞİFRE_BURAYA
```

**Örnek güçlü şifre:**
```conf
requirepass R3d!s_S3cur3_P@ssw0rd_2024
```

```bash
# Redis'i yeniden başlat
sudo systemctl restart redis-server

# Şifre ile test et
redis-cli -a R3d!s_S3cur3_P@ssw0rd_2024 ping
# Cevap: PONG olmalı ✅
```

### 7. .env Dosyasını Güncelleme

Proje klasörünüzde `.env` dosyasını düzenleyin:

```bash
cd /path/to/sellibra-backend
nano .env
```

Aşağıdaki Redis ayarlarını ekleyin/güncelleyin:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=R3d!s_S3cur3_P@ssw0rd_2024  # Şifre eklediyseniz
REDIS_DB=0
```

**Not:** Şifre eklemediyseniz `REDIS_PASSWORD` satırını silin veya boş bırakın.

### 8. Uygulamayı Yeniden Başlatma

```bash
# PM2 ile yeniden başlat
pm2 restart sellibra-backend

# Logları kontrol et
pm2 logs sellibra-backend --lines 50
```

Loglarda şunları görmelisiniz:
```
✅ Redis connected successfully
✅ AI workers initialized
✅ Google Sheets sync worker initialized
```

### 9. Redis Bağlantısını Test Etme

```bash
# Redis CLI ile bağlan
redis-cli
# VEYA şifre varsa:
redis-cli -a R3d!s_S3cur3_P@ssw0rd_2024

# Test komutları
PING
# Cevap: PONG

INFO
# Redis bilgilerini gösterir

INFO memory
# Memory kullanımını gösterir

KEYS *
# Tüm key'leri listeler (cache'lenmiş veriler)

# Çıkmak için
exit
```

### 10. Redis Monitoring

```bash
# Redis istatistiklerini görüntüle
redis-cli INFO

# Memory kullanımını kontrol et
redis-cli INFO memory

# Connected clients sayısını kontrol et
redis-cli INFO clients

# Real-time monitoring
redis-cli MONITOR
```

## ✅ Doğrulama Checklist

Kurulumun başarılı olduğunu kontrol edin:

- [ ] `redis-cli ping` → `PONG` döndü
- [ ] `sudo systemctl status redis-server` → `active (running)`
- [ ] PM2 loglarında `✅ Redis connected successfully` görünüyor
- [ ] PM2 loglarında `✅ AI workers initialized` görünüyor
- [ ] API endpoint'leri çalışıyor (queue sistemi aktif)
- [ ] `redis-cli INFO memory` komutu çalışıyor

## 🔧 Troubleshooting

### Redis Başlamıyor

```bash
# Redis loglarını kontrol et
sudo tail -f /var/log/redis/redis-server.log

# Redis config'i test et
redis-server /etc/redis/redis.conf --test-memory 1

# Port kullanımda mı kontrol et
sudo netstat -tlnp | grep 6379
```

### Bağlantı Hatası

```bash
# Redis servisini kontrol et
sudo systemctl status redis-server

# Redis'i yeniden başlat
sudo systemctl restart redis-server

# Firewall kontrolü (eğer remote erişim gerekiyorsa)
sudo ufw status
```

### Memory Sorunları

```bash
# Memory kullanımını kontrol et
redis-cli INFO memory

# Eski key'leri temizle (dikkatli kullanın!)
redis-cli FLUSHDB  # Sadece current database
# VEYA
redis-cli FLUSHALL  # Tüm database'ler (ÇOK DİKKATLİ!)
```

### Şifre Hatası

```bash
# Şifreyi unuttuysanız, config'den kaldırın
sudo nano /etc/redis/redis.conf
# requirepass satırını yorum satırı yapın veya silin:
# requirepass ...

sudo systemctl restart redis-server
```

## 📊 Redis Performance İpuçları

### Memory Kullanımını İzleme

```bash
# Memory kullanımını sürekli izle
watch -n 1 'redis-cli INFO memory | grep used_memory_human'
```

### Key Sayısını Kontrol Etme

```bash
# Toplam key sayısı
redis-cli DBSIZE

# Belirli pattern'e göre key sayısı
redis-cli --scan --pattern "user:*" | wc -l
```

### Cache Temizleme (Gerekirse)

```bash
# Sadece user cache'lerini temizle
redis-cli --scan --pattern "user:*" | xargs redis-cli DEL

# Sadece subscription cache'lerini temizle
redis-cli --scan --pattern "*:subscription" | xargs redis-cli DEL
```

## 🚀 Sonraki Adımlar

Redis kurulumu tamamlandıktan sonra:

1. ✅ Uygulamayı yeniden başlatın (`pm2 restart sellibra-backend`)
2. ✅ Logları kontrol edin (`pm2 logs sellibra-backend`)
3. ✅ API endpoint'lerini test edin
4. ✅ Redis monitoring'i aktif tutun

## 📝 Önemli Notlar

- **Memory Limit:** `maxmemory` değerini sunucu RAM'inize göre ayarlayın
- **Persistence:** `appendonly yes` production için kritik (veri kaybını önler)
- **Güvenlik:** Production'da mutlaka şifre kullanın
- **Monitoring:** Redis'i düzenli olarak izleyin (`redis-cli INFO`)

## 🆘 Hızlı Komutlar

```bash
# Redis durumu
sudo systemctl status redis-server

# Redis başlat/durdur
sudo systemctl start redis-server
sudo systemctl stop redis-server
sudo systemctl restart redis-server

# Redis test
redis-cli ping

# Redis bilgileri
redis-cli INFO

# Redis logları
sudo tail -f /var/log/redis/redis-server.log
```

