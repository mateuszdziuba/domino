# Stage 1 — build
FROM node:24-slim AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY apps/server apps/server
COPY apps/web apps/web
COPY packages/shared packages/shared
RUN pnpm build

# Stage 2 — runtime (single server: API + static web)
FROM node:24-slim
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/apps/server/node_modules apps/server/node_modules
COPY --from=build /app/apps/web/node_modules apps/web/node_modules
COPY --from=build /app/packages/shared packages/shared
COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/server/drizzle apps/server/drizzle
COPY --from=build /app/apps/web/dist apps/web/dist
COPY --from=build /app/apps/server/package.json apps/server/package.json
WORKDIR /app/apps/server
EXPOSE 3001
CMD ["node", "--env-file-if-exists=.env", "dist/index.js"]
