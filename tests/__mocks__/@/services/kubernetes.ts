import * as path from 'path';
import * as os from 'os';

// Mock implementation of getKubeConfigPath
export const getKubeConfigPath = (): string => {
  if (process.env.KUBECONFIG && process.env.KUBECONFIG.length > 0) {
    return process.env.KUBECONFIG;
  }
  return path.join(os.homedir(), '.kube', 'config');
};

// Add mocks for other functions as needed
export const loadKubeConfig = jest.fn();
export const listNamespaces = jest.fn();
export const listPods = jest.fn();
export const listDeployments = jest.fn();
export const listServices = jest.fn();
export const listConfigMaps = jest.fn();
export const listSecrets = jest.fn();
export const getPodLogs = jest.fn();
export const describeResource = jest.fn();
export const execInPod = jest.fn();
export const loadCloudCredentials = jest.fn(); 