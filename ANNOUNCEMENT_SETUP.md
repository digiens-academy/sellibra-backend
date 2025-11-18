# Duyuru Sistemi Kurulum Talimatları

## ⚠️ ÖNEMLİ: Backend Sunucusunu Durdurun!

Migration uygulamadan önce backend sunucusunu **MUTLAKA** durdurun.

## Adım Adım Kurulum:

### 1. Backend Sunucusunu Durdurun
Terminal'de `Ctrl + C` ile backend sunucusunu durdurun.

### 2. Migration'ı Uygula
```powershell
cd C:\Users\BurakT\Desktop\DIGIENS\workspace\digiens-backend
npx prisma migrate deploy
```

### 3. Prisma Client'ı Yeniden Generate Et
```powershell
npx prisma generate
```

### 4. Backend Sunucusunu Yeniden Başlat
```powershell
npm run dev
# veya
npm start
```

## ✅ Kurulum Tamamlandı!

Şimdi şunları yapabilirsiniz:

### Admin Paneli:
- `/admin/announcements` sayfasına gidin
- Yeni duyuru oluşturun
- Duyuruları yönetin

### Test İçin Örnek Duyuru:
```
Başlık: Hoş Geldiniz!
İçerik: Duyuru sistemi başarıyla kuruldu. Artık kullanıcılara duyuru yapabilirsiniz.
Tip: success
Öncelik: high
Durum: Aktif
```

## 🔍 Sorun Giderme:

### Hata: "Cannot read properties of undefined (reading 'findMany')"
**Çözüm:** Prisma Client generate edilmemiş. Adım 3'ü tekrarlayın.

### Hata: Migration hatası
**Çözüm:** 
1. PostgreSQL veritabanının çalıştığından emin olun
2. `.env` dosyasındaki `DATABASE_URL`'i kontrol edin
3. Migration'ı manuel olarak uygulayın:

```sql
-- PostgreSQL'de manuel olarak çalıştırın
-- Dosya: prisma/migrations/20251118133548_add_announcements/migration.sql
```

### Backend sunucu başlamıyor
**Çözüm:**
1. `node_modules` klasörünü silin: `rm -rf node_modules`
2. Yeniden yükleyin: `npm install`
3. Prisma generate: `npx prisma generate`
4. Sunucuyu başlatın: `npm run dev`

## 📋 Kontrol Listesi:

- [ ] Backend sunucusu durduruldu
- [ ] Migration uygulandı (`npx prisma migrate deploy`)
- [ ] Prisma Client generate edildi (`npx prisma generate`)
- [ ] Backend sunucu başlatıldı
- [ ] `/admin/announcements` sayfası açılıyor
- [ ] Yeni duyuru oluşturulabiliyor
- [ ] Kullanıcı panelinde duyuru görünüyor

## 🎯 Sonraki Adımlar:

1. Admin panelinden test duyurusu oluşturun
2. Farklı kullanıcı hesabıyla giriş yapıp duyurunun göründüğünü kontrol edin
3. "Bir daha gösterme" özelliğini test edin
4. Farklı tip ve önceliklerde duyurular oluşturun

---

Kurulum tamamlandıktan sonra bu dosyayı silebilirsiniz.

