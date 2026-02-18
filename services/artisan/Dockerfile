# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY packages/auth-middleware/package.json ./packages/auth-middleware/
COPY packages/event-bus/package.json ./packages/event-bus/
COPY packages/health/package.json ./packages/health/
COPY packages/logger/package.json ./packages/logger/
COPY packages/service-client/package.json ./packages/service-client/
COPY shared/package.json ./shared/
COPY services/artisan/package.json ./services/artisan/

# Install dependencies
RUN npm install --workspace=@korrect/artisan-service

# Copy source code
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY shared/ ./shared/
COPY services/artisan/ ./services/artisan/

# Build all packages
RUN npm run build --workspace=@korrect/auth-middleware
RUN npm run build --workspace=@korrect/event-bus
RUN npm run build --workspace=@korrect/health
RUN npm run build --workspace=@korrect/logger
RUN npm run build --workspace=@korrect/service-client
RUN npm run build --workspace=@korrectng/shared
RUN npm run build --workspace=@korrect/artisan-service

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/shared/ ./shared/
COPY --from=builder /app/services/artisan/package.json ./services/artisan/
COPY --from=builder /app/services/artisan/dist/ ./services/artisan/dist/

# Install production dependencies only
RUN npm install --workspace=@korrect/artisan-service --omit=dev

ENV NODE_ENV=production
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

CMD ["node", "services/artisan/dist/server.js"]
