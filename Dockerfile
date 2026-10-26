# Runtime system dependencies are maintained in a separately released image.
ARG RUNTIME_BASE=ccr.ccs.tencentyun.com/ningmengchongshui/alemonbase:latest

# syntax=docker/dockerfile:1
FROM node:22.22.3 AS node-runtime
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    HUSKY=0
ARG NPM_REGISTRY=https://registry.npmjs.org

FROM node-runtime AS builder
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive --registry "$NPM_REGISTRY"
COPY . .
RUN yarn build

FROM node-runtime AS production-dependencies
ENV NODE_ENV=production
COPY package.json yarn.lock ./
# Husky is a development dependency; keep other dependency install scripts enabled.
RUN node -e "const fs = require('node:fs'); const p = JSON.parse(fs.readFileSync('package.json', 'utf8')); delete p.scripts.prepare; fs.writeFileSync('package.json', JSON.stringify(p));" \
    && yarn install --production=true --frozen-lockfile --non-interactive --registry "$NPM_REGISTRY" \
    && yarn cache clean

FROM ${RUNTIME_BASE} AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    TZ=Asia/Shanghai
# The archive API serves JSON and local docs; it does not render images or spawn browsers.
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/lib ./lib
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/healthz', { signal: AbortSignal.timeout(4000) }).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "lib/index.js"]
