FROM node:20-alpine

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY app ./app
COPY prisma ./prisma

RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

CMD ["pnpm", "run", "dev"]
