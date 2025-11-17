# Redis Database Kontrol Komutları

## ✅ Doğru Komut

```bash
for i in {0..15}; do
  echo "=== Database $i ==="
  redis-cli -n $i DBSIZE
  echo ""
done
```

## 🔍 Tek Tek Kontrol

```bash
# Database 0
redis-cli -n 0 DBSIZE

# Database 1
redis-cli -n 1 DBSIZE

# Database 2
redis-cli -n 2 DBSIZE
```

## 📊 Detaylı Kontrol (Key'lerle)

```bash
for i in {0..5}; do
  echo "=== Database $i ==="
  echo "Size: $(redis-cli -n $i DBSIZE)"
  echo "Keys:"
  redis-cli -n $i KEYS "*" | head -3
  echo ""
done
```

## 🚀 Hızlı Kontrol (Sadece Boş Olanları Bul)

```bash
for i in {0..15}; do
  size=$(redis-cli -n $i DBSIZE)
  if [ "$size" -eq 0 ]; then
    echo "Database $i: BOŞ (kullanılabilir)"
  fi
done
```

## 💡 Önerilen: Database 0-5 Kontrolü

```bash
for i in 0 1 2 3 4 5; do
  echo "Database $i: $(redis-cli -n $i DBSIZE) keys"
done
```

## ✅ Redis'ten Çıkış

Eğer `redis-cli` içindeyseniz:
```bash
exit
# VEYA
Ctrl+D
```

