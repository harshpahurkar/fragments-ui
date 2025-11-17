<#
Simple PowerShell helper to build and push the fragments-ui Docker image.
Usage examples:
  # Build and push to Docker Hub (after `docker login`)
  .\scripts\docker-publish.ps1 -ImageName "yourdockerhubuser/fragments-ui" -Tag "latest"

  # Specify a different Dockerfile or tag
  .\scripts\docker-publish.ps1 -ImageName "yourdockerhubuser/fragments-ui" -Tag "v1.0.0" -Dockerfile "Dockerfile"

Note: this script expects `docker` to be installed and that you have run `docker login` already.
#>
param(
  [string]$ImageName = "yourdockerhubuser/fragments-ui",
  [string]$Tag = "latest",
  [string]$Dockerfile = "Dockerfile"
)

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker CLI not found. Install Docker Desktop or the Docker CLI and try again."
  exit 1
}

Write-Host "Building Docker image: $ImageName:$Tag (Dockerfile: $Dockerfile)" -ForegroundColor Cyan
$buildCmd = "docker build -f $Dockerfile -t $ImageName:$Tag ."
Invoke-Expression $buildCmd

if ($LASTEXITCODE -ne 0) {
  Write-Error "Docker build failed (exit code $LASTEXITCODE)."
  exit $LASTEXITCODE
}

Write-Host "Pushing Docker image: $ImageName:$Tag" -ForegroundColor Cyan
$pushCmd = "docker push $ImageName:$Tag"
Invoke-Expression $pushCmd

if ($LASTEXITCODE -ne 0) {
  Write-Error "Docker push failed (exit code $LASTEXITCODE)."
  exit $LASTEXITCODE
}

Write-Host "Done. Image pushed: $ImageName:$Tag" -ForegroundColor Green
