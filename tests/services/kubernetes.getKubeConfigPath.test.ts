import { getKubeConfigPath } from '@/services/kubernetes';
import * as os from 'os';
import * as path from 'path';

// Mock the os module
jest.mock('os');
const mockedOs = os as jest.Mocked<typeof os>;

describe('getKubeConfigPath', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env and mocks before each test
    jest.resetModules(); // Clears the cache for modules, ensuring fresh imports if needed
    process.env = { ...originalEnv }; // Restore original process.env
    mockedOs.homedir.mockClear();
  });

  afterAll(() => {
    // Restore original process.env after all tests
    process.env = originalEnv;
  });

  it('should return KUBECONFIG environment variable if set', () => {
    const testPath = '/custom/path/to/kubeconfig';
    process.env.KUBECONFIG = testPath;
    expect(getKubeConfigPath()).toBe(testPath);
  });

  it('should return default path in home directory if KUBECONFIG is not set', () => {
    delete process.env.KUBECONFIG; // Ensure KUBECONFIG is not set
    const homeDir = '/test/home';
    mockedOs.homedir.mockReturnValue(homeDir);
    
    const expectedPath = path.join(homeDir, '.kube', 'config');
    expect(getKubeConfigPath()).toBe(expectedPath);
  });

  it('should handle empty KUBECONFIG environment variable by falling back to default', () => {
    process.env.KUBECONFIG = ''; // Set KUBECONFIG to an empty string
    const homeDir = '/test/home/default';
    mockedOs.homedir.mockReturnValue(homeDir);

    const expectedPath = path.join(homeDir, '.kube', 'config');
    expect(getKubeConfigPath()).toBe(expectedPath);
  });
}); 