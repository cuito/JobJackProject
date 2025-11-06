# ---------- deps ----------
  FROM node:22-alpine AS deps
  WORKDIR /app
  
  # Copy only manifests to cache installs
  COPY package.json yarn.lock ./
  COPY packages/api/package.json packages/api/package.json
  
  RUN yarn install --frozen-lockfile
  
  # ---------- build ----------
  FROM node:22-alpine AS build
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  RUN yarn workspace api build
  
  # ---------- runtime ----------
  FROM node:22-alpine
  ENV NODE_ENV=production
  WORKDIR /app
  # copy runtime deps and built api
  COPY --from=deps /app/node_modules ./node_modules
  COPY --from=build /app/packages/api/dist ./packages/api/dist
  COPY packages/api/package.json packages/api/package.json
  EXPOSE 3000
  CMD ["node", "packages/api/dist/index.js"]  