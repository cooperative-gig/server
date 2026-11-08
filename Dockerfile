# NODE 26 ALPINE  STABLE NODE ENVIRONMENT
FROM node:26-alpine

# Working directory inside container
WORKDIR /app

# install pnpm
RUN npm install -g pnpm@12.18.0

# Copy dependency files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client

# Expose our application
EXPOSE 5000

# Start the application
CMD ["pnpm", "start"]
