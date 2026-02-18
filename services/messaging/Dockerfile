FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY packages/ ./packages/
COPY shared/ ./shared/
COPY services/messaging/ ./services/messaging/
COPY tsconfig.base.json ./
RUN npm install --workspace=@korrect/messaging-service
RUN npm run build --workspace=@korrect/auth-middleware --workspace=@korrect/event-bus --workspace=@korrect/health --workspace=@korrect/logger --workspace=@korrect/service-client --workspace=@korrectng/shared --workspace=@korrect/messaging-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/shared/ ./shared/
COPY --from=builder /app/services/messaging/package.json ./services/messaging/
COPY --from=builder /app/services/messaging/dist/ ./services/messaging/dist/
RUN npm install --workspace=@korrect/messaging-service --omit=dev
ENV NODE_ENV=production
EXPOSE 3004
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3004/health || exit 1
CMD ["node", "services/messaging/dist/server.js"]
