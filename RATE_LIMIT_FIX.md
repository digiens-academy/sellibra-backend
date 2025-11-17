# Rate Limit Hatası Düzeltme

## 🔴 Sorun

"Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin." hatası.

## ✅ Yapılan Düzeltmeler

### 1. Auth Rate Limit Artırıldı

- **Önceki**: 15 dakikada 5 deneme
- **Yeni**: 15 dakikada 15 deneme

### 2. Trust Proxy Eklendi

Express'e `trust proxy` ayarı eklendi (Nginx/reverse proxy için gerekli).

## 🚀 Server'da Yapılacaklar

### 1. Kod Değişikliğini Pull Et

```bash
cd /home/root/sellibra/backend
git pull origin main
```

### 2. Container'ı Yeniden Build Et

```bash
cd /home/root/sellibra/deployment
docker-compose build backend
docker-compose up -d backend
```

### 3. Rate Limit'i Geçici Olarak Sıfırla (Opsiyonel)

Eğer hala rate limit'e takılıyorsanız, container'ı yeniden başlatmak rate limit'i sıfırlar (memory store kullanıldığı için):

```bash
docker-compose restart backend
```

## 🔧 Alternatif: Rate Limit'i Daha da Artır

Eğer 15 deneme yeterli değilse, `server.js` dosyasında:

```javascript
max: 20, // Veya daha fazla
```

## ✅ Beklenen Sonuç

- Rate limit: 15 dakikada 15 deneme
- Trust proxy hatası düzeltildi
- Daha iyi kullanıcı deneyimi

