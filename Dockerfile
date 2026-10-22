# ── Build: install everything, typecheck, build the web app ──────────────────
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ── Run: production dependencies, built web app, server source ───────────────
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8787 \
    DATABASE_PATH=/data/glink.db \
    UPLOAD_DIR=/data/uploads
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server/src ./server/src
COPY --from=build /app/server/scripts ./server/scripts
# The database and uploaded videos live on a volume so they survive redeploys.
RUN mkdir -p /data && chown -R node:node /data
VOLUME /data
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--import", "tsx", "server/src/index.ts", "--prod"]
