import * as os from 'os';
import * as path from 'path';

// Mock the modules
jest.mock('os');

const mockedOs = jest.mocked(os);

// Import after mocking to ensure the mocked version is used
import { getKubeConfigPath } from '@/services/kubernetes';

describe('getKubeConfigPath', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env and mocks before each test
    jest.resetModules();
    process.env = { ...originalEnv };
    mockedOs.homedir.mockClear();
  });

  afterAll(() => {
    // Restore original process.env after all tests
    process.env = originalEnv;
  });

  it('should return KUBECONFIG environment variable if set', () => {
    const testPath = '/custom/path/to/kubeconfig';
    process.env.KUBECONFIG = testPath;
    
    const result = getKubeConfigPath();
    expect(result).toBe(testPath);
  });

  it('should return default path in home directory if KUBECONFIG is not set', () => {
    delete process.env.KUBECONFIG;
    const homeDir = '/test/home';
    mockedOs.homedir.mockReturnValue(homeDir);
    
    const result = getKubeConfigPath();
    const expectedPath = path.join(homeDir, '.kube', 'config');
    expect(result).toBe(expectedPath);
  });

  it('should handle empty KUBECONFIG environment variable by falling back to default', () => {
    process.env.KUBECONFIG = '';
    const homeDir = '/test/home/default';
    mockedOs.homedir.mockReturnValue(homeDir);

    const result = getKubeConfigPath();
    const expectedPath = path.join(homeDir, '.kube', 'config');
    expect(result).toBe(expectedPath);
  });
});