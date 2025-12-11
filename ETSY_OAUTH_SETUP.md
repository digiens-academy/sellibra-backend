# Etsy OAuth Setup Guide

Bu rehber, Etsy Commercial API entegrasyonu için gerekli adımları açıklar.

## 📋 Gerekli Environment Variables

`.env` dosyanıza aşağıdaki değişkenleri ekleyin:

```env
# Etsy API Configuration (OAuth)
ETSY_CLIENT_ID=your_etsy_client_id
ETSY_CLIENT_SECRET=your_etsy_client_secret
ETSY_REDIRECT_URI=http://localhost:5000/api/etsy-oauth/callback
ETSY_API_URL=https://api.etsy.com/v3

# Encryption Key (32 characters for AES-256)
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Frontend URL (for OAuth callback redirects)
FRONTEND_URL=http://localhost:5173
```

## 🔧 Kurulum Adımları

### 1. Etsy Developer Hesabı Oluşturma

1. https://www.etsy.com/developers/ adresine gidin
2. Etsy hesabınızla giriş yapın
3. "Register as a Developer" butonuna tıklayın
4. Gerekli bilgileri doldurun

### 2. Yeni Uygulama Oluşturma

1. Developer Dashboard'a gidin
2. "Apps" sekmesine tıklayın
3. "Create a New App" butonuna tıklayın
4. Uygulama bilgilerini doldurun:
   - **App Name**: Sellibra (veya uygulamanızın adı)
   - **App Description**: Etsy mağaza entegrasyonu için AI destekli e-ticaret platformu
   - **Website URL**: https://yourdomain.com (canlı URL'iniz)
   - **Redirect URI**: `http://localhost:5000/api/etsy-oauth/callback` (development için)
   - **Permissions**: 
     - `listings_r` - Read listings
     - `shops_r` - Read shop information
     - `transactions_r` - Read transactions (optional)

5. "Create App" butonuna tıklayın

### 3. API Anahtarlarını Alma

Uygulama oluşturulduktan sonra:

1. App detay sayfasında **Keystring** (Client ID) ve **Shared Secret** (Client Secret) değerlerini bulun
2. Bu değerleri `.env` dosyanıza kopyalayın:
   ```env
   ETSY_CLIENT_ID=abc123def456...
   ETSY_CLIENT_SECRET=xyz789uvw456...
   ```

### 4. Encryption Key Oluşturma

OAuth tokenlarını güvenli saklamak için bir encryption key oluşturun:

```bash
# Node.js ile random key oluşturma
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Çıkan değeri `.env` dosyasına ekleyin:
```env
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### 5. Database Migration

```bash
# Backend dizininde
npx prisma migrate dev --name add_etsy_oauth_fields
npx prisma generate
```

### 6. Uygulamayı Test Etme

#### Backend'i Başlatın:
```bash
cd digiens-backend
npm run dev
```

#### Frontend'i Başlatın:
```bash
cd digiens-frontend
npm run dev
```

#### Test Akışı:
1. Tarayıcıda `http://localhost:5173` adresine gidin
2. Giriş yapın
3. Profile sayfasına gidin
4. "Etsy Bağla" butonuna tıklayın
5. Etsy'ye yönlendirileceksiniz
6. İzinleri onaylayın
7. Profile sayfasına geri dönersiniz
8. Mağazanızın "Bağlı" olarak göründüğünü kontrol edin

## 🚀 Production Deployment

Production'a geçerken:

### 1. Redirect URI'yi Güncelleyin

Etsy Developer Dashboard'da:
- Development: `http://localhost:5000/api/etsy-oauth/callback`
- Production: `https://api.yourdomain.com/api/etsy-oauth/callback`

### 2. Environment Variables

Production `.env` dosyanızda:
```env
NODE_ENV=production
ETSY_REDIRECT_URI=https://api.yourdomain.com/api/etsy-oauth/callback
FRONTEND_URL=https://yourdomain.com
```

### 3. SSL/HTTPS

- Production'da mutlaka HTTPS kullanın
- Etsy, güvenli olmayan callback URL'leri kabul etmez

### 4. Domain Verification

Etsy'ye başvuru yaparken:
- Gerçek domain name (yourdomain.com)
- Privacy Policy URL (https://yourdomain.com/privacy-policy)
- Terms of Service URL (https://yourdomain.com/terms-of-service)
- App açıklaması ve kullanım senaryoları

## 📝 Etsy'ye Başvuru

### Gerekli Sayfalar (Hazır ✅):
- ✅ Privacy Policy: `/privacy-policy`
- ✅ Terms of Service: `/terms-of-service`
- ✅ Cookie Policy: `/cookie-policy`

### Başvuru Formu Bilgileri:

**App Name**: Sellibra

**App Description**: 
```
Sellibra is an AI-powered e-commerce platform that helps Etsy sellers manage their stores more efficiently. We provide:
- AI-generated product titles and descriptions
- Design tools (background removal, mockup generation)
- Profit calculator
- Print-on-demand integration

We use the Etsy API to securely connect sellers' stores and provide analytics and management features.
```

**How will you use Etsy data?**:
```
We will use the following Etsy data:
- Shop information (name, ID, URL) - to display connected shops
- Listings data - to provide analytics and suggestions
- Transaction data (optional) - for profit calculations

We DO NOT:
- Share data with third parties
- Store sensitive payment information
- Access user passwords (OAuth only)

All data is encrypted and stored securely. Users can disconnect their shops anytime.
```

**Requested Scopes**:
- `listings_r` - Read product listings
- `shops_r` - Read shop information
- `transactions_r` - Read orders (optional)

### İnceleme Süresi:
- Genellikle 3-7 iş günü
- Bazen ek bilgi istenebilir

## 🔐 Güvenlik Notları

1. **Tokenları Şifreleyin**: Tüm access/refresh tokenlar encrypt edilerek saklanır
2. **HTTPS Kullanın**: Production'da sadece HTTPS
3. **Token Yenileme**: Access tokenlar 1 saat geçerli, otomatik yenilenir
4. **Rate Limiting**: Etsy API limitlerine uyun (10,000 req/day)
5. **Error Handling**: Token expired hatalarını handle edin

## 🐛 Troubleshooting

### "Invalid redirect_uri" hatası:
- Etsy Developer Dashboard'da kayıtlı redirect URI ile `.env` dosyasındaki URI'nin tam olarak eşleştiğinden emin olun
- Trailing slash (/) dikkat edin

### "Invalid state" hatası:
- State timeout (10 dakika). Kullanıcı OAuth flow'u 10 dakika içinde tamamlamalı
- Multiple tab'lerde aynı anda OAuth başlatılmış olabilir

### "Token expired" hatası:
- "Yenile" butonuna tıklayın veya yeniden bağlanın
- Auto-refresh mekanizması çalışıyorsa otomatik yenilenecektir

### "Shop not found" hatası:
- Kullanıcının aktif bir Etsy mağazası olmayabilir
- Etsy hesabı seller hesabı değil, buyer hesabı olabilir

## 📞 Destek

Sorularınız için:
- Email: support@sellibra.com
- Etsy Developers Forum: https://community.etsy.com/

## ✅ Checklist

Etsy'ye başvurmadan önce kontrol edin:

- [ ] Privacy Policy sayfası canlı ve erişilebilir
- [ ] Terms of Service sayfası canlı ve erişilebilir
- [ ] Cookie Policy sayfası canlı ve erişilebilir
- [ ] OAuth flow test edildi ve çalışıyor
- [ ] SSL sertifikası aktif (production)
- [ ] Domain name kayıtlı ve aktif
- [ ] Uygulama açıklaması hazır
- [ ] Logo ve brand assets hazır
- [ ] Tüm environment variables production'da set edildi
- [ ] Database migration yapıldı
- [ ] Error handling ve logging aktif

