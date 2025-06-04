import * as k8s from '@kubernetes/client-node';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as os from 'os';
import * as path from 'path';
import * as stream from 'stream';

const execAsync = promisify(exec);

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

// Get K8s configuration file path
export const getKubeConfigPath = (): string => {
  const kubeConfigEnv = process.env.KUBECONFIG;
  if (kubeConfigEnv) {
    return kubeConfigEnv;
  }
  return path.join(os.homedir(), '.kube', 'config');
};

// Load K8s configurations
export const loadKubeConfigs = async (): Promise<KubeConfig[]> => {
  try {
    const kubeConfigPath = getKubeConfigPath();
    const config = new k8s.KubeConfig();
    config.loadFromFile(kubeConfigPath);
    
    return config.contexts.map((context) => {
      // Try to determine the provider
      let provider: 'aws' | 'azure' | 'gcp' | 'other' = 'other';
      
      const contextName = context.name.toLowerCase();
      if (contextName.includes('eks') || contextName.includes('aws')) {
        provider = 'aws';
      } else if (contextName.includes('aks') || contextName.includes('azure')) {
        provider = 'azure';
      } else if (contextName.includes('gke') || contextName.includes('gcp')) {
        provider = 'gcp';
      }
      
      return {
        name: context.name,
        context: context.name,
        provider,
        namespace: context.namespace || 'default',
      };
    });
  } catch (error) {
    console.error('Error loading kubeconfig:', error);
    return [];
  }
};

// Load cloud provider credentials
export const loadCloudCredentials = async (): Promise<CloudCredential[]> => {
  const credentials: CloudCredential[] = [];
  
  // AWS credentials
  try {
    const awsCredentialsPath = path.join(os.homedir(), '.aws', 'credentials');
    if (fs.existsSync(awsCredentialsPath)) {
      const content = fs.readFileSync(awsCredentialsPath, 'utf-8');
      const profileRegex = /\[(.*?)\]/g;
      let match;
      
      while ((match = profileRegex.exec(content)) !== null) {
        const profile = match[1];
        if (profile !== 'default') {
          credentials.push({
            name: `AWS: ${profile}`,
            provider: 'aws',
            profile,
          });
        } else {
          credentials.push({
            name: 'AWS: default',
            provider: 'aws',
            profile: 'default',
          });
        }
      }
    }
  } catch (error) {
    console.error('Error loading AWS credentials:', error);
  }
  
  // GCP credentials
  try {
    const { stdout } = await execAsync('gcloud config list --format=json');
    const gcloudConfig = JSON.parse(stdout);
    
    if (gcloudConfig.core && gcloudConfig.core.project) {
      credentials.push({
        name: `GCP: ${gcloudConfig.core.project}`,
        provider: 'gcp',
        project: gcloudConfig.core.project,
      });
    }
    
    // List all available projects
    const { stdout: projectsOutput } = await execAsync('gcloud projects list --format=json');
    const projects = JSON.parse(projectsOutput);
    
    projects.forEach((project: any) => {
      if (project.projectId !== gcloudConfig.core.project) {
        credentials.push({
          name: `GCP: ${project.projectId}`,
          provider: 'gcp',
          project: project.projectId,
        });
      }
    });
  } catch (error) {
    // GCloud CLI might not be installed or authenticated
    console.error('Error loading GCP credentials:', error);
  }
  
  // Azure credentials
  try {
    const { stdout } = await execAsync('az account list --output json');
    const accounts = JSON.parse(stdout);
    
    accounts.forEach((account: any) => {
      credentials.push({
        name: `Azure: ${account.name}`,
        provider: 'azure',
        subscription: account.id,
      });
    });
  } catch (error) {
    // Azure CLI might not be installed or authenticated
    console.error('Error loading Azure credentials:', error);
  }
  
  return credentials;
};

// List clusters for a given cloud credential
export const listClustersForCredential = async (credential: CloudCredential): Promise<string[]> => {
  try {
    let command = '';
    let clusters: string[] = [];

    switch (credential.provider) {
      case 'aws':
        command = `aws eks list-clusters --output json`;
        if (credential.profile && credential.profile !== 'default') {
          command += ` --profile ${credential.profile}`;
        }
        const { stdout: awsStdout } = await execAsync(command);
        const awsResult = JSON.parse(awsStdout);
        clusters = awsResult.clusters || [];
        break;

      case 'gcp':
        if (!credential.project) {
          throw new Error('GCP project ID is required to list clusters.');
        }
        command = `gcloud container clusters list --project ${credential.project} --format="json(name)"`;
        const { stdout: gcpStdout } = await execAsync(command);
        const gcpResult = JSON.parse(gcpStdout);
        clusters = gcpResult.map((c: { name: string }) => c.name) || [];
        break;

      case 'azure':
        if (!credential.subscription) {
          throw new Error('Azure subscription ID is required to list clusters.');
        }
        // Ensure the correct subscription is set before listing. This might be redundant if already set.
        // await execAsync(`az account set --subscription ${credential.subscription}`);
        command = `az aks list --subscription ${credential.subscription} --output json`;
        const { stdout: azureStdout } = await execAsync(command);
        const azureResult = JSON.parse(azureStdout);
        clusters = azureResult.map((c: { name: string }) => c.name) || [];
        break;

      default:
        throw new Error(`Unsupported provider for listing clusters: ${credential.provider}`);
    }
    return clusters;
  } catch (error: any) {
    console.error(`Error listing clusters for ${credential.provider} (${credential.name}):`, error.stderr || error.message || error);
    // Return empty array or rethrow, depending on how we want to handle partial failures in UI
    throw new Error(`Failed to list clusters for ${credential.provider} (${credential.name}): ${error.stderr || error.message}`);
  }
};

// Get KubeConfig object for a specific context
export const getKubeConfigForContext = (contextName: string): k8s.KubeConfig => {
  const config = new k8s.KubeConfig();
  config.loadFromFile(getKubeConfigPath());
  config.setCurrentContext(contextName);
  return config;
};

// Get K8s API client for a specific context
export const getK8sClient = (contextName: string) => {
  const kubeConfig = getKubeConfigForContext(contextName);
  return {
    core: kubeConfig.makeApiClient(k8s.CoreV1Api),
    apps: kubeConfig.makeApiClient(k8s.AppsV1Api),
    batch: kubeConfig.makeApiClient(k8s.BatchV1Api),
    rbac: kubeConfig.makeApiClient(k8s.RbacAuthorizationV1Api),
    networking: kubeConfig.makeApiClient(k8s.NetworkingV1Api),
    storage: kubeConfig.makeApiClient(k8s.StorageV1Api),
    custom: kubeConfig.makeApiClient(k8s.CustomObjectsApi),
  };
};

// Connect to a specific cloud provider's Kubernetes cluster
export const connectToCloudCluster = async (
  credential: CloudCredential,
  clusterName: string
): Promise<boolean> => {
  try {
    switch (credential.provider) {
      case 'aws':
        if (credential.profile) {
          await execAsync(
            `AWS_PROFILE=${credential.profile} aws eks update-kubeconfig --name ${clusterName}`
          );
        } else {
          await execAsync(`aws eks update-kubeconfig --name ${clusterName}`);
        }
        break;
      case 'gcp':
        if (credential.project) {
          await execAsync(
            `gcloud container clusters get-credentials ${clusterName} --project ${credential.project}`
          );
        }
        break;
      case 'azure':
        if (credential.subscription) {
          await execAsync(
            `az account set --subscription ${credential.subscription} && az aks get-credentials --name ${clusterName} --admin`
          );
        }
        break;
    }
    return true;
  } catch (error) {
    console.error(`Error connecting to ${credential.provider} cluster ${clusterName}:`, error);
    return false;
  }
};

// List namespaces for a cluster
export const listNamespaces = async (contextName: string) => {
  try {
    const client = getK8sClient(contextName);
    const response = await client.core.listNamespace();
    return response.body.items;
  } catch (error) {
    console.error(`Error listing namespaces for context ${contextName}:`, error);
    throw error;
  }
};

// List pods in a namespace
export const listPods = async (contextName: string, namespace: string = 'default') => {
  try {
    const client = getK8sClient(contextName);
    const response = await client.core.listNamespacedPod(namespace);
    return response.body.items;
  } catch (error) {
    console.error(`Error listing pods for context ${contextName} in namespace ${namespace}:`, error);
    throw error;
  }
};

// List deployments in a namespace
export const listDeployments = async (contextName: string, namespace: string = 'default') => {
  try {
    const client = getK8sClient(contextName);
    const response = await client.apps.listNamespacedDeployment(namespace);
    return response.body.items;
  } catch (error) {
    console.error(`Error listing deployments for context ${contextName} in namespace ${namespace}:`, error);
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
    const response = await client.core.readNamespacedPodLog(
      podName,
      namespace,
      containerName,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
    return response.body;
  } catch (error) {
    console.error(`Error getting logs for pod ${podName} in namespace ${namespace}:`, error);
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
    let resource: any; // Using any for resource due to varied types from K8s client
    
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
        delete (resource.body as any).status; // status is optional, deleting it is fine. Cast to any for simplicity across resource types.
    }
    
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
    
    const loadedResources = yaml.loadAll(yamlContent) as any[];
    const validResources = loadedResources.filter(
      (r): r is k8s.KubernetesObject & { apiVersion: string; kind: string; metadata: k8s.V1ObjectMeta & { name: string } } =>
        r &&
        typeof r.apiVersion === 'string' &&
        typeof r.kind === 'string' &&
        r.metadata &&
        typeof r.metadata.name === 'string'
    );
    
    const results = [];
    for (const resource of validResources) {
      try {
        // client.read expects a more specific type than just KubernetesObject for its argument's metadata.
        // The filter above ensures resource.metadata.name is a string.
        // For namespaced resources, resource.metadata.namespace should also be present if needed by read.
        // Casting to 'any' here to bypass strict type check for namespace, as the client library handles it.
        const { body } = await client.read(resource as any); 
        const response = await client.replace(resource); // resource here is the full object from YAML
        results.push({ kind: resource.kind, name: resource.metadata.name, status: 'updated' });
      } catch (error: any) {
        // If read fails (e.g. 404), try to create.
        if (error.response && error.response.statusCode === 404) {
            const response = await client.create(resource);
            results.push({ kind: resource.kind, name: resource.metadata.name, status: 'created' });
        } else {
            // Re-throw other errors from read or errors from replace
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

// Execute a command in a pod
export const execInPod = async (
  contextName: string,
  namespace: string,
  podName: string,
  containerName: string,
  command: string[]
): Promise<{ output: string; error: string }> => {
  try {
    const kubeConfig = getKubeConfigForContext(contextName);
    const exec = new k8s.Exec(kubeConfig);
    
    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';
      let commandExited = false; 

      const stdoutStream = new stream.Writable({
        write(chunk, encoding, callback) {
          output += chunk.toString();
          callback();
        }
      });

      const stderrStream = new stream.Writable({
        write(chunk, encoding, callback) {
          errorOutput += chunk.toString();
          callback();
        }
      });
      
      const statusCb = (status: k8s.V1Status) => {
        if (commandExited) return;
        if (status.status === 'Success') {
          commandExited = true;
          resolve({ output, error: errorOutput });
        } else if (status.status === 'Failure') {
          commandExited = true;
          const execError = new Error(status.message || `Command execution failed: ${status.reason}`);
          reject(execError);
        }
      };
      
      exec.exec(
        namespace,
        podName,
        containerName,
        command,
        stdoutStream, // Pass the custom Writable stream for stdout
        stderrStream, // Pass the custom Writable stream for stderr
        null,       // stdin: null for non-interactive
        false,      // tty
        statusCb    // Correctly typed status callback
      ).then((ws) => {
        ws.onclose = (event) => {
          if (!commandExited) {
            commandExited = true;
            // Resolve with whatever output/error was captured if WS closes before final V1Status
            resolve({ output, error: errorOutput });
          }
        };
        ws.onerror = (errEvent) => {
          if (!commandExited) {
            commandExited = true;
            // Try to get more specific error from event if possible
            const err = new Error('WebSocket error during exec');
            // console.error("WebSocket error event:", errEvent); // For debugging
            reject(err);
          }
        };
      }).catch(err => {
        // Catch errors from the initial exec.exec() call (e.g., connection issues)
        if (!commandExited) {
          commandExited = true;
          reject(err);
        }
      });
    });
  } catch (error) {
    console.error(`Error executing command in pod ${podName}:`, error);
    throw error;
  }
}; 