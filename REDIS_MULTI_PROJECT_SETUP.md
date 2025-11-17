# Redis Multi-Project Setup Rehberi

Aynı Redis instance'ını birden fazla proje ile paylaşmak için iki yöntem:

## 🎯 Yöntem 1: Database Numarası ile Ayırma (Önerilen)

Redis'te 16 farklı database (0-15) kullanabilirsiniz. Her proje farklı bir database numarası kullanır.

### Avantajları:
- ✅ Kolay yönetim (tek Redis instance)
- ✅ İzolasyon (projeler birbirini etkilemez)
- ✅ Performans (aynı memory pool)
- ✅ Basit konfigürasyon

### Konfigürasyon:

**Proje 1 (Diğer proje):**
```env
REDIS_DB=0
# VEYA
REDIS_URL=redis://localhost:6379/0
```

**Proje 2 (Sellibra - SİZİN PROJENİZ):**
```env
REDIS_DB=1
# VEYA
REDIS_URL=redis://localhost:6379/1
```

**Proje 3 (Varsa):**
```env
REDIS_DB=2
# VEYA
REDIS_URL=redis://localhost:6379/2
```

### .env Dosyası Güncellemesi:

```env
# Mevcut REDIS_URL'inize database numarası ekleyin
REDIS_URL=redis://redis:6379/1
# VEYA
REDIS_URL=redis://localhost:6379/1

# VEYA ayrı ayrı ayarlar:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1
```

### Test:

```bash
# Database 0'ı kontrol et (diğer proje)
redis-cli -n 0 KEYS "*"

# Database 1'i kontrol et (sizin projeniz)
redis-cli -n 1 KEYS "*"

# Database 1'e bağlan
redis-cli -n 1
PING
# PONG dönmeli
```

---

## 🎯 Yöntem 2: Key Prefix ile Ayırma

Aynı database'i kullanıp, key'lerin başına prefix ekleyerek ayırmak.

### Avantajları:
- ✅ Aynı database kullanılır
- ✅ Key'ler otomatik prefix alır
- ✅ Çakışma riski yok

### Konfigürasyon:

**Proje 1:**
```env
REDIS_KEY_PREFIX=project1:
REDIS_DB=0
```

**Proje 2 (Sellibra):**
```env
REDIS_KEY_PREFIX=sellibra:
REDIS_DB=0
```

### .env Dosyası:

```env
REDIS_URL=redis://redis:6379/0
REDIS_KEY_PREFIX=sellibra:
```

### Key Örnekleri:

- Proje 1: `project1:user:123:profile`
- Proje 2: `sellibra:user:123:profile`

---

## 📊 Karşılaştırma

| Özellik | Database Numarası | Key Prefix |
|---------|-------------------|------------|
| İzolasyon | ✅ Tam izolasyon | ⚠️ Aynı DB, prefix ile |
| Yönetim | ✅ Kolay | ✅ Kolay |
| Performans | ✅ Aynı | ✅ Aynı |
| Monitoring | ✅ DB bazlı | ⚠️ Prefix bazlı |
| Önerilen | ✅ **EVET** | ⚠️ Alternatif |

---

## 🚀 Önerilen Çözüm: Database Numarası

### Adım 1: Mevcut Projelerin Database'lerini Kontrol Et

```bash
# Database 0'da ne var?
redis-cli -n 0 KEYS "*" | head -5

# Database 1'de ne var?
redis-cli -n 1 KEYS "*" | head -5

# Database 2'de ne var?
redis-cli -n 2 KEYS "*" | head -5
```

### Adım 2: Boş Bir Database Seçin

```bash
# Tüm database'leri kontrol et
for i in {0..15}; do
  echo "Database $i:"
  redis-cli -n $i DBSIZE
done
```

Boş olan bir database numarası seçin (örnek: 1, 2, 3, vb.)

### Adım 3: .env Dosyasını Güncelle

```env
# Database 1 kullan (örnek)
REDIS_URL=redis://redis:6379/1
# VEYA
REDIS_DB=1
```

### Adım 4: Uygulamayı Yeniden Başlat

```bash
pm2 restart sellibra-backend
pm2 logs sellibra-backend
```

### Adım 5: Test Et

```bash
# Database 1'e bağlan
redis-cli -n 1

# Key'leri kontrol et
KEYS "*"
# sellibra: ile başlayan key'ler görmelisiniz

# Test key ekle
SET sellibra:test "hello"
GET sellibra:test
# "hello" dönmeli

exit
```

---

## 🔍 Monitoring

### Her Projeyi Ayrı İzleme

```bash
# Database 0 (Proje 1)
redis-cli -n 0 INFO memory
redis-cli -n 0 DBSIZE

# Database 1 (Sellibra)
redis-cli -n 1 INFO memory
redis-cli -n 1 DBSIZE
```

### Toplam Memory Kullanımı

```bash
redis-cli INFO memory
```

---

## ⚠️ Önemli Notlar

1. **Database Numarası**: 0-15 arası (toplam 16 database)
2. **Key Prefix**: Otomatik olarak `sellibra:` eklenir
3. **Çakışma**: Database numarası ile ayırırsanız çakışma olmaz
4. **Performance**: Aynı Redis instance, aynı performans

---

## 🎯 Hızlı Kurulum

```bash
# 1. Boş database bul
redis-cli -n 1 DBSIZE
# 0 dönerse boş

# 2. .env güncelle
echo 'REDIS_URL=redis://redis:6379/1' >> .env
echo 'REDIS_KEY_PREFIX=sellibra:' >> .env

# 3. Restart
pm2 restart sellibra-backend

# 4. Test
redis-cli -n 1 KEYS "sellibra:*"
```

---

## 📝 Örnek .env

```env
# Redis - Database 1 kullan (diğer proje 0 kullanıyor)
REDIS_URL=redis://redis:6379/1
REDIS_KEY_PREFIX=sellibra:

# VEYA ayrı ayrı:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1
REDIS_KEY_PREFIX=sellibra:
```

---

## ✅ Doğrulama

```bash
# 1. Redis bağlantısı
redis-cli -n 1 PING
# PONG

# 2. Key'leri kontrol et
redis-cli -n 1 KEYS "sellibra:*"

# 3. PM2 logları
pm2 logs sellibra-backend | grep Redis
# ✅ Redis connected successfully görünmeli
```

