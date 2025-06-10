<div align="center">

# LokiKube

[![GitHub stars](https://img.shields.io/github/stars/asklokesh/LokiKube?style=social)](https://github.com/asklokesh/LokiKube/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/asklokesh/LokiKube?style=social)](https://github.com/asklokesh/LokiKube/network)
[![GitHub watchers](https://img.shields.io/github/watchers/asklokesh/LokiKube?style=social)](https://github.com/asklokesh/LokiKube/watchers)

[![License](https://img.shields.io/github/license/asklokesh/LokiKube?style=for-the-badge)](https://github.com/asklokesh/LokiKube/blob/main/LICENSE)
[![Issues](https://img.shields.io/github/issues/asklokesh/LokiKube?style=for-the-badge)](https://github.com/asklokesh/LokiKube/issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/asklokesh/LokiKube?style=for-the-badge)](https://github.com/asklokesh/LokiKube/pulls)
[![Last Commit](https://img.shields.io/github/last-commit/asklokesh/LokiKube?style=for-the-badge)](https://github.com/asklokesh/LokiKube/commits)

[![Commit Activity](https://img.shields.io/github/commit-activity/m/asklokesh/LokiKube?style=flat-square)](https://github.com/asklokesh/LokiKube/pulse)
[![Code Size](https://img.shields.io/github/languages/code-size/asklokesh/LokiKube?style=flat-square)](https://github.com/asklokesh/LokiKube)
[![Contributors](https://img.shields.io/github/contributors/asklokesh/LokiKube?style=flat-square)](https://github.com/asklokesh/LokiKube/graphs/contributors)

</div>

**A comprehensive, enterprise-grade Kubernetes cluster management platform with advanced multi-cloud support, real-time monitoring, and powerful alerting capabilities.**

## Key Features

### 🚀 Multi-Cluster Management
- **Unified Dashboard**: Manage multiple Kubernetes clusters from a single interface
- **Comparison Views**: Side-by-side cluster comparison for metrics, health, and alerts
- **Health Monitoring**: Real-time cluster health checks with status indicators
- **Auto-Discovery**: Automatically detect cloud-managed clusters (EKS, AKS, GKE)

### ☁️ Multi-Cloud Support
- **AWS EKS**: Profile-based authentication with region selection
- **Azure AKS**: Subscription and tenant ID support with resource group tracking
- **Google GKE**: Project ID support with service account authentication
- **Credential Management**: Secure storage and management of cloud credentials

### 📊 Advanced Monitoring & Alerting
- **Custom Alert Rules**: Create alerts based on CPU, memory, restarts, or custom metrics
- **Multi-Channel Notifications**: Webhooks, email, Slack integration
- **Alert Management**: Acknowledgment system with severity levels (critical/warning/info)
- **Real-time Metrics**: Live CPU, memory usage tracking with visual indicators
- **Duration-Based Alerts**: Trigger alerts only after conditions persist

### 🔧 Resource Management
- **Comprehensive Coverage**: Pods, Deployments, Services, ConfigMaps, Secrets
- **Advanced Filtering**: Filter by namespace, labels, and annotations
- **YAML Editor**: Syntax-highlighted editor with validation
- **Batch Operations**: Perform actions on multiple resources
- **Resource Health**: Visual status indicators and age tracking

### 📋 Log Management
- **Real-time Streaming**: Live log updates with auto-refresh
- **Container Selection**: View logs from specific containers in multi-container pods
- **Log Filtering**: Search and filter logs in real-time
- **Export Capabilities**: Download logs as text files
- **Playback Controls**: Pause, resume, and clear log streams

### 🎨 User Experience
- **Dark Mode**: Full theme support (light/dark/system)
- **Customizable UI**: Configurable primary colors and layouts
- **Responsive Design**: Mobile-friendly interface
- **Persistent State**: Settings and connections saved locally
- **Multiple View Modes**: Single, multi, and comparison cluster views

### 🔒 Security Features
- **Credential Isolation**: Uses existing kubeconfig without storing credentials
- **Profile Management**: Support for multiple authentication profiles
- **Secure API**: RESTful endpoints with proper authentication
- **No Data Storage**: All operations use your local credentials

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/asklokesh/lokikube.git
cd lokikube

# Start the application
docker-compose up -d

# Stop the application
docker-compose down
```

Access the application at http://localhost:34550

### Manual Installation

Requirements:
- Node.js 18+
- kubectl configured with cluster access
- Cloud CLI tools (aws, gcloud, az) for cloud cluster detection

```bash
# Install dependencies
npm install

# Run in development mode (port 34550)
npm run dev

# Build and run in production (port 34550)
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

## Configuration

### Environment Variables

```bash
# Port configuration (optional, defaults to 34550)
PORT=34550

# Node environment
NODE_ENV=production
```

### Saved Configurations

LokiKube supports saving and loading cluster configuration sets:
- Create multiple named configurations with descriptions
- Different refresh intervals and default namespaces per configuration
- Quick switching between configuration sets

## Architecture

LokiKube is built with modern web technologies:

### Frontend Stack
- **Framework**: Next.js 13+ with React 18
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with responsive design
- **State Management**: Zustand for efficient updates
- **Data Fetching**: React Query for caching
- **Icons**: Comprehensive icon set via react-icons

### Backend Stack
- **API**: RESTful endpoints with Next.js API routes
- **Kubernetes Client**: Official @kubernetes/client-node
- **Cloud SDKs**: AWS SDK, Azure SDK, Google Cloud SDK
- **Authentication**: Leverages existing kubeconfig and cloud credentials

### Development Tools
- **Testing**: Jest with React Testing Library
- **Linting**: ESLint with TypeScript support
- **Build**: SWC for fast compilation
- **Containerization**: Docker with multi-stage builds

The application runs locally and securely communicates with your Kubernetes clusters using existing credentials, ensuring no sensitive data is stored.

## API Endpoints

LokiKube provides a comprehensive REST API:

- `GET /api/clusters` - List all configured clusters
- `POST /api/connect` - Connect to a new cluster
- `GET /api/clusters/[context]/health` - Get cluster health status
- `GET /api/clusters/[context]/metrics` - Get cluster metrics
- `GET /api/resources/[context]/[namespace]` - List resources in namespace
- `GET /api/resources/[context]/[namespace]/[type]/[name]/yaml` - Get resource YAML
- `PUT /api/resources/[context]/[namespace]/[type]/[name]` - Update resource
- `GET /api/logs/[context]/[namespace]/[podName]` - Stream pod logs

## Development

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for containerized development)
- kubectl configured with cluster access
- Cloud CLI tools (optional, for cloud cluster detection):
  - AWS CLI for EKS clusters
  - Azure CLI for AKS clusters
  - gcloud CLI for GKE clusters

### Setup Development Environment

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Run in development mode with hot reload
npm run dev
```

### Building from Source

```bash
# Create production build
npm run build

# Run production build locally
npm start
```

### Docker Development

```bash
# Build Docker image
docker build -t lokikube:latest .

# Run with Docker
docker run -p 34550:34550 \
  -v ~/.kube:/home/node/.kube:ro \
  -v ~/.aws:/home/node/.aws:ro \
  -v ~/.azure:/home/node/.azure:ro \
  -v ~/.config/gcloud:/home/node/.config/gcloud:ro \
  lokikube:latest
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow TypeScript best practices
- Use functional components with hooks
- Maintain consistent code formatting
- Write meaningful commit messages
- Add tests for new features

## Support

- 📋 [Report Issues](https://github.com/asklokesh/LokiKube/issues)
- 💬 [Discussions](https://github.com/asklokesh/LokiKube/discussions)
- 📧 Contact: [asklokesh](https://github.com/asklokesh)

## Roadmap

- [ ] Helm chart management
- [ ] Custom resource definitions (CRD) support
- [ ] Advanced RBAC management
- [ ] Kubernetes cost analysis
- [ ] GitOps integration
- [ ] Multi-tenancy support
- [ ] Backup and disaster recovery features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
Made with ❤️ by the LokiKube community
</div>