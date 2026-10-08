# 프론트(Next.js) 이미지. standalone 출력으로 실행에 필요한 파일만 담는다.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY . .
# /api/* 프록시 대상은 빌드 시점에 next.config.ts의 rewrites에 고정된다. compose에서는 서비스 이름(backend)을 쓴다.
ARG BACKEND_URL=http://backend:8080
ENV BACKEND_URL=$BACKEND_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static .next/static
COPY --from=build /app/public public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
