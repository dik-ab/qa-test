terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# データソース：現在のAWSアカウント情報
data "aws_caller_identity" "current" {}

# データソース：現在のAWSリージョン
data "aws_region" "current" {}

# IAMロール：App Runner用
resource "aws_iam_role" "apprunner_instance_role" {
  name = "${var.app_name}-apprunner-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "tasks.apprunner.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAMポリシー：Bedrockアクセス用
resource "aws_iam_policy" "bedrock_access" {
  name        = "${var.app_name}-bedrock-access"
  description = "Policy for accessing AWS Bedrock from App Runner"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/us.anthropic.claude-3-7-sonnet-20250219-v1:0"
        ]
      }
    ]
  })

  tags = var.tags
}

# IAMポリシーアタッチメント
resource "aws_iam_role_policy_attachment" "apprunner_bedrock_access" {
  role       = aws_iam_role.apprunner_instance_role.name
  policy_arn = aws_iam_policy.bedrock_access.arn
}

# App Runner用のアクセスロール（GitHubからのソースコード取得用）
resource "aws_iam_role" "apprunner_access_role" {
  name = "${var.app_name}-apprunner-access-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# App Runner用のアクセスロールにポリシーをアタッチ
resource "aws_iam_role_policy_attachment" "apprunner_access_role_policy" {
  role       = aws_iam_role.apprunner_access_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# App Runner Auto Scaling Configuration
resource "aws_apprunner_auto_scaling_configuration_version" "main" {
  auto_scaling_configuration_name = "${var.app_name}-autoscaling"

  max_concurrency = var.max_concurrency
  max_size        = var.max_size
  min_size        = var.min_size

  tags = var.tags
}

# ECR Repository
resource "aws_ecr_repository" "main" {
  name                 = var.app_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.tags
}

# ECR Repository Policy
resource "aws_ecr_repository_policy" "main" {
  repository = aws_ecr_repository.main.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPushPull"
        Effect = "Allow"
        Principal = {
          AWS = [
            aws_iam_role.apprunner_access_role.arn,
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
          ]
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
      }
    ]
  })
}

# App Runner Service (ECR Image Source)
resource "aws_apprunner_service" "main" {
  service_name = var.app_name

  source_configuration {
    auto_deployments_enabled = var.auto_deployments_enabled
    
    image_repository {
      image_identifier      = "${aws_ecr_repository.main.repository_url}:latest"
      image_configuration {
        port                          = "3000"
        runtime_environment_variables = var.environment_variables
        runtime_environment_secrets  = var.environment_secrets
      }
      image_repository_type = "ECR"
    }
    
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access_role.arn
    }
  }

  instance_configuration {
    cpu               = var.cpu
    memory            = var.memory
    instance_role_arn = aws_iam_role.apprunner_instance_role.arn
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.main.arn

  health_check_configuration {
    healthy_threshold   = var.health_check_healthy_threshold
    interval            = var.health_check_interval
    path                = var.health_check_path
    protocol            = var.health_check_protocol
    timeout             = var.health_check_timeout
    unhealthy_threshold = var.health_check_unhealthy_threshold
  }

  tags = var.tags

  depends_on = [
    aws_iam_role_policy_attachment.apprunner_bedrock_access,
    aws_iam_role_policy_attachment.apprunner_access_role_policy,
    aws_ecr_repository.main
  ]
}

# App Runner Connection (GitHub用)
resource "aws_apprunner_connection" "github" {
  connection_name = "${var.app_name}-github-connection"
  provider_type   = "GITHUB"

  tags = var.tags
}
