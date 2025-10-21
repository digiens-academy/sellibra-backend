# Admin Kullanıcı Yönetimi Kurulumu

## 🎯 Genel Bakış

Bu döküman, sistemde otomatik olarak oluşturulan default super admin kullanıcısı ve admin paneli özelliklerini açıklar.

## 🔐 Default Super Admin Kullanıcısı

Uygulama her başlatıldığında otomatik olarak aşağıdaki super admin kullanıcısı oluşturulur (eğer yoksa):

```
Email: admin@admin.com
Password: password
```

### Özellikler:
- ✅ Super admin rolünde (`isSuperAdmin: true`)
- ✅ Silinemez
- ✅ Varsayılan olarak 999999 token ile gelir (sınırsız)
- ✅ PrintNest otomatik onaylı

⚠️ **ÖNEMLİ**: İlk giriş yapıldıktan sonra şifreyi mutlaka değiştirin!

## 📋 Admin Panel Özellikleri

Admin paneli (`/admin`) şu özelliklere sahiptir:

### 1. Kullanıcı Görüntüleme
- Tüm kullanıcıları listeleme
- Kullanıcı arama (isim, email)
- Detaylı kullanıcı bilgileri görüntüleme
- PrintNest oturum geçmişi

### 2. Rol Yönetimi
- Kullanıcılara admin rolü verme
- Admin'den normal kullanıcıya düşürme
- Super admin silinemez ve rolü değiştirilemez

### 3. Token Yönetimi
- Kullanıcıların günlük token miktarını görüntüleme
- Token miktarını güncelleme
- Tokenleri varsayılan değere (40) sıfırlama
- Hızlı token değerleri: 40, 100, 500, 1000

### 4. Kullanıcı Yönetimi
- PrintNest kaydını onaylama
- Kullanıcı silme (super admin hariç)
- Kullanıcı istatistikleri

### 5. Google Sheets Senkronizasyonu
- Manuel senkronizasyon
- Senkronizasyon logları

## 🔧 Teknik Detaylar

### Backend Endpoint'ler

```javascript
// Kullanıcı Yönetimi
GET    /api/admin/users                    // Tüm kullanıcıları listele
GET    /api/admin/users/:id                // Kullanıcı detayları
PUT    /api/admin/users/:id/role           // Rol güncelle
PUT    /api/admin/users/:id/tokens         // Token güncelle
POST   /api/admin/users/:id/reset-tokens   // Tokenleri sıfırla
DELETE /api/admin/users/:id                // Kullanıcı sil

// Diğer
PUT    /api/admin/users/:id/confirm-printnest  // PrintNest onayla
GET    /api/admin/stats                         // İstatistikler
POST   /api/admin/sync-to-sheets                // Google Sheets sync
GET    /api/admin/sync-logs                     // Sync logları
```

### Database Schema

```prisma
model User {
  // ... diğer alanlar
  role              String   @default("user")     // "user" or "admin"
  isSuperAdmin      Boolean  @default(false)      // Super admin (silinemez)
  dailyTokens       Int      @default(40)         // Günlük token limiti
  lastTokenReset    DateTime @default(now())      // Son token sıfırlama
  // ...
}
```

## 🚀 Kurulum ve Çalıştırma

1. **Migration'ı çalıştır**:
```bash
cd digiens-backend
npx prisma migrate deploy
```

2. **Server'ı başlat**:
```bash
npm run dev
```

3. **Super admin otomatik oluşturulacaktır**. Konsol çıktısında göreceksiniz:
```
✓ Super admin user created successfully
  Email: admin@admin.com
  Password: password
  ⚠️  PLEASE CHANGE THE DEFAULT PASSWORD AFTER FIRST LOGIN!
```

4. **Admin paneline giriş yap**:
   - Frontend'e git: `http://localhost:5173/login`
   - Email: `admin@admin.com`
   - Password: `password`
   - Admin paneline erişim: `http://localhost:5173/admin`

## 🛡️ Güvenlik

### Super Admin Koruması
- Super admin kullanıcısı silinemez
- Silme denemesi yapılırsa hata döner: `"Super admin kullanıcısı silinemez"`
- Frontend'de super admin için silme butonu gösterilmez

### Rol Yönetimi
- Sadece admin'ler diğer kullanıcılara admin rolü verebilir
- Super admin rolü manuel olarak verilemez (database'de manuel eklenmeli)

### Token Yönetimi
- Admin'ler tüm kullanıcıların tokenlerini yönetebilir
- Token miktarı negatif olamaz
- Varsayılan token: 40
- Super admin: 999999 (sınırsız)

## 📝 Kullanım Örnekleri

### Admin Rolü Verme
```javascript
// Frontend
await adminApi.updateUserRole(userId, 'admin');

// Backend
PUT /api/admin/users/5/role
Body: { "role": "admin" }
```

### Token Güncelleme
```javascript
// Frontend
await adminApi.updateUserTokens(userId, 100);

// Backend
PUT /api/admin/users/5/tokens
Body: { "dailyTokens": 100 }
```

### Token Sıfırlama
```javascript
// Frontend
await adminApi.resetUserTokens(userId);

// Backend
POST /api/admin/users/5/reset-tokens
```

## 🔄 Migration Dosyası

Migration dosyası otomatik oluşturulmuştur:
```
migrations/20251021101743_add_super_admin_field/migration.sql
```

Değişiklikler:
- `is_super_admin` BOOLEAN alanı eklendi (default: false)

## 📌 Notlar

1. Super admin kullanıcısı her server restart'ında kontrol edilir ve yoksa oluşturulur
2. Şifre bcrypt ile hash'lenir
3. Super admin varsayılan olarak tüm özelliklere sahiptir
4. Admin paneli sadece admin rolüne sahip kullanıcılar tarafından erişilebilir
5. Tüm admin işlemleri loglanır

## 🆘 Sorun Giderme

### Super admin oluşturulmadı
- Database bağlantısını kontrol edin
- Migration'ın çalıştığından emin olun
- Server loglarını kontrol edin

### Admin paneline erişemiyorum
- Kullanıcı rolünün "admin" olduğundan emin olun
- Token'ın geçerli olduğunu kontrol edin
- Browser console'da hata var mı bakın

### Super admin silinemiyor hatası
- Bu normal bir davranıştır
- Super admin korunmaktadır ve silinemez
- Başka bir admin kullanıcı oluşturun

## 📚 İlgili Dosyalar

### Backend
- `src/utils/initAdmin.js` - Super admin oluşturma
- `src/server.js` - Super admin başlatma
- `src/services/admin.service.js` - Admin servis fonksiyonları
- `src/controllers/admin.controller.js` - Admin controller
- `src/routes/admin.routes.js` - Admin route'ları
- `prisma/schema.prisma` - Database şeması

### Frontend
- `src/pages/admin/AdminDashboard.jsx` - Admin panel UI
- `src/api/adminApi.js` - Admin API fonksiyonları
- `src/components/common/AdminRoute.jsx` - Admin route guard

