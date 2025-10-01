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
# RUN ls build/bin

# RUN ls build/bin


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
COPY models /var/task/models
COPY --from=builder /whisper/whisper.cpp/build/bin/whisper-cli /var/task/whisper.cpp/whisper-cli
COPY --from=builder /whisper/whisper.cpp/build/src/libwhisper.so* /var/task/whisper.cpp/
COPY --from=builder /whisper/whisper.cpp/build/ggml/src/libggml*.so* /var/task/whisper.cpp/
COPY --from=builder /usr/lib/x86_64-linux-gnu/libgomp.so.1 /var/task/whisper.cpp/

ENV LD_LIBRARY_PATH=/var/task/whisper.cpp:$LD_LIBRARY_PATH

# Debug: check what got copied and what libs whisper-cli expects
# RUN ls -l /var/task/whisper.cpp && \
#     ldd /var/task/whisper.cpp/whisper-cli || true && \
#     echo "LD_LIBRARY_PATH=$LD_LIBRARY_PATH" && \
#     cat /etc/ld.so.conf || true \
# RUN ls -lh /var/task/models

# Lambda entry point
CMD [ "dist/index.handler" ]