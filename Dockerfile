FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"

WORKDIR /app
COPY whatsapp-service/package.json whatsapp-service/package-lock.json ./
RUN npm ci --omit=dev
COPY whatsapp-service/server.js ./server.js

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
