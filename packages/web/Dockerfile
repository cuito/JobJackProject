# ---------- deps ----------
  FROM node:22-alpine AS deps
  WORKDIR /app

  # Copy the minimal manifests so Yarn can resolve the workspace
  COPY package.json yarn.lock ./
  COPY packages/web/package.json packages/web/package.json

  # Install all workspace deps (hoisted to /app/node_modules)
  RUN yarn install --frozen-lockfile

  # ---------- build ----------
  FROM node:22-alpine AS build
  WORKDIR /app
  # reuse installed deps
  COPY --from=deps /app/node_modules ./node_modules
  # bring in full repo so the workspace can build
  COPY . .
  # build the web workspace (Angular CLI will run via the package script)
  RUN yarn workspace web build

  # ---------- runtime ----------
  FROM nginx:1.27-alpine
  # nginx with /api proxy
  COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
  # copy Angular dist (adjust path if your project name differs)
  COPY --from=build /app/packages/web/dist/web/browser /usr/share/nginx/html
  EXPOSE 80
  CMD ["nginx", "-g", "daemon off;"]
