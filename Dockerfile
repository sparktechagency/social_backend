FROM node:23.4.0
WORKDIR /usr/src/app
  
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile --prod
  
COPY . .
RUN pnpm build
    
FROM node:23.4.0
  
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist  
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/pnpm-lock.yaml ./pnpm-lock.yaml
  
RUN pnpm install --frozen-lockfile --prod
  
EXPOSE 7002
  
CMD [ "pnpm", "start" ]