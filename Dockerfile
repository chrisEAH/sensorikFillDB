FROM node:11.8-slim
WORKDIR /app
COPY app /app

RUN npm install

RUN ["chmod", "+x", "./start.sh"]
CMD ["./start.sh"]