# syntax=docker/dockerfile:1

# pinned by digest for reproducible builds; Dependabot keeps it current
FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5
ENV NODE_ENV=production \
    PORT=3000 \
    BODY_SIZE_LIMIT=2M
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
# Alpine fixes (OpenSSL, zlib, …) land before the Node image is rebuilt, so take them here.
# npm, corepack and yarn are only needed to install, and apk only to upgrade: removing them
# drops tools the app never runs, every CVE scanners report in them, and a way to install
# anything into a running container. apk's database stays, so scanners still see packages.
RUN apk upgrade --no-cache \
    && npm ci --omit=dev --ignore-scripts \
    && npm cache clean --force \
    && rm -rf /root/.npm /tmp/* \
              /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
              /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
              /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg \
    && apk del --no-cache apk-tools
COPY --from=build /app/build ./build
# the reference list of wines, loaded into the database on start
COPY --from=build /app/data ./data
# everything above is owned by root and read-only for the app; numeric, so Kubernetes can
# check runAsNonRoot without a passwd lookup
USER 1000:1000
EXPOSE 3000
# for plain Docker; Kubernetes ignores it and uses its own probes on the same path
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "build"]
