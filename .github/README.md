# GitHub Actions Setup for LexOS

This repository uses GitHub Actions for CI/CD automation.

## Workflows

### 1. Frontend CI (`frontend-ci.yml`)
- **Triggers**: Push to main/develop, Pull requests
- **Jobs**:
  - Linting
  - Type checking
  - Building
  - Security scanning

### 2. Deploy (`deploy.yml`)
- **Triggers**: Push to main branch
- **Jobs**:
  - Deploys to production H100 server
  - Updates code and restarts services
  - Performs health checks

### 3. Full CI/CD (`ci-cd.yml`)
- **Triggers**: Push to main/develop, Pull requests
- **Jobs**:
  - Frontend CI (lint, build, test)
  - Backend CI (lint, test, coverage)
  - Security scanning
  - Docker build and push
  - Production deployment

### 4. Release (`release.yml`)
- **Triggers**: Git tags (v*)
- **Jobs**:
  - Creates GitHub release
  - Builds release artifacts
  - Pushes Docker images

## Required Secrets

Configure these in your GitHub repository settings:

- `SSH_USER`: SSH username for deployment server
- `SSH_KEY`: SSH private key for deployment
- `SSH_PORT`: SSH port (optional, defaults to 22)
- `DOCKER_USERNAME`: DockerHub username (optional)
- `DOCKER_TOKEN`: DockerHub access token (optional)
- `SNYK_TOKEN`: Snyk security scanning token (optional)

## Setup Instructions

1. Go to your repository settings
2. Navigate to Secrets and variables > Actions
3. Add the required secrets listed above

## Manual Deployment

You can trigger a deployment manually:
1. Go to Actions tab
2. Select "Deploy LexOS" workflow
3. Click "Run workflow"

## Local Testing

Test workflows locally using [act](https://github.com/nektos/act):
```bash
act -W .github/workflows/frontend-ci.yml
```