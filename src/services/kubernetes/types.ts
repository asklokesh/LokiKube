
export interface KubeConfig {
  name: string;
  context: string;
  provider: 'aws' | 'azure' | 'gcp' | 'other' | 'onprem' | 'custom';
  namespace?: string;
  cluster?: string;
  user?: string;
  server?: string;
  region?: string;
  location?: string;
  resourceGroup?: string;
  labels?: Record<string, string>;
  tags?: string[];
  lastConnected?: Date;
  connectionStatus?: 'connected' | 'disconnected' | 'error';
  errorMessage?: string;
}

export interface CloudCredential {
  name: string;
  provider: 'aws' | 'azure' | 'gcp';
  profile?: string; // For AWS
  project?: string; // For GCP
  subscription?: string; // For Azure
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  keyFile?: string;
  isServiceAccount?: boolean;
  expiresAt?: Date;
  lastUsed?: Date;
  tags?: string[];
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

// Resource monitoring and metrics
export interface ResourceMetrics {
  cpu: {
    usage: number;
    limit?: number;
    request?: number;
  };
  memory: {
    usage: number;
    limit?: number;
    request?: number;
  };
  timestamp: Date;
}

export interface PodMetrics extends ResourceMetrics {
  podName: string;
  namespace: string;
  containers: Record<string, ResourceMetrics>;
}

export interface NodeMetrics extends ResourceMetrics {
  nodeName: string;
  allocatable: {
    cpu: string;
    memory: string;
    pods: string;
  };
  capacity: {
    cpu: string;
    memory: string;
    pods: string;
  };
}

// Alert and notification types
export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'resource' | 'health' | 'security' | 'config';
  title: string;
  message: string;
  resource?: {
    kind: string;
    name: string;
    namespace?: string;
  };
  timestamp: Date;
  acknowledged?: boolean;
}

// Configuration management
export interface ClusterConfig {
  id: string;
  name: string;
  description?: string;
  clusters: string[];
  settings: {
    refreshInterval?: number;
    defaultNamespace?: string;
    resourceFilters?: ResourceFilter[];
    alertRules?: AlertRule[];
    theme?: ThemeConfig;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceFilter {
  id: string;
  name: string;
  resourceTypes: string[];
  namespaces?: string[];
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: {
    metric: 'cpu' | 'memory' | 'restarts' | 'custom';
    operator: '>' | '<' | '=' | '!=' | '>=' | '<=';
    threshold: number;
    duration?: number;
  };
  actions: AlertAction[];
  enabled: boolean;
}

export interface AlertAction {
  type: 'webhook' | 'email' | 'slack' | 'log';
  config: Record<string, any>;
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor?: string;
  accentColor?: string;
  customCSS?: string;
} 