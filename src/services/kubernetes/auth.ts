import { exec } from 'child_process';
import { promisify } from 'util';
import { CloudCredential } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);
const fsReadFile = promisify(fs.readFile);
const fsWriteFile = promisify(fs.writeFile);
const fsMkdir = promisify(fs.mkdir);
const fsExists = promisify(fs.exists);

export interface CloudAuthConfig {
  provider: 'aws' | 'azure' | 'gcp';
  displayName: string;
  credentials: Record<string, any>;
  isDefault?: boolean;
  lastUsed?: Date;
  regions?: string[];
  locations?: string[];
  tags?: string[];
}

export interface AuthManager {
  configs: CloudAuthConfig[];
  activeConfig?: CloudAuthConfig;
}

const AUTH_CONFIG_DIR = path.join(os.homedir(), '.lokikube');
const AUTH_CONFIG_FILE = path.join(AUTH_CONFIG_DIR, 'auth-config.json');

// Initialize auth config directory
export const initAuthConfig = async (): Promise<void> => {
  if (!(await fsExists(AUTH_CONFIG_DIR))) {
    await fsMkdir(AUTH_CONFIG_DIR, { recursive: true });
  }
};

// Load auth configurations
export const loadAuthConfigs = async (): Promise<CloudAuthConfig[]> => {
  await initAuthConfig();
  
  try {
    if (await fsExists(AUTH_CONFIG_FILE)) {
      const data = await fsReadFile(AUTH_CONFIG_FILE, 'utf-8');
      return JSON.parse(data).configs || [];
    }
  } catch (error) {
    console.error('Error loading auth configs:', error);
  }
  
  return [];
};

// Save auth configurations
export const saveAuthConfigs = async (configs: CloudAuthConfig[]): Promise<void> => {
  await initAuthConfig();
  
  try {
    await fsWriteFile(AUTH_CONFIG_FILE, JSON.stringify({ configs }, null, 2));
  } catch (error) {
    console.error('Error saving auth configs:', error);
    throw error;
  }
};

// Add new auth configuration
export const addAuthConfig = async (config: CloudAuthConfig): Promise<void> => {
  const configs = await loadAuthConfigs();
  
  // Check if config with same name exists
  const existingIndex = configs.findIndex(
    c => c.displayName === config.displayName && c.provider === config.provider
  );
  
  if (existingIndex >= 0) {
    configs[existingIndex] = { ...configs[existingIndex], ...config };
  } else {
    configs.push(config);
  }
  
  await saveAuthConfigs(configs);
};

// Remove auth configuration
export const removeAuthConfig = async (displayName: string, provider: string): Promise<void> => {
  const configs = await loadAuthConfigs();
  const filtered = configs.filter(
    c => !(c.displayName === displayName && c.provider === provider)
  );
  await saveAuthConfigs(filtered);
};

// Validate AWS credentials
export const validateAwsCredentials = async (
  credentials: { accessKeyId: string; secretAccessKey: string; region?: string; profile?: string }
): Promise<boolean> => {
  try {
    const env = { ...process.env };
    
    if (credentials.accessKeyId && credentials.secretAccessKey) {
      env.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
      env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
      if (credentials.region) {
        env.AWS_DEFAULT_REGION = credentials.region;
      }
    }
    
    const profileArg = credentials.profile ? `--profile ${credentials.profile}` : '';
    const { stdout } = await execAsync(`aws sts get-caller-identity ${profileArg}`, { env });
    
    return !!JSON.parse(stdout).Account;
  } catch (error) {
    console.error('AWS credential validation failed:', error);
    return false;
  }
};

// Validate Azure credentials
export const validateAzureCredentials = async (
  credentials: { tenantId?: string; clientId?: string; clientSecret?: string; subscriptionId?: string }
): Promise<boolean> => {
  try {
    // Check if already logged in
    const { stdout: accountList } = await execAsync('az account list --output json');
    const accounts = JSON.parse(accountList);
    
    if (accounts.length === 0) {
      // Try to login with service principal if provided
      if (credentials.tenantId && credentials.clientId && credentials.clientSecret) {
        await execAsync(
          `az login --service-principal -u ${credentials.clientId} -p ${credentials.clientSecret} --tenant ${credentials.tenantId}`
        );
      } else {
        return false;
      }
    }
    
    // Set subscription if provided
    if (credentials.subscriptionId) {
      await execAsync(`az account set --subscription ${credentials.subscriptionId}`);
    }
    
    return true;
  } catch (error) {
    console.error('Azure credential validation failed:', error);
    return false;
  }
};

// Validate GCP credentials
export const validateGcpCredentials = async (
  credentials: { keyFile?: string; projectId?: string }
): Promise<boolean> => {
  try {
    const env = { ...process.env };
    
    if (credentials.keyFile) {
      env.GOOGLE_APPLICATION_CREDENTIALS = credentials.keyFile;
    }
    
    const projectArg = credentials.projectId ? `--project=${credentials.projectId}` : '';
    const { stdout } = await execAsync(`gcloud auth list --format=json ${projectArg}`, { env });
    
    const accounts = JSON.parse(stdout);
    return accounts.length > 0 && accounts.some((acc: any) => acc.status === 'ACTIVE');
  } catch (error) {
    console.error('GCP credential validation failed:', error);
    return false;
  }
};

// Get cloud provider suggestions
export const getCloudProviderSuggestions = async (provider: string): Promise<{
  regions?: string[];
  locations?: string[];
  projects?: string[];
  subscriptions?: string[];
}> => {
  const suggestions: any = {};
  
  try {
    switch (provider) {
      case 'aws':
        const { stdout: awsRegions } = await execAsync('aws ec2 describe-regions --output json');
        suggestions.regions = JSON.parse(awsRegions).Regions.map((r: any) => r.RegionName);
        break;
        
      case 'azure':
        const { stdout: azureLocations } = await execAsync('az account list-locations --output json');
        suggestions.locations = JSON.parse(azureLocations).map((l: any) => l.name);
        
        const { stdout: azureSubs } = await execAsync('az account list --output json');
        suggestions.subscriptions = JSON.parse(azureSubs).map((s: any) => ({
          id: s.id,
          name: s.name
        }));
        break;
        
      case 'gcp':
        const { stdout: gcpProjects } = await execAsync('gcloud projects list --format=json');
        suggestions.projects = JSON.parse(gcpProjects).map((p: any) => ({
          id: p.projectId,
          name: p.name
        }));
        break;
    }
  } catch (error) {
    console.error(`Error getting suggestions for ${provider}:`, error);
  }
  
  return suggestions;
};

// Convert saved config to CloudCredential format
export const configToCredential = (config: CloudAuthConfig): CloudCredential => {
  const credential: CloudCredential = {
    name: config.displayName,
    provider: config.provider
  };
  
  switch (config.provider) {
    case 'aws':
      credential.profile = config.credentials.profile || config.displayName;
      break;
    case 'azure':
      credential.subscription = config.credentials.subscriptionId;
      break;
    case 'gcp':
      credential.project = config.credentials.projectId;
      break;
  }
  
  return credential;
};