# YAML Dosyası Kontrolü

## 🔍 YAML Syntax Kontrolü

### 1. Python ile YAML Validator

```bash
# Python yaml modülü ile kontrol et
python3 -c "import yaml; yaml.safe_load(open('docker-compose.yml'))" 2>&1
```

### 2. Tüm Dosyayı Kontrol Et

```bash
# Tüm dosyayı görüntüle
cat docker-compose.yml

# VEYA satır numaraları ile
cat -n docker-compose.yml
```

### 3. Olası Sorun: REDIS_KEY_PREFIX

`REDIS_KEY_PREFIX: sellibra:` değerinde `:` karakteri var. YAML'da bu sorun yaratabilir. Tırnak içine alın:

```yaml
      REDIS_KEY_PREFIX: "sellibra:"
```

VEYA

```yaml
      REDIS_KEY_PREFIX: 'sellibra:'
```

## ✅ Düzeltilmiş Format

```yaml
      RESEND_API_KEY: ${RESEND_API_KEY}
      REDIS_URL: redis://n8n-redis-1:6379/0
      REDIS_KEY_PREFIX: "sellibra:"
      TZ: Europe/Istanbul
```

## 🚀 Hızlı Düzeltme

```bash
cd /home/root/sellibra/deployment

# REDIS_KEY_PREFIX satırını tırnak içine al
sed -i 's/REDIS_KEY_PREFIX: sellibra:/REDIS_KEY_PREFIX: "sellibra:"/' docker-compose.yml

# Kontrol et
cat docker-compose.yml | grep -A 2 -B 2 REDIS

# YAML syntax kontrolü
python3 -c "import yaml; yaml.safe_load(open('docker-compose.yml'))" 2>&1

# Container'ı yeniden başlat
docker-compose restart backend
```

