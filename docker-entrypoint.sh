#!/bin/sh
set -e

echo "🚀 Starting Sellibra Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
max_retries=30
counter=0

until node -e "const {prisma} = require('./src/config/database'); prisma.\$connect().then(() => {console.log('DB Connected'); process.exit(0);}).catch(() => process.exit(1));" 2>/dev/null; do
  counter=$((counter + 1))
  if [ $counter -gt $max_retries ]; then
    echo "❌ Database connection timeout after $max_retries attempts"
    exit 1
  fi
  echo "⏳ Database is unavailable - sleeping (attempt $counter/$max_retries)"
  sleep 2
done

echo "✅ Database is ready!"

# Run Prisma migrations
echo "📦 Running Prisma migrations..."
npx prisma migrate deploy || echo "⚠️ Migration warning (may be already applied)"

# Start the application
echo "🎯 Starting application..."
exec "$@"

