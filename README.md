# CI/CD Pipeline: Build and Deploy to Kubernetes via Amazon ECR

This repository contains a complete CI/CD workflow that automatically builds a Docker image, pushes it to Amazon ECR, and updates a Kubernetes deployment whenever code is pushed to the main branch. Below is my explanation of what each part of the workflow does..

---

## Pipeline Breakdown

### Trigger  
The workflow runs automatically whenever a commit is pushed to the main branch. This ensures every code update is tested, packaged, and deployed with or without manual intervention.
```yaml
on:
  push:
    branches: [ "main" ]
  workflow_dispatch:
```
### Environment Variables  
The global variable (AWS_REGION) defines the AWS region where all AWS-related commands will operate. This prevents repeating the same value multiple times in the workflow.
```yaml
env:
  AWS_REGION: us-east-1
  IMAGE_NAME: app-repo
```
### Checkout Source Code  
The workflow checks out the repository so the runner can access the source files. Without this step, the runner has nothing to build or deploy.
```yaml
- name: Checkout app-repo
  uses: actions/checkout@v4
```
### AWS Credentials Configuration  
The workflow logs into AWS using secure GitHub Secrets. This allows every subsequent AWS-related operation to run successfully, including ECR access, Kubernetes updates, and deployment steps. This step also authenticates GitHub Actions with AWS.
```yaml
- name: Set AWS credentials
  run: |
    echo "AWS_ACCESS_KEY_ID=${{ secrets.AWS_ACCESS_KEY_ID }}" >> $GITHUB_ENV
    echo "AWS_SECRET_ACCESS_KEY=${{ secrets.AWS_SECRET_ACCESS_KEY }}" >> $GITHUB_ENV
    echo "AWS_REGION=${AWS_REGION}" >> $GITHUB_ENV
```
### Login to Amazon ECR  
This automatically performs the docker login step so the workflow can push images to your ECR registry. Without this step, ECR would reject the image I pushed.
```yaml
- name: Login to Amazon ECR
  id: login-ecr
  uses: aws-actions/amazon-ecr-login@v2
```
### Build Docker Image  
The workflow builds the application’s Docker image using the Dockerfile in root repo. This packages your application into a portable container that can be deployed anywhere.
```yaml
- name: Build and push Docker image
  run: |
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_REGISTRY=$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
``` 
### Tag Docker Image  
The built image is tagged with a unique commit SHA. This ensures traceability, so every deployment can be linked back to the exact commit that produced it.
```yaml
docker build -t $ECR_REGISTRY/$IMAGE_NAME:${{ github.sha }} .
```
### Push Image to ECR  
The tagged Docker image is uploaded to the private container registry in Amazon ECR. Kubernetes will later pull this image during deployment.
```yaml
docker push $ECR_REGISTRY/$IMAGE_NAME:${{ github.sha }}
```
### Checkout infra-repo
Fetches the remote repository that contains the Kubernetes deployment manifest. I had initially created a token (PAT) for this.
```yaml
- name: Checkout infra-repo
  uses: actions/checkout@v4
  with:
    repository: Yemmy03/infra-repo
    token: ${{ secrets.INFRA_REPO_ACCESS_DUMMY }}
    path: infra
```
### Update Kubernetes Deployment Manifest  
The workflow tells Kubernetes to use the new image. Kubernetes then rolls out the updated pods automatically, ensuring smooth deployment.
```yaml
- name: Update K8s deployment image
  run: |
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_REGISTRY=$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    sed -i "s|image:.*|image: $ECR_REGISTRY/$IMAGE_NAME:${{ github.sha }}|g" infra/k8s/deployment.yml
```
### Commit and Push the Updated Manifest
This pushes the updated deployment.yml back into the infra repository.
```yaml
- name: Commit and push deployment update
  run: |
    cd infra
    git config user.email "github-actions@github.com"
    git config user.name "GitHub Actions"
    git add k8s/deployment.yml
    git commit -m "Update image tag to ${{ github.sha }}"
    git push
```
---
