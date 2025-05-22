# QAマッチングテスト - ファイルからクエスチョンデータ生成システム

PDFファイルや画像ファイルから自動的にQ&A（質問と回答）データを生成し、CSV/XLSX形式でエクスポートできるNext.jsアプリケーションです。AWS Bedrock（Claude 3.5 Sonnet）を使用してAIによる高品質なQ&Aデータを生成します。

## 🚀 主な機能

### ファイル処理機能
- **PDFファイル解析**: 複数のPDFファイルからテキストを抽出し、内容を解析
- **画像ファイル解析**: OCR（Tesseract.js）を使用して画像からテキストを抽出
- **複数ファイル対応**: 一度に複数のファイルをアップロードして一括処理

### AI駆動のQ&A生成
- **AWS Bedrock統合**: Claude 3.5 Sonnetモデルを使用した高品質なQ&A生成
- **カスタマイズ可能な質問数**: 1〜10個の質問を生成可能
- **具体的で実用的な質問**: 文書の重要な情報を基にした詳細な質問を生成
- **丁寧で正確な回答**: 敬語を使用した分かりやすい回答を生成

### データエクスポート機能
- **CSV形式**: Excel互換のCSVファイルとしてエクスポート
- **XLSX形式**: Excelファイルとして直接エクスポート
- **タイムスタンプ付きファイル名**: 自動的に日時を含むファイル名を生成

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 15.3.2**: React フレームワーク
- **React 19**: UIライブラリ
- **Material-UI (MUI)**: UIコンポーネントライブラリ
- **TypeScript**: 型安全な開発
- **Tailwind CSS**: スタイリング

### バックエンド・AI
- **AWS Bedrock**: Claude 3.5 Sonnetモデル
- **Tesseract.js**: OCR（光学文字認識）
- **PDF.js**: PDFテキスト抽出
- **XLSX**: Excelファイル処理

### 開発・ビルドツール
- **ESLint**: コード品質管理
- **PostCSS**: CSS処理
- **Turbopack**: 高速開発サーバー

## 📋 前提条件

- Node.js 18以上
- npm または yarn
- AWS アカウント（Bedrock アクセス権限付き）

## 🔧 セットアップ

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd qamatching-test
```

### 2. 依存関係のインストール
```bash
npm install
# または
yarn install
```

### 3. 環境変数の設定
プロジェクトルートに `.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

### 4. 開発サーバーの起動
```bash
npm run dev
# または
yarn dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションにアクセスできます。

## 📖 使用方法

### 基本的な使い方

1. **ファイルタイプの選択**
   - 「PDFファイル」または「画像ファイル」タブを選択

2. **ファイルのアップロード**
   - 「ファイルを選択」ボタンをクリック
   - 対応ファイル形式を選択（複数選択可能）

3. **質問数の設定**
   - スライダーで生成する質問数を1〜10個で設定

4. **Q&Aデータの生成**
   - 「ファイルからクエスチョンデータを生成」ボタンをクリック
   - AIが自動的にQ&Aデータを生成

5. **データのエクスポート**
   - 「CSV」または「XLSX」ボタンでファイルをダウンロード

### 対応ファイル形式

#### PDFファイル
- `.pdf` 形式のファイル
- 複数ファイルの同時処理に対応

#### 画像ファイル
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- BMP (`.bmp`)
- WebP (`.webp`)

## 🏗️ プロジェクト構造

```
src/
├── app/
│   ├── api/
│   │   ├── extract-text-from-image/  # 画像テキスト抽出API
│   │   └── generate-questions/       # PDF Q&A生成API
│   ├── globals.css                   # グローバルスタイル
│   ├── layout.tsx                    # アプリケーションレイアウト
│   └── page.tsx                      # メインページ
├── components/                       # 再利用可能なコンポーネント
├── types/                           # TypeScript型定義
└── utils/
    ├── bedrock.ts                   # AWS Bedrock統合
    ├── csv.ts                       # CSV処理ユーティリティ
    ├── image.ts                     # 画像処理ユーティリティ
    ├── pdf.ts                       # PDF処理ユーティリティ
    └── xlsx.ts                      # Excel処理ユーティリティ
```

## 🔧 主要なユーティリティ関数

### PDF処理 (`src/utils/pdf.ts`)
- `extractTextFromMultiplePdfs()`: 複数PDFからテキスト抽出

### 画像処理 (`src/utils/image.ts`)
- OCRによるテキスト抽出機能

### AI処理 (`src/utils/bedrock.ts`)
- `generateQuestionsFromText()`: テキストからQ&A生成

### データエクスポート
- `src/utils/csv.ts`: CSV形式でのエクスポート
- `src/utils/xlsx.ts`: Excel形式でのエクスポート

## 🚀 本番環境へのデプロイ

### Vercelでのデプロイ
```bash
npm run build
```

環境変数を Vercel のダッシュボードで設定してください：
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## 🔒 セキュリティ考慮事項

- AWS認証情報は環境変数で管理
- ファイルアップロードのサイズ制限
- 適切なファイル形式の検証
- テキスト長の制限（Claude APIの制約に対応）

## 📝 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# プロダクションサーバー起動
npm run start

# リンター実行
npm run lint
```

## 🤝 貢献

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🆘 トラブルシューティング

### よくある問題

1. **AWS Bedrock接続エラー**
   - AWS認証情報が正しく設定されているか確認
   - Bedrockサービスへのアクセス権限を確認

2. **PDFテキスト抽出の失敗**
   - PDFファイルが破損していないか確認
   - ファイルサイズが適切な範囲内か確認

3. **画像OCRの精度が低い**
   - 画像の解像度を上げる
   - 文字がはっきりと見える画像を使用

### パフォーマンス最適化

- 大きなファイルは事前に分割することを推奨
- 同時処理するファイル数を制限
- 生成する質問数を適切に設定

## 📞 サポート

問題や質問がある場合は、GitHubのIssuesページで報告してください。
