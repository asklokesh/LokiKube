# LokiKube

A modern web application for managing multiple Kubernetes clusters from different cloud providers.

## Features

- **Multi-Cluster Management**: Connect to multiple clusters simultaneously
- **Auto-Detection**: Automatically finds AWS, Azure, and GCP credentials
- **Resource Visualization**: View and manage pods, deployments, services, and more
- **Integrated Logging**: View logs directly in the UI with filtering capabilities
- **YAML Editing**: View and edit resource YAML with syntax highlighting
- **Secure**: Uses your existing kubeconfig and credentials
- **Fast & Responsive**: Modern UI with real-time updates
- **Multi-Cloud Support**: Works with AWS EKS, Azure AKS, Google GKE, and other Kubernetes clusters

## Quick Start

1. **Prerequisites:**
   - Node.js 18+ and npm
   - kubectl configured with access to at least one cluster
   - Optional: Cloud provider CLI tools (aws, gcloud, az) for auto-detection

2. **Installation:**
   ```bash
   # Clone the repository
   git clone https://github.com/yourusername/lokikube.git
   cd lokikube
   
   # Run the setup script
   ./setup.sh
   ```

3. **Usage:**
   ```bash
   # Start in development mode
   ./run.sh
   
   # Or start in production mode
   ./run.sh prod
   ```

4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Documentation

- [User Guide](./USAGE.md): Detailed instructions on how to use LokiKube
- [Architecture](./ARCHITECTURE.md): Overview of the application architecture
- [Development Guide](./CONTRIBUTING.md): How to contribute to the project

## How It Works

LokiKube runs as a web application on your local machine, leveraging your existing kubeconfig file and cloud provider credentials to connect to your clusters.

```mermaid
graph TD;
    A[User Browser] -->|Interact with UI| B[Next.js Frontend]
    B -->|API Requests| C[Next.js API Routes]
    C -->|Read/Write| D[@kubernetes/client-node]
    D -->|K8s API Calls| E[Kubernetes API]
```

It never stores your credentials and all operations are performed with your existing permissions.

## Comparison with Similar Tools

| Feature | LokiKube | K9s | Lens | Aptakube |
|---------|----------|-----|------|----------|
| UI Type | Web App | Terminal | Desktop | Desktop |
| Multi-Cluster | Yes | Yes | Yes | Yes |
| Cloud Auto-Detection | Yes | No | No | Yes |
| Logs Viewing | Yes | Yes | Yes | Yes |
| YAML Editing | Yes | Yes | Yes | Yes |
| Resource Watching | Yes | Yes | Yes | Yes |
| Installation | Easy | Easy | Medium | Easy |
| Platform | Cross-platform | Cross-platform | Cross-platform | Limited |

## Contributing

Contributions are welcome! Please check out our [Contributing Guide](./CONTRIBUTING.md) for more details.

## License

MIT

---

Inspired by [Aptakube](https://github.com/aptakube/aptakube) but built as a web application for maximum compatibility and ease of use. 