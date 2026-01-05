FROM node:20-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    bash \
    openssh-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY package*.json ./

RUN npm install

CMD ["bash"]
