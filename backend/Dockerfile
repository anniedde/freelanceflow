# Base stage
FROM node:18-alpine AS base
RUN apk add --no-cache openssl libc6-compat git
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM base AS production
ENV NODE_ENV=development

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Copy necessary files
COPY package*.json ./
COPY --from=build /app/prisma ./prisma

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3001

# Will run migrations and then start server via docker-compose command
