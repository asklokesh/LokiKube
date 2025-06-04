# LokiKube Usage Guide

LokiKube is a modern web application for managing multiple Kubernetes clusters from different cloud providers. This guide explains how to use the application.

## Getting Started

1. Install dependencies and build the application:
   ```bash
   ./setup.sh
   ```

2. Run the application:
   ```bash
   ./run.sh
   ```
   
   For production mode:
   ```bash
   ./run.sh prod
   ```

3. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Features

### Connecting to Clusters

1. **Existing Clusters**: Connect to clusters already in your kubeconfig
   - Click "Connect Cluster" in the sidebar
   - Select a cluster from the dropdown
   - Click "Connect"

2. **New Clusters**: Connect to clusters from cloud providers
   - Click "Connect Cluster" in the sidebar
   - Switch to the "New Connection" tab
   - Select your cloud provider credentials
   - Enter the cluster name
   - Click "Connect"

### Managing Resources

1. **View Resources**: After connecting to a cluster, you can:
   - Select different resource types (Pods, Deployments, Services, etc.)
   - Filter by namespace
   - See status and details of each resource

2. **Resource Details**: Click on any resource to:
   - View detailed information
   - See and edit YAML configuration
   - View logs (for pods)
   - Delete resources

3. **Pod Logs**: When viewing a pod, you can:
   - Stream logs in real-time
   - Filter logs by text
   - Download logs
   - Clear the log view

## Cloud Provider Integration

LokiKube automatically detects credentials for:

1. **AWS**: From your ~/.aws/credentials file
2. **GCP**: From gcloud CLI configuration
3. **Azure**: From az CLI configuration

## Keyboard Shortcuts

- `Ctrl/Cmd + R`: Refresh current view
- `Ctrl/Cmd + E`: Toggle YAML edit mode (when viewing resource details)

## Troubleshooting

- **Connection Issues**: Ensure your cloud provider CLI tools are properly configured
- **Missing Clusters**: Check that your kubeconfig file is properly set up
- **Permission Errors**: Verify that you have the necessary permissions to access the clusters 