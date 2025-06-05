// Type definitions for Kubernetes objects to handle YAML parsing
declare namespace k8s {
  interface KubernetesObject {
    apiVersion: string;
    kind: string;
    metadata: {
      name: string;
      namespace?: string;
      [key: string]: any;
    };
    [key: string]: any;
  }
}

// Extend the yaml module with loadAll return type
declare module 'js-yaml' {
  export function loadAll(input: string): any[];
} 