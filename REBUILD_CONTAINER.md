# Container'ı Yeniden Build Etme

## 🔴 Sorun

Queue config dosyası güncellendi ama container'da eski kod çalışıyor. Container'ı yeniden build etmek gerekiyor.

## ✅ Çözüm

### 1. Kod Değişikliğini Push Et (Local'de)

```powershell
# Git merge'i tamamla (eğer hala açıksa)
# Editor'de :wq yazıp kaydet

# Push et
git push origin main
```

### 2. Server'da Container'ı Yeniden Build Et

```bash
cd /home/root/sellibra/deployment

# Git pull yap (yeni kodu çek)
cd ../backend
git pull origin main

# VEYA deployment dizininden
cd /home/root/sellibra/deployment
# Backend dizinini güncelle
cd ../backend && git pull origin main && cd ../deployment

# Container'ı yeniden build et
docker-compose build backend

# Container'ı yeniden başlat
docker-compose up -d backend

# Logları kontrol et
docker logs sellibra-backend --tail 50 | grep -i redis
```

## 🚀 Tek Komutla

```bash
cd /home/root/sellibra/deployment && \
cd ../backend && git pull origin main && cd ../deployment && \
docker-compose build backend && \
docker-compose up -d backend && \
sleep 10 && \
docker logs sellibra-backend --tail 30 | grep -i redis
```

## ✅ Beklenen Sonuç

Loglarda şunları görmelisiniz:
```
Redis connection configured: n8n-redis-1:6379/0
✅ Redis connected successfully
✅ AI workers initialized
```

## 🔍 Alternatif: Dosyayı Manuel Kopyala

Eğer git pull yapmak istemiyorsanız:

```bash
# Güncellenmiş queue.js dosyasını server'a yükle
# Sonra container'a kopyala
docker cp /path/to/queue.js sellibra-backend:/app/src/config/queue.js

# Container'ı yeniden başlat
docker restart sellibra-backend
```

