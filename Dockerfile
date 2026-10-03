# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install root dependencies
COPY package*.json tsconfig.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy source code and build backend
COPY src ./src
RUN npm run build:backend

# Build frontend
COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend
COPY frontend ./frontend
RUN npm run build:frontend

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 3001

CMD ["node", "dist/src/index.js"]
