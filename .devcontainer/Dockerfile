FROM node:24-bookworm

# The base image already has git, curl, ca-certificates, bash
# Skip apt-get to avoid GPG issues with Podman overlay on NTFS

# Create workspace directory
WORKDIR /workspace

CMD ["bash"]
