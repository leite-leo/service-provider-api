## ---------- Base stage ----------
## Common setup shared by dev and build stages.
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

## ---------- Dev stage ----------
## Used by docker-compose for local development.
## Includes devDependencies so nodemon, jest, and eslint are available.
FROM base AS dev

RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

## ---------- Build stage ----------
## Installs all dependencies, then prunes to production only.
## Output is consumed by the runtime stage; never used directly.
FROM base AS build

RUN npm ci

COPY . .

RUN npm prune --production

## ---------- Runtime stage ----------
## Minimal production image. Used for deployment (Render, etc.).
## Runs as a non-root user for security.
FROM node:20-alpine AS runtime

WORKDIR /app

## Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

## Copy only the production artifacts from the build stage
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./
COPY --from=build --chown=nodejs:nodejs /app/.sequelizerc ./
COPY --from=build --chown=nodejs:nodejs /app/server.js ./
COPY --from=build --chown=nodejs:nodejs /app/instrument.js ./
COPY --from=build --chown=nodejs:nodejs /app/src ./src

USER nodejs

EXPOSE 3000

## Exec form ensures SIGTERM is delivered to node for clean shutdown
CMD ["node", "server.js"]
