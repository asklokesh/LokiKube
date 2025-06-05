// Mock for @kubernetes/client-node
export const KubeConfig = jest.fn().mockImplementation(() => ({
  loadFromFile: jest.fn(),
  makeApiClient: jest.fn(),
  getCurrentContext: jest.fn(),
  getContexts: jest.fn(),
  setCurrentContext: jest.fn()
}));

export const CoreV1Api = jest.fn();
export const AppsV1Api = jest.fn();
export const NetworkingV1Api = jest.fn();

// Mock functions and types
export type V1Pod = any;
export type V1Service = any;
export type V1ConfigMap = any;
export type V1Secret = any;
export type V1Deployment = any;
export type V1Namespace = any;

// Add other mock exports as needed 