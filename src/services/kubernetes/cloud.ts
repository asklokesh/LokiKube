import { exec } from 'child_process';
import { promisify } from 'util';
import { CloudCredential } from './types';
import { getKubeConfigPath } from './config';

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
            const { stdout } = await execAsync(
              `AWS_PROFILE=${credential.profile} aws eks list-clusters --region ${region} --output json`
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
        const { stdout } = await execAsync(
          `gcloud container clusters list --project=${credential.project} --format=json`
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
          const { stdout } = await execAsync(
            `az aks list --subscription ${credential.subscription} --output json`
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
              const { stdout } = await execAsync(
                `az aks list --subscription ${credential.subscription} --location ${location} --output json`
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
        
        await execAsync(
          `AWS_PROFILE=${credentialNameOrProfile} aws eks update-kubeconfig --name ${cluster} --region ${clusterRegion} --kubeconfig ${getKubeConfigPath()}`
        );
        break;
      }
      
      case 'gcp': {
        if (!projectId) {
          throw new Error('Project ID is required for GCP GKE clusters');
        }
        
        await execAsync(
          `gcloud container clusters get-credentials ${clusterName} --project ${projectId} --kubeconfig ${getKubeConfigPath()}`
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
        
        await execAsync(
          `az aks get-credentials --name ${clusterName} --resource-group ${resourceGroup} --subscription ${subscriptionId} --file ${getKubeConfigPath()} --overwrite-existing`
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