# syntax=docker/dockerfile:1

# pinned by digest for reproducible builds; Dependabot keeps it current
FROM node:24-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85
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
USER node
EXPOSE 3000
CMD ["node", "build"]
