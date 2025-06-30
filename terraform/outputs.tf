output "app_runner_service_url" {
  description = "The URL of the App Runner service"
  value       = aws_apprunner_service.main.service_url
}

output "app_runner_service_arn" {
  description = "The ARN of the App Runner service"
  value       = aws_apprunner_service.main.arn
}

output "app_runner_service_id" {
  description = "The ID of the App Runner service"
  value       = aws_apprunner_service.main.service_id
}

output "app_runner_service_status" {
  description = "The status of the App Runner service"
  value       = aws_apprunner_service.main.status
}

output "instance_role_arn" {
  description = "The ARN of the instance role"
  value       = aws_iam_role.apprunner_instance_role.arn
}

output "bedrock_policy_arn" {
  description = "The ARN of the Bedrock access policy"
  value       = aws_iam_policy.bedrock_access.arn
}

output "github_connection_arn" {
  description = "The ARN of the GitHub connection"
  value       = aws_apprunner_connection.github.arn
}

output "autoscaling_configuration_arn" {
  description = "The ARN of the autoscaling configuration"
  value       = aws_apprunner_auto_scaling_configuration_version.main.arn
}

output "ecr_repository_url" {
  description = "The URL of the ECR repository"
  value       = aws_ecr_repository.main.repository_url
}

output "ecr_repository_arn" {
  description = "The ARN of the ECR repository"
  value       = aws_ecr_repository.main.arn
}
