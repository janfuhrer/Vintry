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
# npm is only needed to install; removing it (and corepack) from the runtime image drops a
# whole dependency tree the app never runs, and every CVE scanners report in it
RUN npm ci --omit=dev --ignore-scripts \
    && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
              /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
COPY --from=build /app/build ./build
# the reference list of wines, loaded into the database on start
COPY --from=build /app/data ./data
USER node
EXPOSE 3000
CMD ["node", "build"]
