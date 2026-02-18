FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY packages/ ./packages/
COPY shared/ ./shared/
COPY services/platform/ ./services/platform/
COPY tsconfig.base.json ./
RUN npm install --workspace=@korrect/platform-service
RUN npm run build --workspace=@korrect/auth-middleware --workspace=@korrect/event-bus --workspace=@korrect/health --workspace=@korrect/logger --workspace=@korrect/service-client --workspace=@korrectng/shared --workspace=@korrect/platform-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/shared/ ./shared/
COPY --from=builder /app/services/platform/package.json ./services/platform/
COPY --from=builder /app/services/platform/dist/ ./services/platform/dist/
RUN npm install --workspace=@korrect/platform-service --omit=dev
ENV NODE_ENV=production
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3005/health || exit 1
CMD ["node", "services/platform/dist/server.js"]
