import * as k8s from '@kubernetes/client-node';

export interface KubeConfig {
  name: string;
  context: string;
  provider: 'aws' | 'azure' | 'gcp' | 'other';
  namespace?: string;
}

export interface CloudCredential {
  name: string;
  provider: 'aws' | 'azure' | 'gcp';
  profile?: string; // For AWS
  project?: string; // For GCP
  subscription?: string; // For Azure
}

// Define interfaces for cloud provider resources
export interface GcpProject {
  projectId: string;
  name?: string;
  [key: string]: any;
}

export interface AzureAccount {
  name: string;
  id: string;
  [key: string]: any;
}

// Define interfaces for error objects
export interface ExecError extends Error {
  stderr?: string;
  [key: string]: any;
}

// Define interface for Kubernetes resources in YAML
export interface K8sYamlResource {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    [key: string]: any;
  };
  spec?: any;
  status?: any;
  [key: string]: any;
}

// Define interfaces for Kubernetes API responses
export interface K8sApiResponse {
  body: {
    metadata?: {
      managedFields?: any;
      resourceVersion?: any;
      selfLink?: any;
      uid?: any;
      creationTimestamp?: any;
      [key: string]: any;
    };
    status?: any;
    [key: string]: any;
  };
  [key: string]: any;
} 