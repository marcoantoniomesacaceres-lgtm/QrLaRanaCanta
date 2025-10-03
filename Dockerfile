# =================================
#  Etapa 1: Dependencias
# =================================
# Instala solo las dependencias para aprovechar el cache de Docker.
FROM node:18-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

# =================================
#  Etapa 2: Builder
# =================================
# Construye la aplicación de Next.js.
FROM node:18-alpine AS builder
WORKDIR /app

# Copia las dependencias de la etapa anterior
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Construye la aplicación optimizada para producción
RUN npm run build

# =================================
#  Etapa 3: Runner (Producción)
# =================================
# Esta es la imagen final que se ejecutará en producción.
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Crea un usuario y grupo para no ejecutar como root (buena práctica de seguridad)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia los archivos de la build de la etapa anterior.
# Esto aprovecha la función "standalone" de Next.js para una imagen mínima.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]