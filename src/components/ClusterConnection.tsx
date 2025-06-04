import React, { useEffect, useState } from 'react';
import { useClusterStore } from '@/store/clusterStore';
import { CloudCredential, KubeConfig } from '@/services/kubernetes';
import { FaAws, FaGoogle, FaMicrosoft, FaServer, FaSpinner } from 'react-icons/fa';

const ClusterConnection: React.FC = () => {
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
  const [selectedCloudCluster, setSelectedCloudCluster] = useState<string>('');
  
  const [availableCloudClusters, setAvailableCloudClusters] = useState<string[]>([]);
  const [isLoadingCloudClusters, setIsLoadingCloudClusters] = useState<boolean>(false);
  const [cloudClustersError, setCloudClustersError] = useState<string | null>(null);

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
        setSelectedCloudCluster('');
        try {
          const response = await fetch('/api/cloud-clusters', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ credential: selectedCredential }),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch clusters for this credential');
          }
          const data = await response.json();
          setAvailableCloudClusters(data.clusters || []);
          if ((data.clusters || []).length > 0) {
            setSelectedCloudCluster(data.clusters[0]);
          }
        } catch (error: any) {
          console.error('Error fetching cloud clusters:', error);
          setCloudClustersError(error.message || 'Failed to fetch clusters.');
        } finally {
          setIsLoadingCloudClusters(false);
        }
      };
      fetchCloudClusters();
    } else {
      setAvailableCloudClusters([]);
      setSelectedCloudCluster('');
      setCloudClustersError(null);
    }
  }, [selectedCredential, connectionTab]);
  
  const handleConnectExisting = () => {
    if (!selectedExistingCluster) return;
    
    addConnectedCluster(selectedExistingCluster);
    setSelectedExistingCluster(null);
  };
  
  const handleConnectNew = async () => {
    const clusterToConnect = selectedCloudCluster || typedClusterName;
    if (!selectedCredential || !clusterToConnect) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const response = await fetch('/api/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: selectedCredential,
          clusterName: clusterToConnect,
        }),
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
      
      const newCluster = clusters.find((c: KubeConfig) => c.name.includes(clusterToConnect));
      if (newCluster) {
        addConnectedCluster(newCluster);
      }
      
      setTypedClusterName('');
      setSelectedCloudCluster('');
    } catch (error) {
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
                        value={selectedCloudCluster}
                        onChange={(e) => setSelectedCloudCluster(e.target.value)}
                      >
                        <option value="">-- Select a cluster --</option>
                        {availableCloudClusters.map(clusterName => (
                          <option key={clusterName} value={clusterName}>
                            {clusterName}
                          </option>
                        ))}
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
                  disabled={!selectedCredential || (!selectedCloudCluster && !typedClusterName) || isConnecting || isLoadingCloudClusters}
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