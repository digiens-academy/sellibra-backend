# Git Pull ve Push

## 🔴 Sorun

Remote'ta local'de olmayan commit'ler var. Önce pull yapmanız gerekiyor.

## ✅ Çözüm

### 1. Remote Değişiklikleri Çek

```powershell
git pull origin main
```

Eğer conflict varsa, çözmeniz gerekecek.

### 2. Conflict Varsa

```powershell
# Conflict'leri çöz
# Dosyaları düzenle, sonra:
git add .
git commit -m "Merge remote changes"
```

### 3. Push Et

```powershell
git push origin main
```

## 🚀 Hızlı Çözüm

```powershell
# 1. Pull yap
git pull origin main

# 2. Eğer conflict yoksa, push et
git push origin main
```

## ⚠️ Eğer Conflict Varsa

```powershell
# Conflict'leri görmek için
git status

# Conflict'leri çözmek için dosyaları düzenle
# Sonra:
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

## 💡 Alternatif: Rebase (Daha Temiz History)

```powershell
# Pull with rebase
git pull --rebase origin main

# Eğer conflict varsa, çöz ve:
git add .
git rebase --continue

# Push et
git push origin main
```

