# ---------- Builder ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Yalnızca manifestleri kopyala (cache için iyi)
COPY package*.json ./
COPY prisma ./prisma/

# (1) Tüm bağımlılıkları kur (dev dahil) -> prisma generate çalışabilsin
# Gerekirse native modüller için derleme araçları da ekleyebilirsin (yorumdan çıkar)
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 # && apt-get install -y --no-install-recommends python3 build-essential pkg-config \
 && rm -rf /var/lib/apt/lists/* \
 && npm ci

# (2) Prisma Client üret (Debian/glibc hedefi)
RUN npx prisma generate --schema=./prisma/schema.prisma --platform=linux-x64 || true

# (3) Uygulama kodunu kopyala
COPY . .

# (4) Prod'a düş (dev bağımlılıkları at) ve npm cache temizle
RUN npm prune --omit=dev && npm cache clean --force

# ---------- Runtime ----------
FROM node:22-bookworm-slim
WORKDIR /app

# dumb-init (PID1) ve timezone (opsiyonel) kur
RUN apt-get update \
 && apt-get install -y --no-install-recommends dumb-init tzdata ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV TZ=Europe/Istanbul
ENV NODE_ENV=production

# Non-root kullanıcı oluştur (Debian komutları)
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g 1001 -M -s /usr/sbin/nologin nodejs

# Builder'dan artefact'lar
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --chown=nodejs:nodejs . .

# Upload klasörleri
RUN mkdir -p /app/uploads/temp && chown -R nodejs:nodejs /app/uploads

USER nodejs
EXPOSE 5000

# (İsteğe bağlı) healthcheck yolunu app’ine göre sabitle (örn. /health)
# HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
#   CMD node -e "require('http').get('http://localhost:5000/health', r => process.exit(r.statusCode===200?0:1))"

ENTRYPOINT ["dumb-init","--"]
CMD ["node","src/server.js"]
