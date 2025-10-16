# Etsy Mağaza Bilgisi

## ⚠️ Önemli Not

Etsy mağaza doğrulaması **devre dışı bırakıldı**. Etsy'nin bot koruması (Cloudflare/anti-scraping) nedeniyle HTTP istekleri ile mağaza doğrulaması yapılamıyor.

## 🔍 Mevcut Durum: Sadece Bilgi Toplama

Sistem şu anda kullanıcılardan **sadece Etsy mağaza bilgisi alıyor** ve kaydediyor. Doğrulama yapılmıyor.

### Kontrol Edilen Kurallar

1. **URL Formatı**
   - ✅ `https://www.etsy.com/shop/ShopName`
   - ✅ `https://etsy.com/shop/ShopName`
   - ✅ `etsy.com/shop/ShopName`
   - ✅ `ShopName` (otomatik olarak tam URL'e dönüştürülür)

2. **Shop Name Kuralları**
   - ✅ En az 4 karakter
   - ✅ En fazla 50 karakter
   - ✅ Sadece harf, rakam, tire (-) ve alt çizgi (_)
   - ✅ Tire veya alt çizgi ile başlayamaz
   - ✅ Tire veya alt çizgi ile bitemez

### Örnek Geçerli Shop Names

```
✅ TheYarnKitchen
✅ MyShop123
✅ Shop_Name
✅ My-Awesome-Shop
✅ VintageShop2024
```

### Örnek Geçersiz Shop Names

```
❌ ABC (çok kısa)
❌ -MyShop (tire ile başlıyor)
❌ MyShop_ (alt çizgi ile bitiyor)
❌ My Shop (boşluk içeriyor)
❌ Shop@123 (özel karakter içeriyor)
```

## 🚀 Gelecekteki İyileştirmeler

### Seçenek 1: Etsy API Kullanımı (Önerilen)

En profesyonel çözüm Etsy API kullanmaktır:

1. **Etsy Developer Account** oluştur
2. **API Key** al
3. API üzerinden mağaza doğrulaması yap

**Avantajları:**
- ✅ Gerçek mağaza doğrulaması
- ✅ Rate limiting yok
- ✅ Resmi yöntem
- ✅ Mağaza detaylarına erişim

**Dezavantajları:**
- ❌ API key gerekli
- ❌ Setup süreci var

### Seçenek 2: Puppeteer/Playwright (Ağır)

Gerçek browser simülasyonu kullanarak:

```javascript
const puppeteer = require('puppeteer');

async function validateEtsyStore(shopUrl) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(shopUrl);
  const is404 = await page.$('.error-page');
  await browser.close();
  return !is404;
}
```

**Avantajları:**
- ✅ Gerçek mağaza doğrulaması
- ✅ Cloudflare bypass

**Dezavantajları:**
- ❌ Çok ağır (her kayıt için browser açılır)
- ❌ Sunucu kaynakları tüketir
- ❌ Yavaş

### Seçenek 3: Harici Doğrulama Servisi

Üçüncü parti API kullanımı:

- ScrapingBee
- Bright Data
- Oxylabs

**Avantajları:**
- ✅ Proxy ve browser yönetimi
- ✅ Kolay entegrasyon

**Dezavantajları:**
- ❌ Ücretli
- ❌ Harici bağımlılık

## 📊 Mevcut Davranış

### Kayıt Sırasında

1. Kullanıcı Etsy mağaza URL'si veya shop adı girer
2. Backend basit format kontrolü yapar (4-50 karakter, geçerli karakterler)
3. Format geçerliyse → URL normalize edilir ve kaydedilir
4. Format geçersizse → "Geçersiz Etsy mağaza URL formatı" hatası

### ⚠️ Dikkat

Mevcut sistemde **hiçbir doğrulama yapılmıyor**:

- ✅ Kullanıcılar istedikleri shop name'i girebilir
- ❌ Mağazanın gerçekten var olup olmadığı kontrol edilmez
- ✅ Sadece format kontrolü yapılır (4-50 karakter, harf/rakam/tire/alt çizgi)

### Neden Bu Şekilde?

Etsy'nin bot koruması nedeniyle otomatik doğrulama yapılamıyor. İlerleye Etsy API entegrasyonu ile gerçek doğrulama eklenebilir.

## 🔧 Etsy API Entegrasyonu için Adımlar

1. [Etsy Developer Portal](https://www.etsy.com/developers/) hesabı oluştur
2. Yeni uygulama kaydet
3. API key ve secret al
4. `etsy-api-client` paketi kur:
   ```bash
   npm install @etsy/open-api-client
   ```
5. `etsy.service.js` dosyasını güncelle:
   ```javascript
   const { EtsyApi } = require('@etsy/open-api-client');
   
   async validateEtsyStore(shopName) {
     const api = new EtsyApi({ apiKey: process.env.ETSY_API_KEY });
     try {
       const shop = await api.getShop({ shop_id: shopName });
       return !!shop;
     } catch (error) {
       return false;
     }
   }
   ```

## 📝 Sonuç

Mevcut sistem **format kontrolü** yapıyor ve çalışıyor. Gerçek mağaza doğrulaması için Etsy API entegrasyonu yapılmalı.

