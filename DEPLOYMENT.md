# AWS App Runner デプロイメントガイド

このドキュメントでは、Next.jsアプリケーションをAWS App Runnerにデプロイする手順を説明します。

## 前提条件

1. AWSアカウントを持っていること
2. AWS CLIがインストールされ、設定されていること
3. GitHubリポジトリにコードがプッシュされていること
4. Bedrockへのアクセス権限があること

## 必要なIAMポリシー

App RunnerサービスがBedrockにアクセスできるよう、以下のIAMポリシーを持つロールが必要です：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream"
            ],
            "Resource": [
                "arn:aws:bedrock:ap-northeast-1::foundation-model/us.anthropic.claude-3-7-sonnet-20250219-v1:0"
            ]
        }
    ]
}
```

## デプロイ手順

### 1. IAMロールの作成

```bash
# App Runner用のサービスロールを作成
aws iam create-role \
    --role-name AppRunnerBedrockRole \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "tasks.apprunner.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }'

# Bedrockアクセス用のポリシーを作成
aws iam create-policy \
    --policy-name BedrockInvokePolicy2 \
    --policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "bedrock:InvokeModel",
                    "bedrock:InvokeModelWithResponseStream"
                ],
                "Resource": [
                    "*"
                ]
            }
        ]
    }'

# ポリシーをロールにアタッチ
aws iam attach-role-policy \
    --role-name AppRunnerBedrockRole \
    --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/BedrockInvokePolicy
```

### 2. App Runnerサービスの作成

AWS Management Consoleを使用してApp Runnerサービスを作成：

1. **AWS Management Console**にログイン
2. **App Runner**サービスに移動
3. **Create service**をクリック
4. **Source**として**GitHub**を選択
5. リポジトリを接続し、ブランチを選択
6. **Build settings**で以下を設定：
   - **Configuration file**: `apprunner.yaml`を使用
7. **Service settings**で以下を設定：
   - **Service name**: 任意の名前
   - **Instance role**: 上記で作成した`AppRunnerBedrockRole`を選択
8. **Environment variables**を設定（必要に応じて）：
   - `NODE_ENV`: `production`
   - `AWS_REGION`: `ap-northeast-1`

### 3. 環境変数の設定

App Runnerサービス作成後、必要に応じて以下の環境変数を設定：

- `NODE_ENV`: `production`
- `AWS_REGION`: `ap-northeast-1`
- その他のアプリケーション固有の環境変数

### 4. デプロイの確認

1. App Runnerコンソールでサービスのステータスを確認
2. ビルドログを確認してエラーがないことを確認
3. 提供されたURLでアプリケーションにアクセス

## トラブルシューティング

### よくある問題

1. **Bedrockアクセスエラー**
   - IAMロールにBedrockアクセス権限があることを確認
   - リージョンが正しく設定されていることを確認

2. **ビルドエラー**
   - `package.json`の依存関係を確認
   - Node.jsのバージョンが対応していることを確認

3. **環境変数の問題**
   - App Runnerコンソールで環境変数が正しく設定されていることを確認

### ログの確認

App Runnerコンソールの**Logs**タブでアプリケーションログを確認できます。

## 自動デプロイ

GitHubリポジトリにプッシュすると、App Runnerが自動的に新しいバージョンをデプロイします。

## コスト最適化

- 使用していない時間帯にサービスを一時停止することを検討
- インスタンスサイズを適切に設定

## セキュリティ考慮事項

1. IAMロールは最小権限の原則に従って設定
2. 環境変数に機密情報を直接設定しない
3. HTTPS通信を使用（App RunnerはデフォルトでHTTPS対応）

## 参考リンク

- [AWS App Runner Developer Guide](https://docs.aws.amazon.com/apprunner/)
- [AWS Bedrock Developer Guide](https://docs.aws.amazon.com/bedrock/)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
