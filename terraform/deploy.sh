#!/bin/bash

# Terraform AWS App Runner デプロイスクリプト
set -e

# 色付きログ出力用の関数
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

# スクリプトのディレクトリに移動
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log_info "=== AWS App Runner Terraform デプロイ開始 ==="

# 必要なツールのチェック
if ! command -v terraform &> /dev/null; then
    log_error "Terraformがインストールされていません"
    log_info "インストール方法: https://learn.hashicorp.com/tutorials/terraform/install-cli"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    log_error "AWS CLIがインストールされていません"
    log_info "インストール方法: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
    exit 1
fi

# AWS認証情報のチェック
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS認証情報が設定されていません"
    log_info "aws configure を実行して認証情報を設定してください"
    exit 1
fi

# terraform.tfvarsファイルの存在チェック
if [ ! -f "terraform.tfvars" ]; then
    log_warn "terraform.tfvarsファイルが見つかりません"
    log_info "terraform.tfvars.exampleをコピーして設定してください:"
    log_info "cp terraform.tfvars.example terraform.tfvars"
    log_info "その後、terraform.tfvarsを編集してGitHubリポジトリURLなどを設定してください"
    exit 1
fi

# GitHubリポジトリURLの設定チェック
if ! grep -q "github_repository_url.*https://github.com/" terraform.tfvars; then
    log_error "terraform.tfvarsでgithub_repository_urlが正しく設定されていません"
    log_info "terraform.tfvarsを編集して、実際のGitHubリポジトリURLを設定してください"
    exit 1
fi

log_info "Terraformを初期化中..."
terraform init

log_info "Terraformプランを作成中..."
terraform plan -out=tfplan

log_info "デプロイを実行しますか？ (y/N)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    log_info "Terraformを適用中..."
    terraform apply tfplan
    
    log_info "=== デプロイ完了 ==="
    log_info "App Runner サービスの情報:"
    terraform output
    
    log_info "=== 重要な次のステップ ==="
    log_warn "1. GitHub接続を手動で承認する必要があります:"
    log_info "   - AWS Management Console > App Runner > Connections"
    log_info "   - 作成された接続を選択し、GitHubアカウントを承認"
    log_warn "2. App Runnerサービスでリポジトリを選択:"
    log_info "   - AWS Management Console > App Runner > Services"
    log_info "   - 作成されたサービスを選択し、GitHubリポジトリを接続"
    
    # サービスURLを取得して表示
    SERVICE_URL=$(terraform output -raw app_runner_service_url 2>/dev/null || echo "取得できませんでした")
    if [ "$SERVICE_URL" != "取得できませんでした" ]; then
        log_info "アプリケーションURL: $SERVICE_URL"
    fi
    
else
    log_info "デプロイをキャンセルしました"
    rm -f tfplan
fi
