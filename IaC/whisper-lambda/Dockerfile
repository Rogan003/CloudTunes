# -----------------------------
# Stage 1: Build whisper.cpp
# -----------------------------
FROM ubuntu:22.04 AS builder

# Install build tools
RUN apt-get update && \
    apt-get install -y git build-essential cmake && \
    rm -rf /var/lib/apt/lists/*

# Set workdir
WORKDIR /whisper

# Copy whisper.cpp source from host
COPY whisper.cpp ./whisper.cpp

# Build the main binary
WORKDIR /whisper/whisper.cpp
RUN cmake -B build && cmake --build build -j
RUN ls build/bin

# -----------------------------
# Stage 2: Lambda image
# -----------------------------
FROM public.ecr.aws/lambda/nodejs:20

# Set workdir
WORKDIR /var/task

# Copy package.json + install JS deps
COPY package*.json ./
RUN npm install

# Copy the rest of your project (including models)
COPY . .

# Copy compiled whisper binary from builder
COPY --from=builder /whisper/whisper.cpp/build/bin/whisper-cli /var/task/whisper.cpp/whisper-cli

# Lambda entry point
CMD [ "dist/index.handler" ]