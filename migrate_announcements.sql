-- Announcements tablosu migration scripti
-- Bu script mevcut verileri koruyarak yeni schema'ya geçiş yapar

-- Adım 1: Mevcut tabloyu yedekle
ALTER TABLE IF EXISTS announcements RENAME TO announcements_backup;

-- Adım 2: Yeni announcements tablosunu oluştur
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_active BOOLEAN NOT NULL DEFAULT true,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Adım 3: İndeksleri oluştur
CREATE INDEX announcements_is_active_idx ON announcements(is_active);
CREATE INDEX announcements_start_date_end_date_idx ON announcements(start_date, end_date);

-- Adım 4: Eski verileri yeni tabloya taşı (eğer uyumluysa)
-- NOT: Bu kısım isteğe bağlı - eski verilerin yapısına göre düzenleyin
-- INSERT INTO announcements (title, message, type, start_date, end_date, created_by, created_at)
-- SELECT 
--   title,
--   COALESCE(message, 'Varsayılan mesaj') as message,  -- NULL'ları doldur
--   COALESCE(type, 'info') as type,
--   COALESCE(start_date, NOW()) as start_date,          -- NULL'ları şimdiki zamanla doldur
--   COALESCE(end_date, NOW() + INTERVAL '7 days') as end_date,
--   1 as created_by,                                     -- Admin ID'si (düzenleyin)
--   COALESCE(created_at, NOW()) as created_at
-- FROM announcements_backup;

-- Adım 5: Yedek tabloyu sil (isteğe bağlı - önce kontrol edin!)
-- DROP TABLE IF EXISTS announcements_backup;

COMMENT ON TABLE announcements IS 'Kullanıcı bildirimleri ve duyurular';

