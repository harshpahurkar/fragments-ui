### Multi-stage build: build with Node/Parcel and serve with minimal nginx image
FROM node:18-alpine AS builder
WORKDIR /app

# Install only what we need to build (devDependencies required for parcel build)
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm i

# Copy source and build
COPY . .
RUN npm run build

# Final image: nginx serving static files
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Use a simple nginx config with SPA fallback
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
