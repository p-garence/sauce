# Étape 1 : Construction
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY docs/package*.json ./docs/
RUN npm ci && npm --prefix docs ci
COPY . .
ENV DATABASE_URL="postgres://dummy:dummy@localhost:5432/dummy"
ENV BETTER_AUTH_SECRET="un-faux-secret-tres-long-pour-passer-le-build"
ENV BETTER_AUTH_URL="http://localhost:3000"
ENV ORIGIN="http://localhost:3000"
RUN npm run build

# Étape 2 : Production
FROM node:22-alpine AS runner

RUN apk add --no-cache ffmpeg libc6-compat

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node --from=builder /app/build ./build
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node migrate.js ./migrate.js

USER node

EXPOSE 3000

# NOUVEAU : On chaîne les deux commandes. 
# Si migrate.js réussit, Node démarre le serveur SvelteKit.
CMD ["sh", "-c", "node migrate.js && node build/index.js"]