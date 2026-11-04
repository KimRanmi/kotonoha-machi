# 개발용 이미지: Vite 개발 서버를 컨테이너에서 띄운다. 소스는 이미지에 굽지 않고
# docker-compose.yml에서 볼륨으로 마운트하므로, 코드를 고치면 HMR이 바로 반영된다.
FROM node:22-alpine
WORKDIR /app

# 의존성 레이어 분리: package*.json이 바뀔 때만 npm ci를 다시 실행한다.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

EXPOSE 5173
# 컨테이너 밖(호스트 브라우저)에서 접속하려면 0.0.0.0으로 바인딩해야 한다.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
