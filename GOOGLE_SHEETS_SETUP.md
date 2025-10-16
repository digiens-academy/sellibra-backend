# 📊 Google Sheets Otomatik Senkronizasyon Kurulumu

Bu rehber Google Sheets'in otomatik senkronizasyonunu aktif etmek için gerekli adımları içerir.

## ⚠️ ÖNEMLİ
Google Sheets kurulumu **opsiyoneldir**. Uygulama Google Sheets olmadan da çalışır, sadece veri senkronizasyonu yapılmaz.

---

## 🚀 HIZLI KURULUM (5 Dakika)

### 1️⃣ Google Cloud Project Oluştur

1. [console.cloud.google.com](https://console.cloud.google.com) adresine git
2. Sağ üstte **Proje Seç** > **Yeni Proje**
3. Proje adı: `Digiens Tracking`
4. **Oluştur**

### 2️⃣ Google Sheets API'yi Aktif Et

1. Sol menüden **APIs & Services** > **Enable APIs and Services**
2. Arama kutusuna "Google Sheets API" yaz
3. **Google Sheets API**'yi seç
4. **Enable** butonuna tıkla

### 3️⃣ Service Account Oluştur

1. Sol menüden **APIs & Services** > **Credentials**
2. **Create Credentials** > **Service Account**
3. Bilgileri doldur:
   - Service account name: `digiens-sheets-service`
   - Service account ID: otomatik doldurulur
   - **Create and Continue**
4. Role seç: **Editor**
5. **Continue** > **Done**

### 4️⃣ JSON Key İndir

1. Oluşturduğun service account'a tıkla
2. Üstteki **Keys** sekmesine git
3. **Add Key** > **Create New Key**
4. **JSON** seç
5. **Create** (dosya indirilecek)

### 5️⃣ JSON Dosyasını Yerleştir

İndirdiğin JSON dosyasını:
```
digiens-backend/config/google-credentials.json
```
konumuna taşı.

**Klasör yoksa oluştur:**
```bash
mkdir config
```

### 6️⃣ Google Sheet Oluştur

1. [sheets.google.com](https://sheets.google.com) adresine git
2. **Boş** tıklayarak yeni sheet oluştur
3. İlk satıra (A1'den başlayarak) şu başlıkları ekle:

```
Ad | Soyad | E-posta | Etsy Mağaza URL | Kayıt Tarihi | PrintNest Kayıt Olmuş
```

**Not:** Sheet adını değiştirmenize gerek yok! Sistem otomatik olarak tespit eder.

### 7️⃣ Sheet'i Service Account ile Paylaş

1. Sağ üstte **Paylaş** butonuna tıkla
2. JSON dosyasını aç ve `client_email` alanını kopyala
   - Örnek: `digiens-sheets-service@digiens-tracking.iam.gserviceaccount.com`
3. Bu email'i **Editor** yetkisiyle paylaş
4. **Gönder**

### 8️⃣ Sheet ID'yi Kopyala

Tarayıcı URL'sinden Sheet ID'yi kopyala:

```
https://docs.google.com/spreadsheets/d/1abc123def456ghi789jkl/edit
                                      ^^^^^^^^^^^^^^^^^^^^^^^^
                                         Bu kısım Sheet ID
```

### 9️⃣ Backend .env Dosyasını Güncelle

`.env` dosyasını aç ve `GOOGLE_SHEETS_ID` değerini güncelle:

```env
GOOGLE_SHEETS_ID=yukarıdaki-sheet-id-yi-buraya-yapıştır
```

### 🔟 Uygulamayı Yeniden Başlat

```bash
# Backend'i yeniden başlat
npm run dev
```

---

## ✅ Doğrulama

Backend başladığında şu mesajı görmelisin:
```
✅ Google Sheets API initialized successfully
```

Yeni bir kullanıcı kayıt olduğunda:
```
✅ User test@example.com automatically added to Google Sheets
```

---

## 📊 Otomatik Senkronizasyon Neler Yapar?

### ✅ Otomatik Çalışan İşlemler:

1. **Kullanıcı Kayıt Olduğunda**
   - Kullanıcı bilgileri anında Google Sheets'e eklenir
   - Başlangıç durumu: "PrintNest Kayıt Olmuş = HAYIR"

2. **Profil Güncellendiğinde**
   - Ad, soyad, Etsy mağaza URL güncellemeleri sheet'e yansır

3. **Admin Onay Verdiğinde**
   - "PrintNest Kayıt Olmuş" sütunu otomatik olarak "EVET" olur

### ❌ Manuel Sync Gereksiz

Admin panelindeki "Manuel Sync" butonu artık gereksiz. Tüm işlemler otomatik!

---

## 🐛 Sorun Giderme

### Hata: "Google Sheets not initialized"
- `config/google-credentials.json` dosyası var mı kontrol et
- JSON dosyası geçerli mi? (valid JSON formatında olmalı)
- `.env` dosyasında `GOOGLE_SHEETS_CREDENTIALS_PATH` doğru mu?

### Hata: "The caller does not have permission"
- Sheet'i service account email'i ile paylaştın mı?
- **Editor** yetkisi verdin mi?

### Hata: "Unable to parse range"
- İlk satırda başlıklar var mı?
- Sheet ID doğru mu?
- Sheet tamamen boş mu? (En az başlık satırı olmalı)

### Kullanıcı eklendi ama sheet'te görünmüyor
- Sheet ID doğru mu kontrol et
- Backend loglarını kontrol et: `npm run dev` çıktısına bak
- Google Sheets API kotasını aşmış olabilirsin (çok nadir)

---

## 🎉 Tamamlandı!

Artık her yeni kullanıcı otomatik olarak Google Sheets'e eklenecek. Admin müdahalesi gereksiz!

**Önemli Not:** Google Sheets olmadan da uygulama çalışır. Sadece veri senkronizasyonu yapılmaz.

