# Instal package dependencies
FROM node:20 AS dependency

ARG GITHUB_TOKEN
ENV GITHUB_TOKEN=$GITHUB_TOKEN

WORKDIR /node

COPY package*.json ./
COPY .npmrc .
RUN npm ci

# Build source
FROM dependency AS base
COPY . .

# Build source
FROM base AS build
RUN npm run build

# Ship compiled sources
FROM dependency

ARG BUILD_ID
ENV BUILD_ID=$BUILD_ID

COPY --from=build /node/dist ./dist

RUN npm prune --production

CMD ["node", "--enable-source-maps", "-r" , "./dist/index.js"]