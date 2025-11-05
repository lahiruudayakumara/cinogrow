# Use an official Node image
FROM node:18-alpine

WORKDIR /app

# Copy package manifests first to leverage Docker cache
COPY package*.json ./

# Install dependencies (use --legacy-peer-deps if you hit peer dependency errors)
RUN npm install --production=false --legacy-peer-deps

# Copy app source
COPY . .

# Ensure Expo devtools listen on all interfaces (compose already sets this env)
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0

# Make bundler host selection explicit so clients can reach the packager when ports are mapped.
# Note: when running the container, prefer --network=host (Linux) or publish ports and use tunnel mode.
ENV EXPO_PACKAGER_HOSTNAME=0.0.0.0

EXPOSE 19000 19001 19002

# Start Expo in tunnel mode by default so physical devices can connect from different networks.
CMD ["npx", "expo", "start", "--tunnel"]
