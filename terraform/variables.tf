variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "qamatching-app"
}

variable "github_repository_url" {
  description = "GitHub repository URL (optional for ECR deployment)"
  type        = string
  default     = ""
  # 例: "https://github.com/username/repository-name"
}

variable "github_branch" {
  description = "GitHub branch to deploy (optional for ECR deployment)"
  type        = string
  default     = "main"
}

variable "auto_deployments_enabled" {
  description = "Enable automatic deployments"
  type        = bool
  default     = true
}

variable "cpu" {
  description = "CPU units for the App Runner service"
  type        = string
  default     = "0.25 vCPU"
  validation {
    condition = contains([
      "0.25 vCPU",
      "0.5 vCPU",
      "1 vCPU",
      "2 vCPU",
      "4 vCPU"
    ], var.cpu)
    error_message = "CPU must be one of: 0.25 vCPU, 0.5 vCPU, 1 vCPU, 2 vCPU, 4 vCPU."
  }
}

variable "memory" {
  description = "Memory for the App Runner service"
  type        = string
  default     = "0.5 GB"
  validation {
    condition = contains([
      "0.5 GB",
      "1 GB",
      "2 GB",
      "3 GB",
      "4 GB",
      "6 GB",
      "8 GB",
      "10 GB",
      "12 GB"
    ], var.memory)
    error_message = "Memory must be one of the supported values."
  }
}

variable "max_concurrency" {
  description = "Maximum number of concurrent requests per instance"
  type        = number
  default     = 100
  validation {
    condition     = var.max_concurrency >= 1 && var.max_concurrency <= 1000
    error_message = "Max concurrency must be between 1 and 1000."
  }
}

variable "max_size" {
  description = "Maximum number of instances"
  type        = number
  default     = 10
  validation {
    condition     = var.max_size >= 1 && var.max_size <= 1000
    error_message = "Max size must be between 1 and 1000."
  }
}

variable "min_size" {
  description = "Minimum number of instances"
  type        = number
  default     = 1
  validation {
    condition     = var.min_size >= 1 && var.min_size <= 1000
    error_message = "Min size must be between 1 and 1000."
  }
}

variable "environment_variables" {
  description = "Environment variables for the application"
  type        = map(string)
  default = {
    NODE_ENV   = "production"
    AWS_REGION = "ap-northeast-1"
    PORT       = "3000"
  }
}

variable "environment_secrets" {
  description = "Environment secrets for the application"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "health_check_healthy_threshold" {
  description = "Number of consecutive successful health checks"
  type        = number
  default     = 1
  validation {
    condition     = var.health_check_healthy_threshold >= 1 && var.health_check_healthy_threshold <= 20
    error_message = "Healthy threshold must be between 1 and 20."
  }
}

variable "health_check_interval" {
  description = "Health check interval in seconds"
  type        = number
  default     = 10
  validation {
    condition     = var.health_check_interval >= 5 && var.health_check_interval <= 20
    error_message = "Health check interval must be between 5 and 20 seconds."
  }
}

variable "health_check_path" {
  description = "Health check path"
  type        = string
  default     = "/"
}

variable "health_check_protocol" {
  description = "Health check protocol"
  type        = string
  default     = "HTTP"
  validation {
    condition     = contains(["HTTP", "TCP"], var.health_check_protocol)
    error_message = "Health check protocol must be HTTP or TCP."
  }
}

variable "health_check_timeout" {
  description = "Health check timeout in seconds"
  type        = number
  default     = 2
  validation {
    condition     = var.health_check_timeout >= 1 && var.health_check_timeout <= 20
    error_message = "Health check timeout must be between 1 and 20 seconds."
  }
}

variable "health_check_unhealthy_threshold" {
  description = "Number of consecutive failed health checks"
  type        = number
  default     = 5
  validation {
    condition     = var.health_check_unhealthy_threshold >= 1 && var.health_check_unhealthy_threshold <= 20
    error_message = "Unhealthy threshold must be between 1 and 20."
  }
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    Environment = "production"
    Project     = "qamatching"
    ManagedBy   = "terraform"
  }
}
