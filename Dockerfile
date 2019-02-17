FROM node:latest
WORKDIR /app
COPY app /app

RUN npm install

RUN ["chmod", "+x", "./start.sh"]
CMD ["./start.sh"]