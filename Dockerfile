FROM node:20-alpine

WORKDIR /app

# Install pnpm globally first
RUN npm install -g pnpm

# Copy workspace configuration and lockfiles for dependency resolution
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# 👉 FIX: Generate the Prisma Client right after installing dependencies
# This ensures your custom output directory is populated before the build step
RUN pnpm prisma generate

# Copy the rest of your application source code
COPY . .

# Now Turbopack will find the generated Prisma Client without any issues
RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "run", "dev"]