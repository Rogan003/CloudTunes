FROM node:20

# Install system dependencies for whisper-node
RUN apt-get update && \
    apt-get install -y gcc g++ make sox libsox-fmt-mp3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /var/task

# Copy package.json and install npm dependencies
COPY package*.json ./
RUN npm install

# Copy Lambda code
COPY . .

# Lambda CMD
CMD ["index.handler"]
