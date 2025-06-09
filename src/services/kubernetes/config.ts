import * as k8s from '@kubernetes/client-node';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { KubeConfig, CloudCredential, GcpProject, AzureAccount } from './types';

const execAsync = promisify(exec);

// Get K8s configuration file path
export const getKubeConfigPath = (): string => {
  const kubeConfigEnv = process.env.KUBECONFIG;
  if (kubeConfigEnv) {
    return kubeConfigEnv;
  }
  return path.join(os.homedir(), '.kube', 'config');
};

// Get K8s configuration
export const getKubeConfig = (): k8s.KubeConfig => {
  const config = new k8s.KubeConfig();
  config.loadFromFile(getKubeConfigPath());
  return config;
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
      projects.forEach((project: GcpProject) => {
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
      accounts.forEach((account: AzureAccount) => {
        credentials.push({
          name: `Azure: ${account.name}`,
          provider: 'azure',
          subscription: account.id,
        });
      });
    } else {
      console.warn('Azure account list did not return an array. Output:', stdout);
    }
  } catch (error) {
    // Azure CLI might not be installed or authenticated
    console.error('Error loading Azure credentials:', error);
  }
  
  return credentials;
};

// Get Kubernetes client for a specific context
export const getKubeConfigForContext = (contextName: string): k8s.KubeConfig => {
  const config = new k8s.KubeConfig();
  config.loadFromFile(getKubeConfigPath());
  config.setCurrentContext(contextName);
  return config;
};

// Get Kubernetes client for a specific context
export const getK8sClient = (contextName: string) => {
  const kubeConfig = getKubeConfigForContext(contextName);
  
  return {
    core: kubeConfig.makeApiClient(k8s.CoreV1Api),
    apps: kubeConfig.makeApiClient(k8s.AppsV1Api),
    batch: kubeConfig.makeApiClient(k8s.BatchV1Api),
  };
}; 