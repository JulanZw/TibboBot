# Tibbo discord bot - runs `src/index.ts` in prod mode (same as `npm run prod`)
FROM node:22-bookworm-slim

# openssl: required by the Prisma query engine
# fontconfig + fonts: required so canvas can render text in the stats images
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for better layer caching.
# Dev dependencies are kept because ts-node needs typescript + @types at runtime.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate

COPY tsconfig.json ./
COPY src ./src
COPY template ./template

ENV ENV=prod \
    NODE_ENV=production \
    DATABASE_URL="file:/app/data/JZZWutils.db"

# Persistent data: sqlite db, logs and channel backups
RUN mkdir -p /app/data /app/logs /app/backups && chown -R node:node /app
VOLUME ["/app/data", "/app/logs", "/app/backups"]

USER node

# Apply pending migrations (creates the db on first run), then start the bot
CMD ["sh", "-c", "npx prisma migrate deploy && exec node --loader ts-node/esm src/index.ts"]
