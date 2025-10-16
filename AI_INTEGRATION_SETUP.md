# AI Entegrasyonu Kurulum Rehberi

## 🎨 Özellikler

Bu entegrasyon ile aşağıdaki AI özellikleri eklenmiştir:

1. **Remove Background** - Görselden arka plan kaldırma (Remove.bg API)
2. **Text-to-Image** - Metin açıklamasından görsel oluşturma (OpenAI DALL-E 3)
3. **Image-to-Image** - Mevcut görseli düzenleme (OpenAI DALL-E 2)

## 🔑 Gerekli API Key'leri

### 1. Remove.bg API Key (Arka Plan Kaldırma için)

**Ücretsiz Plan:**
- Ayda 50 görsel işleme hakkı
- API Key almak için: https://www.remove.bg/api

**Adımlar:**
1. https://www.remove.bg/users/sign_up adresinden kayıt olun
2. Dashboard'dan API Key'inizi alın
3. `.env` dosyanıza ekleyin:
   ```
   REMOVE_BG_API_KEY=your-api-key-here
   ```

**Not:** API key olmadan sistem "mock mode" ile çalışır (test için).

### 2. OpenAI API Key (Text-to-Image ve Image-to-Image için)

**Ücretli Plan:**
- DALL-E 3: $0.040 - $0.120 per image (boyuta göre)
- DALL-E 2: $0.016 - $0.020 per image
- API Key almak için: https://platform.openai.com/api-keys

**Adımlar:**
1. https://platform.openai.com/signup adresinden kayıt olun
2. Hesabınıza kredi yükleyin ($5 minimum)
3. API Key oluşturun: https://platform.openai.com/api-keys
4. `.env` dosyanıza ekleyin:
   ```
   OPENAI_API_KEY=sk-...your-api-key-here
   ```

## 📝 .env Dosyası Yapılandırması

`.env` dosyanıza aşağıdaki satırları ekleyin:

```env
# AI Services
# OpenAI API Key (for Text-to-Image and Image-to-Image)
OPENAI_API_KEY=your-openai-api-key-here

# Remove.bg API Key (for Background Removal)
# Get your free API key from: https://www.remove.bg/api
REMOVE_BG_API_KEY=your-removebg-api-key-here
```

## 🚀 API Endpoints

### Remove Background
```
POST /api/ai/remove-background
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
- image: File (max 10MB)
```

### Text-to-Image
```
POST /api/ai/text-to-image
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "prompt": "A t-shirt design with colorful abstract patterns",
  "size": "1024x1024",  // optional: 1024x1024, 1024x1792, 1792x1024
  "quality": "standard", // optional: standard, hd
  "style": "vivid"      // optional: vivid, natural
}
```

### Image-to-Image
```
POST /api/ai/image-to-image
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
- image: File
- prompt: string
- size: string (optional)
```

## 🧪 Test Etme

### 1. Backend'i Başlatın
```bash
cd digiens-backend
npm start
```

### 2. Frontend'i Başlatın
```bash
cd digiens-frontend
npm run dev
```

### 3. Test Adımları

1. Uygulamaya giriş yapın
2. "Etsy-AI Tools" → "Tasarım" → "Arka Plan Kaldırma" sayfasına gidin
3. Bir görsel yükleyin ve "Arka Planı Kaldır" butonuna tıklayın

## ⚠️ Önemli Notlar

### Mock Mode
- `REMOVE_BG_API_KEY` yoksa, sistem mock mode'da çalışır
- Mock mode'da görsel sadece PNG'ye çevrilir, arka plan kaldırılmaz
- Test için yeterlidir, production'da mutlaka API key ekleyin

### Dosya Boyutu Limitleri
- Maksimum: 10MB
- Desteklenen formatlar: JPG, PNG, WEBP, GIF

### Rate Limiting
- Remove.bg ücretsiz plan: 50 istek/ay
- OpenAI: Hesap limitine göre değişir

### Güvenlik
- Yüklenen dosyalar geçici olarak `uploads/temp/` klasörüne kaydedilir
- İşlem bittikten sonra otomatik silinir
- Production'da mutlaka güvenlik ayarlarını kontrol edin

## 🐛 Sorun Giderme

### "Remove.bg API key bulunamadı" hatası
- `.env` dosyanızda `REMOVE_BG_API_KEY` tanımlı mı kontrol edin
- Server'ı yeniden başlatın

### "OpenAI API yapılandırması eksik" hatası
- `.env` dosyanızda `OPENAI_API_KEY` tanımlı mı kontrol edin
- API key'inizin geçerli ve kredisi olduğundan emin olun

### Dosya yükleme hatası
- Dosya boyutunun 10MB'dan küçük olduğundan emin olun
- Dosya formatının desteklendiğini kontrol edin

## 📊 Maliyet Tahmini

### Remove.bg
- Ücretsiz: 50 görsel/ay
- Subscription: $9/ay (500 görsel)

### OpenAI DALL-E
- DALL-E 3 (1024x1024): $0.040/görsel
- DALL-E 3 (1024x1792 veya 1792x1024): $0.080/görsel
- DALL-E 2: $0.020/görsel

## 🔮 Gelecek Geliştirmeler

- [ ] Toplu görsel işleme
- [ ] Görsel history/galeri
- [ ] Farklı arka plan renkleri ekleme
- [ ] Image-to-Image için variation oluşturma
- [ ] Stability AI entegrasyonu (alternatif)

