# Rate Limit Açıklaması

## ✅ Rate Limit Nasıl Çalışır?

### IP Bazlı Limit (Mevcut Yapı)

```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 15, // Her IP adresi için 15 deneme
});
```

**Anlamı:**
- Her IP adresi için ayrı limit
- IP 1: 15 deneme hakkı
- IP 2: 15 deneme hakkı
- IP 3: 15 deneme hakkı
- ... (her IP için ayrı)

### Örnek Senaryo

- Kullanıcı A (IP: 192.168.1.1): 15 deneme hakkı
- Kullanıcı B (IP: 192.168.1.2): 15 deneme hakkı
- Kullanıcı C (IP: 192.168.1.3): 15 deneme hakkı

**Toplam:** 3 kullanıcı × 15 = 45 deneme (her biri kendi limitini kullanır)

## 🔍 Limit Türleri

### 1. IP Bazlı (Mevcut - Önerilen)

```javascript
max: 15, // Her IP için 15 deneme
```

**Avantajları:**
- ✅ Her kullanıcı kendi limitini kullanır
- ✅ Bir kullanıcı diğerlerini etkilemez
- ✅ Adil dağılım

### 2. Global Limit (Tüm Kullanıcılar İçin Toplam)

```javascript
// Bu şekilde yapılmaz - express-rate-limit IP bazlı çalışır
// Global limit için farklı bir yaklaşım gerekir
```

## 📊 Mevcut Ayarlar

### Auth Rate Limit
- **Limit**: 15 deneme / 15 dakika
- **Kapsam**: Her IP adresi için ayrı
- **Başarılı istekler**: Sayılmaz (`skipSuccessfulRequests: true`)

### AI Rate Limit
- **Limit**: 20 istek / 15 dakika
- **Kapsam**: Her IP adresi için ayrı

### Genel API Rate Limit
- **Limit**: 100 istek / 15 dakika
- **Kapsam**: Her IP adresi için ayrı

## 💡 Özet

**15 deneme = Her kullanıcı (IP) için ayrı limit**

- Kullanıcı A: 15 deneme
- Kullanıcı B: 15 deneme
- Kullanıcı C: 15 deneme
- ...

Toplam değil, her kullanıcı için ayrı!

