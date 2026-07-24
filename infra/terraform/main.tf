# Red Apple Infrastructure as Code (SCD Section 4.1)
terraform {
  required_version = ">= 1.5.0"
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

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

# ECS Fargate Cluster Placeholder for Red Apple Microservices
resource "aws_ecs_cluster" "red_apple_cluster" {
  name = "red-apple-production-cluster"
}
