# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY packages/auth-middleware/package.json ./packages/auth-middleware/
COPY packages/health/package.json ./packages/health/
COPY packages/logger/package.json ./packages/logger/
COPY services/gateway/package.json ./services/gateway/

# Install dependencies
RUN npm install --workspace=@korrect/auth-middleware --workspace=@korrect/health --workspace=@korrect/logger --workspace=@korrect/gateway

# Copy source code
COPY tsconfig.base.json ./
COPY packages/auth-middleware/ ./packages/auth-middleware/
COPY packages/health/ ./packages/health/
COPY packages/logger/ ./packages/logger/
COPY services/gateway/ ./services/gateway/

# Build packages
RUN npm run build --workspace=@korrect/auth-middleware
RUN npm run build --workspace=@korrect/health
RUN npm run build --workspace=@korrect/logger
RUN npm run build --workspace=@korrect/gateway

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/auth-middleware/package.json ./packages/auth-middleware/
COPY --from=builder /app/packages/auth-middleware/dist/ ./packages/auth-middleware/dist/
COPY --from=builder /app/packages/health/package.json ./packages/health/
COPY --from=builder /app/packages/health/dist/ ./packages/health/dist/
COPY --from=builder /app/packages/logger/package.json ./packages/logger/
COPY --from=builder /app/packages/logger/dist/ ./packages/logger/dist/
COPY --from=builder /app/services/gateway/package.json ./services/gateway/
COPY --from=builder /app/services/gateway/dist/ ./services/gateway/dist/

# Install production dependencies only
RUN npm install --workspace=@korrect/gateway --omit=dev

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start server
CMD ["node", "services/gateway/dist/server.js"]
