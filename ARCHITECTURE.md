# LokiKube Architecture

This document outlines the architecture of LokiKube, a web-based Kubernetes cluster management tool.

## Overview

LokiKube is built as a Next.js application that communicates with multiple Kubernetes clusters through the official Kubernetes JavaScript client. It automatically detects cloud provider credentials and allows you to switch between clusters seamlessly.

## Architecture Diagram

```mermaid
graph TD;
    A[User Browser] -->|Interact with UI| B[Next.js Frontend]
    B -->|API Requests| C[Next.js API Routes]
    C -->|Read/Write| D[@kubernetes/client-node]
    D -->|K8s API Calls| E[Kubernetes API]
    
    C -->|Read Cloud Credentials| F[AWS Credentials]
    C -->|Read Cloud Credentials| G[GCP Credentials]
    C -->|Read Cloud Credentials| H[Azure Credentials]
    
    F -->|Authenticate| I[AWS EKS]
    G -->|Authenticate| J[GCP GKE]
    H -->|Authenticate| K[Azure AKS]
    
    I -->|Connect to| E
    J -->|Connect to| E
    K -->|Connect to| E
    
    subgraph "User's Machine"
        A
        B
        C
        D
        F
        G
        H
    end
    
    subgraph "Cloud Providers"
        I
        J
        K
    end
    
    subgraph "Kubernetes Clusters"
        E
    end
```

## Key Components

### Frontend Layer

1. **React Components**: UI components built with React and styled with Tailwind CSS
   - Layout: Main layout with sidebar navigation
   - ResourceDashboard: Main dashboard showing cluster resources
   - ClusterConnection: Interface for connecting to clusters
   - LogViewer: Component for viewing pod logs

2. **State Management**: Using Zustand for global state
   - Manages available and connected clusters
   - Tracks selected resources and namespaces
   - Handles loading and error states

### API Layer

1. **Next.js API Routes**: Server-side API endpoints
   - `/api/clusters`: Lists available clusters from kubeconfig
   - `/api/credentials`: Lists available cloud credentials
   - `/api/connect`: Connects to new clusters
   - `/api/resources/[context]/[namespace]`: Gets resources for a context and namespace
   - `/api/logs/[context]/[namespace]/[podName]`: Streams logs from pods

2. **Kubernetes Service**: Core service to interact with Kubernetes
   - Wraps @kubernetes/client-node library
   - Handles authentication with different clusters
   - Provides methods for common operations (listing resources, fetching logs, etc.)

### External Integrations

1. **Cloud Provider SDKs**:
   - AWS: Uses AWS SDK and credentials from ~/.aws/credentials
   - GCP: Uses GCloud CLI authentication
   - Azure: Uses Azure CLI authentication

2. **Kubernetes API**: Communicates with clusters via their Kubernetes API
   - Uses the official @kubernetes/client-node library
   - Respects RBAC permissions of the authenticated user

## Security Considerations

1. All operations run with the permissions of the local user
2. No credentials are stored in the application
3. The application runs on the user's machine and does not expose any APIs externally
4. Communication with Kubernetes clusters is secured via the standard Kubernetes authentication mechanisms

## Technology Stack

- **Frontend**: React, Next.js, Tailwind CSS
- **State Management**: Zustand
- **API Client**: @kubernetes/client-node
- **Data Formats**: YAML for Kubernetes resources
- **Terminal Integration**: xterm.js for terminal-like interfaces 