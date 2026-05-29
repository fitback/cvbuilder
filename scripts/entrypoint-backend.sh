#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy --schema=packages/backend/prisma/schema.prisma

echo "Starting backend..."
exec node packages/backend/dist/main.js
