#!/bin/sh
set -e

echo "Syncing database schema..."
npx prisma db push --schema=packages/backend/prisma/schema.prisma --skip-generate

echo "Setting up admin account..."
node packages/backend/dist/seed.js 2>/dev/null || echo "(admin setup skipped or already exists)"

echo "Starting backend..."
exec node packages/backend/dist/main.js
