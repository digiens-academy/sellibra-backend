# 🚀 Hızlı Çözüm - Announcements Tablosu

## Sorun
Mevcut `announcements` tablosu yeni schema ile uyumsuz.

## ✅ Çözüm Adımları

### 1. DBeaver veya pgAdmin'i Aç

### 2. new_sellibra_db Veritabanına Bağlan

### 3. Bu SQL'i Çalıştır:

```sql
DROP TABLE IF EXISTS announcements CASCADE;
```

### 4. Terminal'de Bu Komutu Çalıştır:

```bash
npx prisma db push
```

### 5. Prisma Client'ı Güncelle:

```bash
npx prisma generate
```

## ✅ Tamamlandı!

Artık yeni announcements tablosu hazır ve backend kodlarınız çalışacak.

---

## 🔄 Alternatif: Verileri Korumak İsterseniz

Eğer mevcut 3 satırdaki veri önemliyse, `migrate_announcements.sql` dosyasını kullanın:

1. DBeaver/pgAdmin'de `migrate_announcements.sql` dosyasını açın
2. SQL'i adım adım çalıştırın
3. Eski verileri yeni tabloya taşıma kısmını aktif edin (yorum satırlarını kaldırın)
4. `npx prisma db push` komutunu çalıştırın

