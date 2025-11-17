# Git History'den Secret Temizleme - Interactive Rebase

## 🔴 Sorun

Eski commit (`88e11cb8c135feef4f561d5be13cce1736ecb1e8`) hala history'de ve gerçek API key'ler içeriyor.

## ✅ Çözüm: Interactive Rebase

### Adım 1: Commit hash'ini bul

```powershell
git log --oneline | Select-String "88e11cb"
```

### Adım 2: Interactive Rebase Başlat

```powershell
# Son 10 commit'i rebase et (88e11cb dahil olacak şekilde)
git rebase -i 88e11cb^
```

VEYA commit sayısını bul:

```powershell
# 88e11cb'den önce kaç commit var?
git log --oneline | Select-String -Pattern "88e11cb" -Context 0,10
```

### Adım 3: Rebase Editor'de

1. `88e11cb` commit'ini bul
2. `pick` yerine `edit` yaz
3. Kaydet ve çık

### Adım 4: Commit'i Düzelt

```powershell
# Dosyaları düzelt
# ENV_EXAMPLE.md, REDIS_FINAL_SETUP.md, SERVER_ENV_UPDATE.md
# API key'leri placeholder'a çevir

# Değişiklikleri ekle
git add ENV_EXAMPLE.md REDIS_FINAL_SETUP.md SERVER_ENV_UPDATE.md

# Commit'i amend et
git commit --amend --no-edit

# Rebase'i devam ettir
git rebase --continue
```

### Adım 5: Force Push

```powershell
git push origin --force main
```

## 🚀 Alternatif: Basit Yöntem

Eğer interactive rebase karmaşık geliyorsa, GitHub'ın verdiği URL'den allow edin:

```
https://github.com/digiens-academy/sellibra-backend/security/secret-scanning/unblock-secret/35by0hYD63saiEjmzcb3Nsnf3jH
```

Bu en kolay ve hızlı çözüm!

