import React, { useEffect, useState } from 'react';
import { useClusterStore } from '@/store/clusterStore';
import { FaSpinner, FaExclamationTriangle, FaCube, FaLayerGroup, FaServer, FaNetworkWired, FaCogs } from 'react-icons/fa';
import Link from 'next/link';

type ResourceType = 'pods' | 'deployments' | 'services' | 'configmaps' | 'secrets';

// Define interface for resource data
interface K8sResource {
  metadata: {
    name: string;
    uid: string;
    creationTimestamp?: string;
    [key: string]: any;
  };
  status?: {
    phase?: string;
    conditions?: Array<{
      status: string;
      type: string;
      [key: string]: any;
    }>;
    [key: string]: any;
  };
  [key: string]: any;
}

const ResourceDashboard: React.FC = () => {
  const { selectedCluster, activeNamespaces } = useClusterStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resources, setResources] = useState<any>({});
  const [selectedResourceType, setSelectedResourceType] = useState<ResourceType>('pods');
  const [selectedNamespace, setSelectedNamespace] = useState<string>('default');
  const [availableNamespaces, setAvailableNamespaces] = useState<string[]>([]);
  
  // Load namespaces when selected cluster changes
  useEffect(() => {
    if (!selectedCluster) return;
    
    const fetchNamespaces = async () => {
      try {
        const response = await fetch(`/api/resources/${selectedCluster.context}/namespaces`);
        if (!response.ok) {
          throw new Error('Failed to fetch namespaces');
        }
        
        // Define interface for namespace data
        interface NamespaceResource {
          metadata: {
            name: string;
            [key: string]: any;
          };
          [key: string]: any;
        }
        
        const data = await response.json();
        setAvailableNamespaces(data.map((ns: NamespaceResource) => ns.metadata.name));
      } catch (error) {
        console.error('Error fetching namespaces:', error);
      }
    };
    
    fetchNamespaces();
  }, [selectedCluster]);
  
  // Load resources when namespace or resource type changes
  useEffect(() => {
    if (!selectedCluster || !selectedNamespace) return;
    
    const fetchResources = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/resources/${selectedCluster.context}/${selectedNamespace}?resourceType=${selectedResourceType}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${selectedResourceType}`);
        }
        
        const data = await response.json();
        setResources(data);
      } catch (error) {
        console.error(`Error fetching ${selectedResourceType}:`, error);
        setError(`Failed to fetch ${selectedResourceType}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResources();
  }, [selectedCluster, selectedNamespace, selectedResourceType]);
  
  const getResourceIcon = (type: ResourceType) => {
    switch (type) {
      case 'pods':
        return <FaCube />;
      case 'deployments':
        return <FaLayerGroup />;
      case 'services':
        return <FaNetworkWired />;
      case 'configmaps':
        return <FaCogs />;
      case 'secrets':
        return <FaServer />;
      default:
        return <FaCube />;
    }
  };
  
  // Get status indicator color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
      case 'ready':
      case 'active':
        return 'bg-success';
      case 'pending':
      case 'updating':
        return 'bg-warning';
      case 'failed':
      case 'error':
        return 'bg-error';
      default:
        return 'bg-gray-400';
    }
  };
  
  if (!selectedCluster) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <FaExclamationTriangle className="text-yellow-500 text-4xl mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Cluster Selected</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Please select a cluster or connect to a new one to view resources.
          </p>
          <Link href="/connect" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark">
            Connect to a Cluster
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {selectedCluster.name}
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({selectedCluster.provider})
          </span>
        </h1>
        
        <div className="flex space-x-2">
          <select
            className="border border-gray-300 dark:border-gray-600 rounded p-2 dark:bg-secondary-dark"
            value={selectedNamespace}
            onChange={(e) => setSelectedNamespace(e.target.value)}
          >
            {availableNamespaces.map(ns => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="bg-white dark:bg-secondary shadow rounded-lg">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <ul className="flex overflow-x-auto">
            {['pods', 'deployments', 'services', 'configmaps', 'secrets'].map((type) => (
              <li key={type}>
                <button
                  className={`px-4 py-3 flex items-center space-x-2 ${
                    selectedResourceType === type
                      ? 'border-b-2 border-primary text-primary dark:text-primary-light'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setSelectedResourceType(type as ResourceType)}
                >
                  {getResourceIcon(type as ResourceType)}
                  <span className="capitalize">{type}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <FaSpinner className="animate-spin text-primary mr-2" />
              <span>Loading resources...</span>
            </div>
          ) : error ? (
            <div className="text-error p-4 bg-red-100 dark:bg-red-900 bg-opacity-50 rounded">
              {error}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-secondary-light">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Age
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-secondary divide-y divide-gray-200 dark:divide-gray-700">
                  {resources && resources.items && resources.items.length > 0 ? (
                    resources.items.map((resource: K8sResource) => (
                      <tr key={resource.metadata.uid} className="hover:bg-gray-50 dark:hover:bg-secondary-light">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {resource.metadata.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              getStatusColor(
                                selectedResourceType === 'pods' 
                                  ? resource.status?.phase || 'Unknown'
                                  : resource.status?.conditions?.[0]?.status || 'Unknown'
                              )
                            }`} />
                            <span>
                              {selectedResourceType === 'pods' 
                                ? resource.status?.phase || 'Unknown'
                                : resource.status?.conditions?.[0]?.status || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {resource.metadata.creationTimestamp 
                            ? new Date(resource.metadata.creationTimestamp).toLocaleString() 
                            : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/resource/${selectedCluster.context}/${selectedNamespace}/${selectedResourceType}/${resource.metadata.name}`}
                            className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No {selectedResourceType} found in this namespace.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceDashboard; 