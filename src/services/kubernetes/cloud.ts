import { exec } from 'child_process';
import { promisify } from 'util';
import { CloudCredential } from './types';
import { getKubeConfigPath } from './config';
import { escapeShellArg, validateSafeString, PATTERNS } from '@/utils/shell-escape';

const execAsync = promisify(exec);

// List clusters for a specific cloud credential
export const listClustersForCredential = async (
  credential: CloudCredential, 
  regionsToScan?: string[], // For AWS
  locationsToScan?: string[] // For Azure
): Promise<Array<string | { name: string; resourceGroup: string; location: string }>> => {
  try {
    switch (credential.provider) {
      case 'aws': {
        const clusters: string[] = [];
        
        // Default regions if not specified
        const regions = regionsToScan || [
          'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 
          'eu-west-1', 'eu-west-2', 'eu-central-1', 
          'ap-northeast-1', 'ap-northeast-2', 'ap-southeast-1', 'ap-southeast-2'
        ];
        
        // For AWS, we need to check each region
        for (const region of regions) {
          try {
            if (!credential.profile) {
              throw new Error('AWS profile is required for AWS provider');
            }
            const validProfile = validateSafeString(credential.profile, PATTERNS.AWS_PROFILE, 'AWS profile');
            const validRegion = validateSafeString(region, PATTERNS.AWS_REGION, 'AWS region');
            const { stdout } = await execAsync(
              `AWS_PROFILE=${validProfile} aws eks list-clusters --region ${validRegion} --output json`
            );
            const result = JSON.parse(stdout);
            
            if (result.clusters && Array.isArray(result.clusters)) {
              // Add region info to the cluster name for display
              result.clusters.forEach((cluster: string) => {
                clusters.push(`${cluster} (${region})`);
              });
            }
          } catch (error) {
            // Skip regions that fail - they might not have any clusters
            // or the account might not have access to that region
            console.warn(`Error listing clusters in region ${region}:`, error);
          }
        }
        
        return clusters;
      }
      
      case 'gcp': {
        if (!credential.project) {
          throw new Error('Project ID is required for GCP provider');
        }
        const validProject = validateSafeString(credential.project, PATTERNS.GCP_PROJECT, 'GCP project');
        const { stdout } = await execAsync(
          `gcloud container clusters list --project=${validProject} --format=json`
        );
        const clusters = JSON.parse(stdout);
        
        if (!Array.isArray(clusters)) {
          throw new Error(`Unexpected response format from gcloud: ${stdout}`);
        }
        
        return clusters.map((cluster: any) => cluster.name);
      }
      
      case 'azure': {
        const azClusters: Array<{ name: string; resourceGroup: string; location: string }> = [];
        
        // Default locations if not specified
        const locations = locationsToScan || ['all'];
        
        if (locations.includes('all')) {
          // If 'all' is specified, get all clusters
          if (!credential.subscription) {
            throw new Error('Subscription ID is required for Azure provider');
          }
          const validSubscription = validateSafeString(credential.subscription, PATTERNS.AZURE_SUBSCRIPTION, 'Azure subscription');
          const { stdout } = await execAsync(
            `az aks list --subscription ${validSubscription} --output json`
          );
          const clusters = JSON.parse(stdout);
          
          if (Array.isArray(clusters)) {
            clusters.forEach((cluster: any) => {
              azClusters.push({
                name: cluster.name,
                resourceGroup: cluster.resourceGroup,
                location: cluster.location
              });
            });
          }
        } else {
          // Otherwise, check each location
          for (const location of locations) {
            try {
              if (!credential.subscription) {
            throw new Error('Subscription ID is required for Azure provider');
          }
          const validSubscription = validateSafeString(credential.subscription, PATTERNS.AZURE_SUBSCRIPTION, 'Azure subscription');
              const validLocation = validateSafeString(location, PATTERNS.AZURE_LOCATION, 'Azure location');
              const { stdout } = await execAsync(
                `az aks list --subscription ${validSubscription} --location ${validLocation} --output json`
              );
              const clusters = JSON.parse(stdout);
              
              if (Array.isArray(clusters)) {
                clusters.forEach((cluster: any) => {
                  azClusters.push({
                    name: cluster.name,
                    resourceGroup: cluster.resourceGroup,
                    location: cluster.location
                  });
                });
              }
            } catch (error) {
              console.warn(`Error listing clusters in location ${location}:`, error);
            }
          }
        }
        
        return azClusters;
      }
      
      default:
        throw new Error(`Unsupported cloud provider: ${credential.provider}`);
    }
  } catch (error) {
    console.error(`Error listing clusters for ${credential.name}:`, error);
    throw error;
  }
};

// Connect to a cluster in a cloud provider
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
  try {
    switch (provider.toLowerCase()) {
      case 'aws': {
        // Extract the region from the cluster name if present
        const regionMatch = clusterName.match(/\((.*?)\)$/);
        const cluster = clusterName.replace(/\s*\(.*?\)$/, ''); // Remove the region from the name
        const clusterRegion = regionMatch ? regionMatch[1] : region;
        
        if (!clusterRegion) {
          throw new Error('Region is required for AWS EKS clusters');
        }
        
        const validProfile = validateSafeString(credentialNameOrProfile, PATTERNS.AWS_PROFILE, 'AWS profile');
        const validCluster = validateSafeString(cluster, PATTERNS.CLUSTER_NAME, 'cluster name');
        const validRegion = validateSafeString(clusterRegion, PATTERNS.AWS_REGION, 'AWS region');
        await execAsync(
          `AWS_PROFILE=${validProfile} aws eks update-kubeconfig --name ${validCluster} --region ${validRegion} --kubeconfig ${escapeShellArg(getKubeConfigPath())}`
        );
        break;
      }
      
      case 'gcp': {
        if (!projectId) {
          throw new Error('Project ID is required for GCP GKE clusters');
        }
        
        const validCluster = validateSafeString(clusterName, PATTERNS.CLUSTER_NAME, 'cluster name');
        const validProject = validateSafeString(projectId, PATTERNS.GCP_PROJECT, 'GCP project');
        await execAsync(
          `gcloud container clusters get-credentials ${validCluster} --project ${validProject} --kubeconfig ${escapeShellArg(getKubeConfigPath())}`
        );
        break;
      }
      
      case 'azure': {
        if (!resourceGroup) {
          throw new Error('Resource group is required for Azure AKS clusters');
        }
        
        if (!subscriptionId) {
          throw new Error('Subscription ID is required for Azure AKS clusters');
        }
        
        const validCluster = validateSafeString(clusterName, PATTERNS.CLUSTER_NAME, 'cluster name');
        const validResourceGroup = validateSafeString(resourceGroup, PATTERNS.AZURE_RESOURCE_GROUP, 'resource group');
        const validSubscription = validateSafeString(subscriptionId, PATTERNS.AZURE_SUBSCRIPTION, 'Azure subscription');
        await execAsync(
          `az aks get-credentials --name ${validCluster} --resource-group ${validResourceGroup} --subscription ${validSubscription} --file ${escapeShellArg(getKubeConfigPath())} --overwrite-existing`
        );
        break;
      }
      
      default:
        throw new Error(`Unsupported cloud provider: ${provider}`);
    }
  } catch (error) {
    console.error(`Error connecting to ${provider} cluster ${clusterName}:`, error);
    throw error;
  }
}; 