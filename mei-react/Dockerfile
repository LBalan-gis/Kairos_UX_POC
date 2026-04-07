# Stage 1: Build the React Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests and install
COPY package.json package-lock.json* ./
RUN npm ci

# Copy full source and build via Vite
COPY . .
RUN npm run build

# Stage 2: Serve the Static Output via NGINX (Offline-ready)
FROM nginx:alpine

# Remove default NGINX static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the built production bundle from Phase 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port and serve offline
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
