# Node.js 18のベースイメージを使用
FROM node:18-alpine AS base

# 依存関係のインストール用ステージ
FROM base AS deps
RUN apk add --no-cache libc6-compat poppler-utils
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package.json package-lock.json* ./
RUN npm ci

# ビルド用ステージ
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Next.jsアプリケーションをビルド
RUN npm run build

# 本番用ステージ
FROM base AS runner
WORKDIR /app

# poppler-utilsをインストール（pdftotext用）
RUN apk add --no-cache poppler-utils

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 非rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 必要なファイルをコピー
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# tempディレクトリを作成し、nextjsユーザーに権限を付与
RUN mkdir -p /app/public/temp && chown -R nextjs:nodejs /app/public/temp

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# npm run startでアプリケーションを起動
CMD ["npm", "run", "start"]
