FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Volume persistant attendu ici : la session WhatsApp (Baileys) doit survivre
# aux redemarrages, sinon il faut rescanner le QR code a chaque deploiement.
ENV WHATSAPP_SESSION_DIR=/data/whatsapp-session
RUN mkdir -p /data/whatsapp-session

EXPOSE 3000

CMD ["node", "src/server.js"]
