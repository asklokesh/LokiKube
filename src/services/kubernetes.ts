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
    
    if (gcloudConfig && gcloudConfig.core && gcloudConfig.core.project) {
      credentials.push({
        name: `GCP: ${gcloudConfig.core.project}`,
        provider: 'gcp',
        project: gcloudConfig.core.project,
      });
    }
    
    // List all available projects
    const { stdout: projectsOutput } = await execAsync('gcloud projects list --format=json');
    const projects = JSON.parse(projectsOutput);
    
    if (Array.isArray(projects)) {
      projects.forEach((project: any) => {
        if (project.projectId !== (gcloudConfig?.core?.project)) {
          credentials.push({
            name: `GCP: ${project.projectId}`,
            provider: 'gcp',
            project: project.projectId,
          });
        }
      });
    } else {
      console.warn('GCP projects list did not return an array. Output:', projectsOutput);
    }
  } catch (error) {
    // GCloud CLI might not be installed or authenticated
    console.error('Error loading GCP credentials:', error);
  }
  
  // Azure credentials
  try {
    const { stdout } = await execAsync('az account list --output json');
    const accounts = JSON.parse(stdout);
    
    if (Array.isArray(accounts)) {
      accounts.forEach((account: any) => {
        credentials.push({
          name: `Azure: ${account.name}`,
          provider: 'azure',
          subscription: account.id,
        });
      });
    } else {
      console.warn('Azure account list did not return an array. Output:', accounts);
    }
  } catch (error) {
    // Azure CLI might not be installed or authenticated
    console.error('Error loading Azure credentials:', error);
  }
  
  return credentials;
};

// List clusters for a given cloud credential
export const listClustersForCredential = async (
  credential: CloudCredential, 
  regionsToScan?: string[], // For AWS
  locationsToScan?: string[] // For Azure
): Promise<Array<string | { name: string; resourceGroup: string; location: string }>> => {
  try {
    let command = '';
    let allClusters: Array<string | { name: string; resourceGroup: string; location: string }> = [];

    switch (credential.provider) {
      case 'aws':
        const awsRegionsToTry = (regionsToScan && regionsToScan.length > 0) 
            ? regionsToScan 
            : ['us-east-1', 'us-west-2'];
        
        console.log(`AWS: Will attempt to list clusters in regions: ${awsRegionsToTry.join(', ')}`);
        let awsClusterNames: string[] = [];
        for (const region of awsRegionsToTry) {
          try {
            command = `aws eks list-clusters --region ${region} --output json`;
            if (credential.profile && credential.profile !== 'default') {
              command += ` --profile ${credential.profile}`;
            }
            console.log(`Executing AWS CLI command for region ${region}: ${command}`);
            const { stdout: awsStdout } = await execAsync(command);
            const awsResult = JSON.parse(awsStdout);
            if (awsResult.clusters && awsResult.clusters.length > 0) {
              awsClusterNames = awsClusterNames.concat(awsResult.clusters);
            }
          } catch (regionError: any) {
            console.warn(`Error listing AWS clusters in region ${region} for profile ${credential.profile || 'default'}: ${regionError.stderr || regionError.message}`);
          }
        }
        allClusters = Array.from(new Set(awsClusterNames)); 
        if (allClusters.length === 0 && awsRegionsToTry.length > 0) {
            console.warn(`No AWS EKS clusters found in the specified regions [${awsRegionsToTry.join(', ')}] for profile ${credential.profile || 'default'}`);
        }
        break;

      case 'gcp':
        if (!credential.project) {
          console.warn('GCP credential selected, but no project ID found.');
          return [];
        }
        command = `gcloud container clusters list --project ${credential.project} --format="value(name)"`;
        console.log(`Executing GCP CLI command: ${command}`);
        const { stdout: gcpStdout } = await execAsync(command);
        const gcpClusterNames = gcpStdout.trim().split('\n').filter(name => name.length > 0);
        allClusters = gcpClusterNames;
        if (allClusters.length === 0) {
            console.warn(`No GCP GKE clusters found in project ${credential.project}`);
        }
        break;

      case 'azure':
        if (!credential.subscription) {
          console.warn('Azure credential selected, but no subscription ID found.');
          return [];
        }
        command = `az aks list --subscription ${credential.subscription} --output json`;
        console.log(`Executing Azure CLI command: ${command}`);
        const { stdout: azureStdout } = await execAsync(command);
        
        let azureClusterDetails: Array<{ name: string; resourceGroup: string; location: string }> = [];
        try {
          const azureResult = JSON.parse(azureStdout);
          if (Array.isArray(azureResult)) {
            azureClusterDetails = azureResult.map(cluster => ({ 
              name: cluster.name,
              resourceGroup: cluster.resourceGroup,
              location: cluster.location 
            }));
          } else {
            console.warn('Azure CLI did not return a valid array of clusters. Output:', azureStdout);
          }
        } catch (parseError) {
          console.warn('Failed to parse Azure cluster list JSON. Output:', azureStdout, 'Error:', parseError);
          // Return empty or throw, depending on desired strictness. For now, returns empty if parse fails.
        }

        if (locationsToScan && locationsToScan.length > 0) {
          console.log(`Azure: Filtering clusters by locations: ${locationsToScan.join(', ')}`);
          azureClusterDetails = azureClusterDetails.filter(cluster => 
            locationsToScan.includes(cluster.location)
          );
          if (azureClusterDetails.length === 0) {
            console.warn(`No Azure AKS clusters found in the specified locations [${locationsToScan.join(', ')}] for subscription ${credential.subscription}`);
          }
        } else {
          if (azureClusterDetails.length === 0) {
            console.warn(`No Azure AKS clusters found in subscription ${credential.subscription}`);
          }
        }
        allClusters = azureClusterDetails;
        break;

      default:
        throw new Error(`Unsupported provider for listing clusters: ${credential.provider}`);
    }
    return allClusters;
  } catch (error: any) {
    console.error(`Error listing clusters for ${credential.provider} (${credential.name}):`, error.stderr || error.message || error);
    throw new Error(`Failed to list clusters for ${credential.provider} (${credential.name}). Check CLI configuration and permissions. Original error: ${error.stderr || error.message}`);
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
  provider: string, 
  clusterName: string, 
  credentialNameOrProfile: string, 
  accountId?: string, 
  subscriptionId?: string, 
  projectId?: string,
  region?: string,
  resourceGroup?: string
): Promise<void> => {
  let command = '';
  const env = { ...process.env };

  try {
    switch (provider.toLowerCase()) {
      case 'aws':
        if (!region) {
          // Regex to capture standard AWS region formats like us-east-1, eu-west-2, ap-northeast-3
          const regionMatch = clusterName.match(/(us(-gov)?|ap|ca|cn|eu|sa)-(central|east|north|northeast|northwest|south|southeast|southwest|west)-[0-9]+/);
          if (regionMatch && regionMatch[0]) {
            const inferredRegion = regionMatch[0];
            console.warn(`Region for AWS cluster ${clusterName} was not provided, inferred as ${inferredRegion} from cluster name.`);
            region = inferredRegion;
          } else {
            throw new Error(`Region is required for connecting to AWS EKS cluster ${clusterName} and could not be inferred.`);
          }
        }
        env.AWS_PROFILE = credentialNameOrProfile;
        command = `aws eks update-kubeconfig --name ${clusterName} --region ${region}`;
        // The AWS_PROFILE environment variable should be sufficient if the profile is configured for role assumption.
        // No need to explicitly set AWS_ACCESS_KEY_ID etc. here if profile handles it.
        console.log(`Attempting to connect to AWS cluster: ${clusterName} in region ${region} using profile ${credentialNameOrProfile}`);
        break;
      case 'gcp':
        if (projectId) {
          await execAsync(
            `gcloud container clusters get-credentials ${clusterName} --project ${projectId}`
          );
        }
        break;
      case 'azure':
        if (!subscriptionId) {
          throw new Error('Subscription ID is required for Azure AKS connection.');
        }
        if (!resourceGroup) { // Check for resourceGroup
          throw new Error('Resource group is required for Azure AKS connection.');
        }
        command = `az account set --subscription ${subscriptionId} && az aks get-credentials --name ${clusterName} --resource-group ${resourceGroup} --admin`;
        console.log(`Attempting to connect to Azure cluster: ${clusterName} in resource group ${resourceGroup} using subscription ${subscriptionId}`);
        await execAsync(command); // Execute directly, no need for env here
        break;
      default:
        throw new Error(`Unsupported provider for connectToCloudCluster: ${provider}`);
    }
  } catch (error) {
    console.error(`Error connecting to ${provider} cluster ${clusterName}:`, error);
    throw error;
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

// List services in a namespace
export const listServices = async (contextName: string, namespace: string = 'default') => {
  try {
    const client = getK8sClient(contextName);
    const response = await client.core.listNamespacedService(namespace);
    return response.body.items;
  } catch (error) {
    console.error(`Error listing services for context ${contextName} in namespace ${namespace}:`, error);
    throw error;
  }
};

// List configmaps in a namespace
export const listConfigMaps = async (contextName: string, namespace: string = 'default') => {
  try {
    const client = getK8sClient(contextName);
    const response = await client.core.listNamespacedConfigMap(namespace);
    return response.body.items;
  } catch (error) {
    console.error(`Error listing configmaps for context ${contextName} in namespace ${namespace}:`, error);
    throw error;
  }
};

// List secrets in a namespace
export const listSecrets = async (contextName: string, namespace: string = 'default') => {
  try {
    const client = getK8sClient(contextName);
    // Note: Listing secrets can be sensitive. Ensure appropriate RBAC is in place for the service account/user.
    const response = await client.core.listNamespacedSecret(namespace);
    return response.body.items;
  } catch (error) {
    console.error(`Error listing secrets for context ${contextName} in namespace ${namespace}:`, error);
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