import React, { useEffect, useState } from 'react';
import { useClusterStore } from '@/store/clusterStore';
import { CloudCredential, KubeConfig } from '@/services/kubernetes';
import { FaAws, FaGoogle, FaMicrosoft, FaServer, FaSpinner } from 'react-icons/fa';
import { useRouter } from 'next/router';

const AWS_REGIONS = [
  { label: 'US East (N. Virginia) us-east-1', value: 'us-east-1' },
  { label: 'US West (Oregon) us-west-2', value: 'us-west-2' },
  { label: 'US East (Ohio) us-east-2', value: 'us-east-2' },
  { label: 'US West (N. California) us-west-1', value: 'us-west-1' },
  { label: 'Europe (Ireland) eu-west-1', value: 'eu-west-1' },
  { label: 'Europe (Frankfurt) eu-central-1', value: 'eu-central-1' },
  { label: 'Asia Pacific (Tokyo) ap-northeast-1', value: 'ap-northeast-1' },
  { label: 'Asia Pacific (Singapore) ap-southeast-1', value: 'ap-southeast-1' },
];

const AZURE_LOCATIONS = [
  { label: 'East US', value: 'eastus' },
  { label: 'West US', value: 'westus' },
  { label: 'West Europe', value: 'westeurope' },
  { label: 'North Europe', value: 'northeurope' },
  { label: 'Central US', value: 'centralus' },
  { label: 'East Asia', value: 'eastasia' },
  { label: 'Southeast Asia', value: 'southeastasia' },
  { label: 'Japan East', value: 'japaneast' },
];

const ClusterConnection: React.FC = () => {
  const router = useRouter();
  const { 
    availableClusters, 
    cloudCredentials, 
    isLoadingClusters,
    isLoadingCredentials,
    isConnecting,
    clusterError,
    credentialError,
    connectionError,
    setAvailableClusters,
    setCloudCredentials,
    addConnectedCluster,
    setIsLoadingClusters,
    setIsLoadingCredentials,
    setIsConnecting,
    setClusterError,
    setCredentialError,
    setConnectionError
  } = useClusterStore();
  
  const [selectedCredential, setSelectedCredential] = useState<CloudCredential | null>(null);
  const [typedClusterName, setTypedClusterName] = useState('');
  const [selectedCloudClusterName, setSelectedCloudClusterName] = useState<string>('');
  
  const [availableCloudClusters, setAvailableCloudClusters] = useState<Array<string | { name: string; resourceGroup: string; location: string }>>([]);
  const [isLoadingCloudClusters, setIsLoadingCloudClusters] = useState<boolean>(false);
  const [cloudClustersError, setCloudClustersError] = useState<string | null>(null);

  const [selectedAwsRegions, setSelectedAwsRegions] = useState<string[]>(['us-east-1', 'us-west-2']);
  const [selectedAzureLocations, setSelectedAzureLocations] = useState<string[]>(['eastus', 'westus']);

  const [selectedExistingCluster, setSelectedExistingCluster] = useState<KubeConfig | null>(null);
  const [connectionTab, setConnectionTab] = useState<'existing' | 'new'>('existing');
  
  useEffect(() => {
    const loadKubeConfigClusters = async () => {
      setIsLoadingClusters(true);
      setClusterError(null);
      
      try {
        const response = await fetch('/api/clusters');
        if (!response.ok) {
          throw new Error('Failed to load clusters from kubeconfig');
        }
        
        const clusters = await response.json();
        setAvailableClusters(clusters);
      } catch (error) {
        console.error('Error loading kubeconfig clusters:', error);
        setClusterError('Failed to load existing clusters from kubeconfig');
      } finally {
        setIsLoadingClusters(false);
      }
    };
    
    const loadAllCredentials = async () => {
      setIsLoadingCredentials(true);
      setCredentialError(null);
      
      try {
        const response = await fetch('/api/credentials');
        if (!response.ok) {
          throw new Error('Failed to load credentials');
        }
        
        const credentials = await response.json();
        setCloudCredentials(credentials);
      } catch (error) {
        console.error('Error loading credentials:', error);
        setCredentialError('Failed to load cloud credentials');
      } finally {
        setIsLoadingCredentials(false);
      }
    };
    
    loadKubeConfigClusters();
    loadAllCredentials();
  }, []);

  useEffect(() => {
    if (selectedCredential && connectionTab === 'new') {
      const fetchCloudClusters = async () => {
        setIsLoadingCloudClusters(true);
        setCloudClustersError(null);
        setAvailableCloudClusters([]);
        setSelectedCloudClusterName('');
        
        const apiRequestBody: { 
          credential: CloudCredential, 
          regions?: string[],
          locations?: string[]
        } = { credential: selectedCredential };

        if (selectedCredential.provider === 'aws' && selectedAwsRegions.length > 0) {
          apiRequestBody.regions = selectedAwsRegions;
        } else if (selectedCredential.provider === 'azure' && selectedAzureLocations.length > 0) {
          apiRequestBody.locations = selectedAzureLocations;
        }

        try {
          const response = await fetch('/api/cloud-clusters', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiRequestBody),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch clusters for this credential');
          }
          const data = await response.json();
          const fetchedClusters = data.clusters || [];
          setAvailableCloudClusters(fetchedClusters);
          if (fetchedClusters.length > 0) {
            if (selectedCredential.provider === 'azure' && typeof fetchedClusters[0] === 'object') {
              setSelectedCloudClusterName((fetchedClusters[0] as { name: string }).name);
            } else if (typeof fetchedClusters[0] === 'string') {
              setSelectedCloudClusterName(fetchedClusters[0] as string);
            }
          }
        } catch (error: unknown) {
          console.error('Error fetching cloud clusters:', error);
          setCloudClustersError(
            error instanceof Error ? error.message : 'Failed to fetch clusters.'
          );
        } finally {
          setIsLoadingCloudClusters(false);
        }
      };
      fetchCloudClusters();
    } else {
      setAvailableCloudClusters([]);
      setSelectedCloudClusterName('');
      setCloudClustersError(null);
    }
  }, [selectedCredential, connectionTab, selectedAwsRegions, selectedAzureLocations, setAvailableCloudClusters]);
  
  const handleConnectExisting = () => {
    if (!selectedExistingCluster) return;
    
    addConnectedCluster(selectedExistingCluster);
    router.push('/');
  };
  
  const handleConnectNew = async () => {
    const clusterToConnectName = selectedCloudClusterName || typedClusterName;
    if (!selectedCredential || !clusterToConnectName) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      let resourceGroup: string | undefined = undefined;
      if (selectedCredential.provider === 'azure') {
        const selectedClusterObj = availableCloudClusters.find(
          (c): c is { name: string; resourceGroup: string; location: string } => 
            typeof c === 'object' && c.name === clusterToConnectName
        );
        if (selectedClusterObj) {
          resourceGroup = selectedClusterObj.resourceGroup;
        } else if (!typedClusterName) {
          throw new Error(`Could not find details for Azure cluster: ${clusterToConnectName}. Resource group is missing.`);
        }
      }

      // Define proper interface for connect payload
      interface ConnectPayload {
        provider: string;
        clusterName: string;
        credentialName: string;
        subscriptionId?: string;
        projectId?: string;
        region?: string;
        resourceGroup?: string;
      }

      const connectPayload: ConnectPayload = {
        provider: selectedCredential.provider,
        clusterName: clusterToConnectName,
        credentialName: selectedCredential.profile || selectedCredential.name,
        subscriptionId: selectedCredential.subscription,
        projectId: selectedCredential.project,
        region: selectedCredential.provider === 'aws' && selectedAwsRegions.length > 0 ? selectedAwsRegions[0] :
                selectedCredential.provider === 'azure' && selectedAzureLocations.length > 0 ? selectedAzureLocations[0] :
                undefined,
      };

      if (selectedCredential.provider === 'azure' && resourceGroup) {
        connectPayload.resourceGroup = resourceGroup;
      }

      const response = await fetch('/api/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectPayload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect to cluster');
      }
      
      const clustersResponse = await fetch('/api/clusters');
      if (!clustersResponse.ok) {
        throw new Error('Failed to reload clusters after connection');
      }
      
      const clusters = await clustersResponse.json();
      setAvailableClusters(clusters);
      
      const newCluster = clusters.find((c: KubeConfig) => c.name.includes(clusterToConnectName));
      if (newCluster) {
        addConnectedCluster(newCluster);
      }
      
      router.push('/');
      
      setTypedClusterName('');
      setSelectedCloudClusterName('');
    } catch (error: unknown) {
      console.error('Error connecting to cluster:', error);
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect to cluster');
    } finally {
      setIsConnecting(false);
    }
  };
  
  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'aws':
        return <FaAws className="mr-2 text-yellow-500" />;
      case 'gcp':
        return <FaGoogle className="mr-2 text-blue-500" />;
      case 'azure':
        return <FaMicrosoft className="mr-2 text-blue-400" />;
      default:
        return <FaServer className="mr-2 text-gray-500" />;
    }
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Connect to Cluster</h1>
      
      <div className="bg-white dark:bg-secondary shadow rounded-lg p-6">
        <div className="flex mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            className={`py-2 px-4 ${
              connectionTab === 'existing'
                ? 'border-b-2 border-primary text-primary dark:text-primary-light'
                : 'text-gray-500 dark:text-gray-400'
            }`}
            onClick={() => setConnectionTab('existing')}
          >
            Existing Clusters
          </button>
          <button
            className={`py-2 px-4 ${
              connectionTab === 'new'
                ? 'border-b-2 border-primary text-primary dark:text-primary-light'
                : 'text-gray-500 dark:text-gray-400'
            }`}
            onClick={() => setConnectionTab('new')}
          >
            New Connection
          </button>
        </div>
        
        {connectionTab === 'existing' ? (
          <div>
            <h2 className="text-lg font-medium mb-4">Connect to an existing cluster from kubeconfig</h2>
            
            {isLoadingClusters ? (
              <div className="flex items-center justify-center p-8">
                <FaSpinner className="animate-spin text-primary mr-2" />
                <span>Loading clusters...</span>
              </div>
            ) : clusterError ? (
              <div className="text-error p-4 bg-red-100 dark:bg-red-900 bg-opacity-50 rounded">
                {clusterError}
              </div>
            ) : availableClusters.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 p-4">
                No existing Kubernetes clusters found in your kubeconfig.
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label htmlFor="existingClusterSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Cluster
                  </label>
                  <select
                    id="existingClusterSelect"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-secondary-dark"
                    value={selectedExistingCluster?.name || ''}
                    onChange={(e) => {
                      const selected = availableClusters.find(c => c.name === e.target.value);
                      setSelectedExistingCluster(selected || null);
                    }}
                  >
                    <option value="">-- Select a cluster --</option>
                    {availableClusters.map(cluster => (
                      <option key={cluster.name} value={cluster.name}>
                        {cluster.name} ({cluster.provider})
                      </option>
                    ))}
                  </select>
                </div>
                
                <button
                  className="py-2 px-4 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedExistingCluster || isConnecting}
                  onClick={handleConnectExisting}
                >
                  {isConnecting && selectedExistingCluster ? <FaSpinner className="animate-spin inline mr-2" /> : null}
                  Connect
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-medium mb-4">Connect to a new cluster via Cloud Provider</h2>
            
            {isLoadingCredentials ? (
              <div className="flex items-center justify-center p-8">
                <FaSpinner className="animate-spin text-primary mr-2" />
                <span>Loading credentials...</span>
              </div>
            ) : credentialError ? (
              <div className="text-error p-4 bg-red-100 dark:bg-red-900 bg-opacity-50 rounded">
                {credentialError}
              </div>
            ) : cloudCredentials.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 p-4">
                No cloud provider credentials found. Ensure AWS, GCP, or Azure CLI is installed and configured.
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Credential
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cloudCredentials.map(cred => (
                      <button
                        key={`${cred.provider}-${cred.name}`}
                        className={`p-3 border rounded-lg flex items-center text-left w-full ${
                          selectedCredential?.name === cred.name && selectedCredential?.provider === cred.provider
                            ? 'border-primary bg-primary-light bg-opacity-10'
                            : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                        }`}
                        onClick={() => setSelectedCredential(cred)}
                      >
                        {getProviderIcon(cred.provider)}
                        <span className="flex-1 truncate">{cred.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* AWS Region Selector */}
                {selectedCredential?.provider === 'aws' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select AWS Regions to Scan (defaults to us-east-1, us-west-2 if none selected)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {AWS_REGIONS.map(region => (
                        <label key={region.value} className="flex items-center space-x-2 p-2 border rounded-md hover:border-primary cursor-pointer dark:border-gray-600 dark:hover:border-primary-light">
                          <input 
                            type="checkbox" 
                            className="form-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary dark:border-gray-500 dark:checked:bg-primary dark:focus:ring-offset-secondary-dark"
                            value={region.value}
                            checked={selectedAwsRegions.includes(region.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAwsRegions(prev => [...prev, region.value]);
                              } else {
                                setSelectedAwsRegions(prev => prev.filter(r => r !== region.value));
                              }
                            }}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{region.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Azure Location Selector */}
                {selectedCredential?.provider === 'azure' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Azure Locations to Scan (defaults to all if none selected)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {AZURE_LOCATIONS.map(location => (
                        <label key={location.value} className="flex items-center space-x-2 p-2 border rounded-md hover:border-primary cursor-pointer dark:border-gray-600 dark:hover:border-primary-light">
                          <input 
                            type="checkbox" 
                            className="form-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary dark:border-gray-500 dark:checked:bg-primary dark:focus:ring-offset-secondary-dark"
                            value={location.value}
                            checked={selectedAzureLocations.includes(location.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAzureLocations(prev => [...prev, location.value]);
                              } else {
                                setSelectedAzureLocations(prev => prev.filter(loc => loc !== location.value));
                              }
                            }}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{location.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedCredential && (
                  <div className="mb-4">
                    <label htmlFor="cloudClusterSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Cluster for {selectedCredential.name}
                    </label>
                    {isLoadingCloudClusters ? (
                       <div className="flex items-center">
                         <FaSpinner className="animate-spin text-primary mr-2" />
                         <span>Fetching clusters...</span>
                       </div>
                    ) : cloudClustersError ? (
                      <div className="text-error p-2 bg-red-100 dark:bg-red-900 bg-opacity-50 rounded">
                        {cloudClustersError}
                      </div>
                    ) : availableCloudClusters.length > 0 ? (
                      <select
                        id="cloudClusterSelect"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-secondary-dark"
                        value={selectedCloudClusterName}
                        onChange={(e) => setSelectedCloudClusterName(e.target.value)}
                      >
                        <option value="">-- Select a cluster --</option>
                        {availableCloudClusters.map(cluster => {
                          if (typeof cluster === 'string') {
                            return <option key={cluster} value={cluster}>{cluster}</option>;
                          } else {
                            return <option key={cluster.name} value={cluster.name}>{cluster.name} ({cluster.location})</option>;
                          }
                        })}
                      </select>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400 p-2">
                        No clusters found for this credential, or unable to list them. You can try typing the name below.
                      </div>
                    )}
                  </div>
                )}

                {selectedCredential && (availableCloudClusters.length === 0 || cloudClustersError) && (
                    <div className="mb-4">
                        <label htmlFor="typedClusterNameInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Or Enter Cluster Name Manually
                        </label>
                        <input
                            id="typedClusterNameInput"
                            type="text"
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-secondary-dark"
                            placeholder="e.g., my-eks-cluster"
                            value={typedClusterName}
                            onChange={(e) => setTypedClusterName(e.target.value)}
                            disabled={isLoadingCloudClusters}
                        />
                    </div>
                )}
                
                {connectionError && (
                  <div className="text-error p-4 bg-red-100 dark:bg-red-900 bg-opacity-50 rounded mb-4">
                    {connectionError}
                  </div>
                )}
                
                <button
                  className="py-2 px-4 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedCredential || (!selectedCloudClusterName && !typedClusterName) || isConnecting || isLoadingCloudClusters}
                  onClick={handleConnectNew}
                >
                  {isConnecting ? (
                    <>
                      <FaSpinner className="animate-spin inline mr-2" />
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClusterConnection; 