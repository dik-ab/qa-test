# AWS App Runner + ECR + GitHub Actions 自動デプロイ

このプロジェクトは、Docker + ECR + GitHub Actionsを使用してAWS App Runnerに自動デプロイするためのTerraform設定です。

## 🚀 機能

- **Docker化されたNext.jsアプリケーション**
- **Amazon ECR**でのコンテナイメージ管理
- **AWS App Runner**での本番環境ホスティング
- **GitHub Actions**による自動CI/CDパイプライン
- **Terraform**によるインフラ管理
- **AWS Bedrock**へのアクセス権限設定

## 📋 前提条件

1. AWSアカウント
2. AWS CLIの設定
3. Terraformのインストール
4. GitHubリポジトリ
5. Docker（ローカル開発用）

## 🛠️ セットアップ手順

### 1. Terraformの設定

```bash
# terraform.tfvarsファイルを作成
cp terraform.tfvars.example terraform.tfvars

# 必要に応じて設定を編集
vim terraform.tfvars
```

### 2. GitHub Secretsの設定

GitHubリポジトリの Settings > Secrets and variables > Actions で以下のシークレットを設定：

- `AWS_ACCESS_KEY_ID`: AWSアクセスキーID
- `AWS_SECRET_ACCESS_KEY`: AWSシークレットアクセスキー

### 3. インフラのデプロイ

```bash
cd terraform

# Terraformを初期化
terraform init

# プランを確認
terraform plan

# インフラをデプロイ
terraform apply
```

### 4. 初回のDockerイメージプッシュ

```bash
# ECRにログイン
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin <ECR_REPOSITORY_URL>

# Dockerイメージをビルド
docker build -t qamatching-app .

# イメージにタグを付与
docker tag qamatching-app:latest <ECR_REPOSITORY_URL>:latest

# ECRにプッシュ
docker push <ECR_REPOSITORY_URL>:latest
```

## 🔄 自動デプロイフロー

### mainブランチへのプッシュ時

1. **Terraform Job**: インフラの更新（必要に応じて）
2. **Build and Deploy Job**: 
   - Dockerイメージのビルド
   - ECRへのプッシュ
   - App Runnerサービスの更新

### プルリクエスト時

1. **Test Job**:
   - 依存関係のインストール
   - テストの実行
   - ビルドの確認
   - Dockerイメージのビルドテスト

## 📁 ファイル構成

```
.
├── Dockerfile                    # Dockerイメージ定義
├── next.config.ts               # Next.js設定（standalone mode）
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actionsワークフロー
└── terraform/
    ├── main.tf                  # メインのTerraform設定
    ├── variables.tf             # 変数定義
    ├── outputs.tf               # 出力値定義
    ├── terraform.tfvars.example # 設定例
    └── README.md               # このファイル
```

## 🏗️ インフラ構成

### 作成されるAWSリソース

- **ECR Repository**: Dockerイメージの保存
- **App Runner Service**: アプリケーションのホスティング
- **IAM Roles & Policies**: 
  - App Runner実行ロール（Bedrockアクセス権限付き）
  - ECRアクセスロール
- **Auto Scaling Configuration**: 自動スケーリング設定

### ネットワーク

- App RunnerはフルマネージドサービスのためVPC設定不要
- HTTPS通信がデフォルトで有効
- カスタムドメインの設定も可能

## 🔧 設定のカスタマイズ

### terraform.tfvars

```hcl
# アプリケーション名
app_name = "your-app-name"

# リージョン
aws_region = "ap-northeast-1"

# インスタンス設定
cpu    = "0.5 vCPU"
memory = "1 GB"

# オートスケーリング
min_size        = 1
max_size        = 10
max_concurrency = 100

# 環境変数
environment_variables = {
  NODE_ENV   = "production"
  AWS_REGION = "ap-northeast-1"
  PORT       = "3000"
  # 追加の環境変数
}

# タグ
tags = {
  Environment = "production"
  Project     = "your-project"
  Owner       = "your-name"
}
```

### GitHub Actions環境変数

`.github/workflows/deploy.yml`で以下の環境変数を調整可能：

- `AWS_REGION`: AWSリージョン
- `ECR_REPOSITORY`: ECRリポジトリ名

## 🔍 モニタリング

### App Runnerコンソール

- サービスの状態確認
- デプロイメント履歴
- ログの確認
- メトリクスの監視

### CloudWatch

- アプリケーションログ
- メトリクス（CPU、メモリ、リクエスト数など）
- アラーム設定

## 🚨 トラブルシューティング

### よくある問題

1. **ECRプッシュエラー**
   ```bash
   # ECRリポジトリが存在することを確認
   aws ecr describe-repositories --repository-names qamatching-app
   ```

2. **App Runnerデプロイエラー**
   ```bash
   # サービスの状態を確認
   aws apprunner describe-service --service-arn <SERVICE_ARN>
   ```

3. **Bedrockアクセスエラー**
   - IAMロールの権限を確認
   - リージョンの設定を確認

### ログの確認

```bash
# App Runnerのログを確認
aws logs describe-log-groups --log-group-name-prefix "/aws/apprunner"
```

## 💰 コスト最適化

- **インスタンスサイズ**: 必要最小限のCPU/メモリを設定
- **オートスケーリング**: min_sizeを1に設定してコスト削減
- **ECRライフサイクル**: 古いイメージの自動削除設定

## 🔒 セキュリティ

- IAMロールは最小権限の原則
- ECRイメージの脆弱性スキャン有効
- HTTPS通信の強制
- 環境変数での機密情報管理

## 📚 参考資料

- [AWS App Runner Developer Guide](https://docs.aws.amazon.com/apprunner/)
- [Amazon ECR User Guide](https://docs.aws.amazon.com/ecr/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
