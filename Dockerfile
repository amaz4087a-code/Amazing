# ── Builder ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Install dependencies (layer cached unless lockfile changes)
COPY package.json package-lock.json ./
RUN npm ci

# 2. Prisma generate
COPY prisma ./prisma
RUN npx prisma generate

# 3. Build
COPY . .
RUN npm run build

# ── Runner ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built artifacts from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Uploads directory for runtime
RUN mkdir -p uploads/motions uploads/reports && \
    chown -R nextjs:nodejs uploads

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
