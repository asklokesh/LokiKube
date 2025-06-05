import * as k8s from '@kubernetes/client-node';
import * as yaml from 'js-yaml';
import { K8sApiResponse } from './types';
import { getK8sClient, getKubeConfigForContext } from './config';

// List namespaces
export const listNamespaces = async (contextName: string) => {
  try {
    const client = getK8sClient(contextName);
    const res = await client.core.listNamespace();
    return res.body.items.map(item => item.metadata?.name).filter(Boolean);
  } catch (error) {
    console.error('Error listing namespaces:', error);
    throw error;
  }
};

// List pods
export const listPods = async (contextName: string, namespace: string = 'default') => {
  try {
    const client = getK8sClient(contextName);
    const res = await client.core.listNamespacedPod(namespace);
    return res.body.items;
  } catch (error) {
    console.error(`Error listing pods in namespace ${namespace}:`, error);
    throw error;
  }
};

// List deployments
export const listDeployments = async (contextName: string, namespace: string = 'default') => {
  try {
    const client = getK8sClient(contextName);
    const res = await client.apps.listNamespacedDeployment(namespace);
    return res.body.items;
  } catch (error) {
    console.error(`Error listing deployments in namespace ${namespace}:`, error);
    throw error;
  }
};

// List services
export const listServices = async (contextName: string, namespace: string = 'default') => {
  try {
    const client = getK8sClient(contextName);
    const res = await client.core.listNamespacedService(namespace);
    return res.body.items;
  } catch (error) {
    console.error(`Error listing services in namespace ${namespace}:`, error);
    throw error;
  }
};

// List configmaps
export const listConfigMaps = async (contextName: string, namespace: string = 'default') => {
  try {
    const client = getK8sClient(contextName);
    const res = await client.core.listNamespacedConfigMap(namespace);
    return res.body.items;
  } catch (error) {
    console.error(`Error listing configmaps in namespace ${namespace}:`, error);
    throw error;
  }
};

// List secrets
export const listSecrets = async (contextName: string, namespace: string = 'default') => {
  try {
    const client = getK8sClient(contextName);
    const res = await client.core.listNamespacedSecret(namespace);
    // Filter out default service account secrets and token secrets
    return res.body.items.filter(
      secret => !secret.metadata?.name?.startsWith('default-token-')
    );
  } catch (error) {
    console.error(`Error listing secrets in namespace ${namespace}:`, error);
    throw error;
  }
};

// Get pod logs
export const getPodLogs = async (
  contextName: string,
  namespace: string,
  podName: string,
  containerName?: string
) => {
  try {
    const client = getK8sClient(contextName);
    const res = await client.core.readNamespacedPod(podName, namespace);
    
    // If container name is not specified, use the first container
    const container = containerName || res.body.spec?.containers?.[0]?.name;
    
    if (!container) {
      throw new Error('No container found in pod');
    }
    
    const logs = await client.core.readNamespacedPodLog(
      podName,
      namespace,
      container,
      undefined, // pretty
      undefined, // previous
      undefined, // sinceSeconds
      undefined, // sinceTime
      undefined, // timestamps
      undefined, // tailLines
      undefined  // limitBytes
    );
    
    return logs.body;
  } catch (error) {
    console.error(`Error getting logs for pod ${podName}:`, error);
    throw error;
  }
};

// Delete a resource
export const deleteResource = async (
  contextName: string,
  kind: string,
  name: string,
  namespace?: string
) => {
  try {
    const client = getK8sClient(contextName);
    
    switch (kind.toLowerCase()) {
      case 'pod':
        if (!namespace) throw new Error('Namespace is required for pod deletion');
        await client.core.deleteNamespacedPod(name, namespace);
        break;
      case 'deployment':
        if (!namespace) throw new Error('Namespace is required for deployment deletion');
        await client.apps.deleteNamespacedDeployment(name, namespace);
        break;
      case 'service':
        if (!namespace) throw new Error('Namespace is required for service deletion');
        await client.core.deleteNamespacedService(name, namespace);
        break;
      // Add more resource types as needed
      default:
        throw new Error(`Unsupported resource kind: ${kind}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting ${kind} ${name}:`, error);
    throw error;
  }
};

// Get resource as YAML
export const getResourceYaml = async (
  contextName: string,
  kind: string,
  name: string,
  namespace?: string
) => {
  try {
    const client = getK8sClient(contextName);
    let resource: K8sApiResponse; 
    
    switch (kind.toLowerCase()) {
      case 'pod':
        if (!namespace) throw new Error('Namespace is required for pod');
        resource = await client.core.readNamespacedPod(name, namespace);
        break;
      case 'deployment':
        if (!namespace) throw new Error('Namespace is required for deployment');
        resource = await client.apps.readNamespacedDeployment(name, namespace);
        break;
      case 'service':
        if (!namespace) throw new Error('Namespace is required for service');
        resource = await client.core.readNamespacedService(name, namespace);
        break;
      // Add more resource types as needed
      default:
        throw new Error(`Unsupported resource kind: ${kind}`);
    }
    
    // Remove server-specific fields
    if (resource.body) { // Ensure resource.body is not undefined
        if (resource.body.metadata) { // Check if metadata exists on the body
            delete resource.body.metadata.managedFields;
            delete resource.body.metadata.resourceVersion;
            delete resource.body.metadata.selfLink;
            delete resource.body.metadata.uid;
            delete resource.body.metadata.creationTimestamp;
        }
        delete resource.body.status; // status is optional, deleting it is fine
    }
    
    // Use require-like approach to fix type issues with js-yaml
    return yaml.dump(resource.body);
  } catch (error) {
    console.error(`Error getting YAML for ${kind} ${name}:`, error);
    throw error;
  }
};

// Apply YAML resource
export const applyYaml = async (contextName: string, yamlContent: string) => {
  try {
    const kubeConfig = getKubeConfigForContext(contextName);
    const client = k8s.KubernetesObjectApi.makeApiClient(kubeConfig);
    
    // Use any to work around type issues with js-yaml and k8s client
    const resources = yaml.loadAll(yamlContent) as any[];
    const results = [];
    
    for (const resource of resources) {
      // Skip invalid resources
      if (!resource || !resource.apiVersion || !resource.kind || !resource.metadata || !resource.metadata.name) {
        continue;
      }
      
      try {
        // Use minimal metadata for read
        const metadata = {
          name: resource.metadata.name,
        };
        
        if (resource.metadata.namespace) {
          metadata['namespace'] = resource.metadata.namespace;
        }
        
        // Read resource to check if it exists
        await client.read({
          apiVersion: resource.apiVersion,
          kind: resource.kind,
          metadata: metadata as any
        });
        
        // Resource exists, update it
        await client.replace(resource);
        results.push({
          kind: resource.kind,
          name: resource.metadata.name,
          status: 'updated'
        });
      } catch (error: any) {
        // If resource doesn't exist, create it
        if (error.response && error.response.statusCode === 404) {
          await client.create(resource);
          results.push({
            kind: resource.kind,
            name: resource.metadata.name,
            status: 'created'
          });
        } else {
          throw error;
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error applying YAML:', error);
    throw error;
  }
}; 