# LokiKube

A modern web-based Kubernetes cluster management tool with multi-cloud support.

## Features

- **Multi-Cluster Management**: Connect and manage multiple Kubernetes clusters simultaneously
- **Cloud Provider Integration**: Auto-detect and connect to AWS EKS, Azure AKS, and Google GKE clusters
- **Resource Management**: View and manage pods, deployments, services, configmaps, and secrets
- **Real-time Logs**: Stream pod logs with container selection
- **YAML Editor**: View and edit Kubernetes resources with syntax highlighting
- **Secure**: Uses existing kubeconfig and cloud credentials without storing them

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/lokikube.git
cd lokikube

# Start the application
docker-compose up -d

# Stop the application
docker-compose down
```

Access the application at http://localhost:3310

### Manual Installation

Requirements:
- Node.js 18+
- kubectl configured with cluster access
- Cloud CLI tools (aws, gcloud, az) for cloud cluster detection

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build and run in production
npm run build
npm start
```

## Usage

1. **Connect to Clusters**:
   - Use existing kubeconfig clusters from the "Existing Clusters" tab
   - Connect to cloud clusters using the "New Connection" tab

2. **Manage Resources**:
   - Select a connected cluster from the sidebar
   - Choose namespaces to monitor
   - View and manage Kubernetes resources
   - Stream real-time logs from pods

3. **Edit Resources**:
   - Click on any resource to view its YAML
   - Edit directly in the browser
   - Apply changes instantly

## Architecture

LokiKube is built with:
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **State Management**: Zustand
- **Kubernetes Client**: @kubernetes/client-node
- **Deployment**: Docker & Docker Compose

The application runs locally and communicates with Kubernetes clusters using your existing credentials.

## License

MIT