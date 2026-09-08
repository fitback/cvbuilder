#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy --schema=packages/backend/prisma/schema.prisma

echo "Setting up admin account..."
node packages/backend/dist/seed.js 2>/dev/null || echo "(admin setup skipped or already exists)"

echo "Starting backend..."
exec node packages/backend/dist/main.js
