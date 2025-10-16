# Digiens Backend - PrintNest Tracking API

Backend API for tracking users who access PrintNest through the Digiens platform.

## Features

- User authentication (JWT)
- PrintNest session tracking
- Google Sheets synchronization
- Admin panel for user management

## Tech Stack

- Node.js + Express
- PostgreSQL + Prisma ORM
- JWT Authentication
- Google Sheets API

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### 3. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio
npm run prisma:studio
```

### 4. Google Sheets Setup (Optional - Auto Sync)

**Google Sheets is OPTIONAL.** The app works without it, but data won't sync automatically.

For automatic data synchronization to Google Sheets, see detailed guide:
📄 **[GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md)**

Quick steps:
1. Create Google Cloud project
2. Enable Google Sheets API
3. Create Service Account & download JSON
4. Save as `config/google-credentials.json`
5. Create Google Sheet named "Kullanıcılar"
6. Share sheet with service account email
7. Add Sheet ID to `.env`

**Note:** If not configured, you'll see a warning but the app will work fine.

### 5. Run Development Server

```bash
npm run dev
```

Server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### User
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/printnest-sessions` - Get user's PrintNest sessions

### PrintNest Tracking
- `POST /api/printnest/track-open` - Track iframe open
- `POST /api/printnest/track-close` - Track iframe close
- `POST /api/printnest/track-interaction` - Track user interaction

### Admin (Admin only)
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/confirm-printnest` - Confirm PrintNest registration
- `GET /api/admin/printnest-sessions` - Get all sessions
- `POST /api/admin/sync-to-sheets` - Manual Google Sheets sync

## Deployment

See deployment guide in the docs folder.

## License

ISC

