# Stage 1: Builder stage
FROM node:23.4.0 AS builder
WORKDIR /usr/src/app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build project
RUN pnpm build

# Stage 2: Production stage
FROM node:23.4.0-slim AS production
WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built files from builder
COPY --from=builder /usr/src/app/dist ./dist

# Expose port
EXPOSE 7002

# Start command
CMD ["pnpm", "start"]