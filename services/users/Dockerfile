# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY packages/auth-middleware/package.json ./packages/auth-middleware/
COPY packages/event-bus/package.json ./packages/event-bus/
COPY packages/health/package.json ./packages/health/
COPY packages/logger/package.json ./packages/logger/
COPY shared/package.json ./shared/
COPY services/users/package.json ./services/users/

# Install dependencies
RUN npm install --workspace=@korrect/auth-middleware --workspace=@korrect/event-bus --workspace=@korrect/health --workspace=@korrect/logger --workspace=@korrectng/shared --workspace=@korrect/users-service

# Copy source code
COPY tsconfig.base.json ./
COPY packages/auth-middleware/ ./packages/auth-middleware/
COPY packages/event-bus/ ./packages/event-bus/
COPY packages/health/ ./packages/health/
COPY packages/logger/ ./packages/logger/
COPY shared/ ./shared/
COPY services/users/ ./services/users/

# Build packages
RUN npm run build --workspace=@korrect/auth-middleware
RUN npm run build --workspace=@korrect/event-bus
RUN npm run build --workspace=@korrect/health
RUN npm run build --workspace=@korrect/logger
RUN npm run build --workspace=@korrectng/shared
RUN npm run build --workspace=@korrect/users-service

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/auth-middleware/package.json ./packages/auth-middleware/
COPY --from=builder /app/packages/auth-middleware/dist/ ./packages/auth-middleware/dist/
COPY --from=builder /app/packages/event-bus/package.json ./packages/event-bus/
COPY --from=builder /app/packages/event-bus/dist/ ./packages/event-bus/dist/
COPY --from=builder /app/packages/health/package.json ./packages/health/
COPY --from=builder /app/packages/health/dist/ ./packages/health/dist/
COPY --from=builder /app/packages/logger/package.json ./packages/logger/
COPY --from=builder /app/packages/logger/dist/ ./packages/logger/dist/
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/shared/dist/ ./shared/dist/
COPY --from=builder /app/services/users/package.json ./services/users/
COPY --from=builder /app/services/users/dist/ ./services/users/dist/

# Install production dependencies only
RUN npm install --workspace=@korrect/users-service --omit=dev

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start server
CMD ["node", "services/users/dist/server.js"]
