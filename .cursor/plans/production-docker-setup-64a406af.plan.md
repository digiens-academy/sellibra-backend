<!-- 64a406af-807d-4ec0-9a14-e0777157d782 0f851004-ec1b-4e90-9d19-0148ba49edaf -->
# Production Docker Deployment Setup

## Dosya Yapısı

```
digiens-backend/
├── Dockerfile
├── .dockerignore
├── .env.production (template)
└── ...

digiens-frontend/
├── Dockerfile
├── .dockerignore
├── .env.production (template)
└── ...

deployment/
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
└── scripts/
    ├── deploy.sh
    └── backup-db.sh
```

## Backend Dockerfile

`digiens-backend/Dockerfile` oluştur:

- Node 18 alpine base image
- Production dependencies install
- Prisma generate
- Multi-stage build (builder + production)
- Health check endpoint
- Port 5000 expose

## Frontend Dockerfile

`digiens-frontend/Dockerfile` oluştur:

- Multi-stage build: builder + nginx serve
- Stage 1: Node 18 ile build (vite build)
- Stage 2: Nginx alpine ile static files serve
- Port 80 expose

## Docker Compose

`deployment/docker-compose.yml` oluştur:

- Services: postgres, backend, frontend, nginx
- PostgreSQL 15 with volume mount
- Backend depends on postgres
- Frontend builds from source
- Nginx reverse proxy (80, 443 ports)
- Networks: internal network for services
- Volumes: postgres-data, backend-uploads

## Nginx Configuration

`deployment/nginx/nginx.conf` oluştur:

- Reverse proxy for backend API (/api -> backend:5000)
- Static file serving for frontend
- SSL ready (commented out, domain sonradan eklenecek)
- Gzip compression
- Security headers
- Client max body size for uploads

## Environment Templates

Backend `.env.production` template:

```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://digiens:password@postgres:5432/digiens_db
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d
FRONTEND_URL=http://YOUR_SERVER_IP
GOOGLE_SHEETS_CREDENTIALS_PATH=/app/src/config/google-credentials.json
GOOGLE_SHEETS_ID=your-sheet-id
PRINTNEST_URL=https://printnest.com
```

Frontend `.env.production` template:

```
VITE_API_URL=http://YOUR_SERVER_IP/api
```

## Docker Ignore Files

Backend `.dockerignore`:

- node_modules
- npm-debug.log
- .env*
- .git
- uploads/*

Frontend `.dockerignore`:

- node_modules
- dist
- .env*
- .git

## Deployment Scripts

`deployment/scripts/deploy.sh`:

- Pull latest code
- Build and restart containers
- Run database migrations
- Health checks

`deployment/scripts/backup-db.sh`:

- PostgreSQL backup script
- Timestamp naming
- Retention policy

## Production Package.json Updates

Backend package.json'a ekle:

```json
"scripts": {
  "start": "node src/server.js",
  "prisma:migrate:deploy": "prisma migrate deploy"
}
```

## Vite Config Production

Frontend vite.config.js'e production build ayarları:

- Base path configuration
- Build optimization
- Asset handling

## Implementation Steps

1. Backend Dockerfile oluştur
2. Frontend Dockerfile oluştur
3. Docker Compose file oluştur
4. Nginx configuration oluştur
5. Environment templates oluştur
6. Dockerignore files oluştur
7. Deployment scripts oluştur
8. DEPLOYMENT.md documentation oluştur

## Server'da Çalıştırma Komutları

```bash
# Initial setup
cd deployment
cp .env.production.example .env.production
# Edit .env.production with your values
nano .env.production

# Build and start
docker-compose up -d --build

# Run migrations
docker-compose exec backend npx prisma migrate deploy

# View logs
docker-compose logs -f

# Stop
docker-compose down

# With volume cleanup
docker-compose down -v
```

## SSL Ekleme (Domain hazır olunca)

Nginx config'e Let's Encrypt certbot integration:

1. Certbot container ekle
2. SSL certificates mount et
3. Nginx SSL configuration aktif et
4. Auto-renewal setup

### To-dos

- [ ] Backend için production Dockerfile oluştur (multi-stage build, prisma generate)
- [ ] Frontend için production Dockerfile oluştur (vite build + nginx serve)
- [ ] Docker Compose file oluştur (postgres, backend, frontend, nginx services)
- [ ] Nginx reverse proxy configuration oluştur
- [ ] Production environment variable templates oluştur
- [ ] Backend ve Frontend için .dockerignore files oluştur
- [ ] Deployment ve backup scripts oluştur
- [ ] DEPLOYMENT.md documentation oluştur