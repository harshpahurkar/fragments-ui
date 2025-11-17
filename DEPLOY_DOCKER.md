# Build and push Docker image for fragments-ui

This document shows how to build the `fragments-ui` Docker image locally and push it to a container registry (Docker Hub, GitHub Container Registry, etc.).

Prerequisites

- Docker installed and running on your machine.
- You are logged in to the target registry (e.g., `docker login`).
- From the repo root (where `Dockerfile` lives).

Quick Docker Hub flow

1. Log in (one-time):

```powershell
# Interactive login - recommended
docker login
```

2. Build the image:

```powershell
# Replace <your-user> with your Docker Hub username
docker build -t <your-user>/fragments-ui:latest .
```

3. Push the image:

```powershell
docker push <your-user>/fragments-ui:latest
```

Using the included helper script (PowerShell)

A small helper script is included at `scripts/docker-publish.ps1` which automates build + push. Example:

```powershell
# From repo root
# Replace yourdockerhubuser with your Docker Hub username
.\scripts\docker-publish.ps1 -ImageName "yourdockerhubuser/fragments-ui" -Tag "v1.0.0"
```

Notes for other registries

- GitHub Container Registry (GHCR):

  - Authenticate: `echo $GITHUB_TOKEN | docker login ghcr.io -u <username> --password-stdin`
  - Build & push: `docker build -t ghcr.io/<username>/fragments-ui:latest .` then `docker push ghcr.io/<username>/fragments-ui:latest`

- AWS ECR: follow the typical `aws ecr get-login-password` -> `docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com` -> tag -> push flow.

Debugging tips

- If `docker push` fails with permission/401, verify you are logged in and the repository exists on the registry (for Docker Hub, public repos can be pushed to `youruser/<repo>`).
- Use `docker images` to confirm the local image tag before pushing.
- If your CI/CD needs this, prefer using GitHub Actions or other pipelines and pass registry credentials as secrets.

Advanced: multi-arch builds

- If you need multi-arch images (linux/amd64 + linux/arm64), consider `docker buildx` and `docker buildx create` workflows; that's out of scope for this quick guide but can be added if you want it.

If you want, I can:

- Run the build locally from this machine (if Docker is available here). I won't push to your Docker Hub (would require credentials) but I can create and show the local image.
- Add a GitHub Action workflow to automatically build and push images on each commit or tag.

Tell me which next step you want (run locally, add CI workflow, or just keep instructions).
