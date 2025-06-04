import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import LogViewer from '@/components/LogViewer';
import { NextPage } from 'next';
import { FaSpinner, FaEdit, FaTrash, FaSyncAlt } from 'react-icons/fa';

const ResourceDetailPage: NextPage = () => {
  const router = useRouter();
  const { context, namespace, type, name } = router.query;
  
  const [resource, setResource] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [yamlContent, setYamlContent] = useState<string>('');
  const [savingChanges, setSavingChanges] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!context || !namespace || !type || !name) {
      return;
    }
    
    const fetchResource = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/resources/${context}/${namespace}/${type}/${name}`);
        if (!response.ok) {
          throw new Error('Failed to fetch resource');
        }
        
        const data = await response.json();
        setResource(data);
        
        // Get YAML representation
        const yamlResponse = await fetch(`/api/resources/${context}/${namespace}/${type}/${name}/yaml`);
        if (!yamlResponse.ok) {
          throw new Error('Failed to fetch resource YAML');
        }
        
        const yamlData = await yamlResponse.json();
        setYamlContent(yamlData.yaml);
      } catch (error) {
        console.error('Error fetching resource:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch resource');
      } finally {
        setLoading(false);
      }
    };
    
    fetchResource();
  }, [context, namespace, type, name]);
  
  // Calculate display title for resource type
  let displayType = 'Resource'; // Default fallback
  if (typeof type === 'string' && type.length > 0) { // type is from router.query
    const typeStr = type;
    let baseForCapitalization = typeStr;
    if (typeStr.endsWith('s') && typeStr.length > 1) { // If plural and not just 's'
      baseForCapitalization = typeStr.slice(0, -1); 
    }
    // Capitalize the first letter 
    if (baseForCapitalization.length > 0) {
      displayType = baseForCapitalization.charAt(0).toUpperCase() + baseForCapitalization.slice(1);
    } else if (typeStr.length > 0) { // Handle if baseForCapitalization became empty (e.g. typeStr was 's')
       displayType = typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
    }
  } else if (Array.isArray(type) && type.length > 0 && typeof type[0] === 'string' && type[0].length > 0) {
    // Basic fallback if 'type' is an array: use the first element
    const typeStr = type[0];
    let baseForCapitalization = typeStr;
     if (typeStr.endsWith('s') && typeStr.length > 1) {
      baseForCapitalization = typeStr.slice(0, -1);
    }
    if (baseForCapitalization.length > 0) {
      displayType = baseForCapitalization.charAt(0).toUpperCase() + baseForCapitalization.slice(1);
    } else if (typeStr.length > 0) {
       displayType = typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
    }
  }

  const handleRefresh = () => {
    if (!context || !namespace || !type || !name) {
      return;
    }
    
    setLoading(true);
    router.replace(router.asPath);
  };
  
  const handleDelete = async () => {
    if (!context || !namespace || !type || !name) {
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${type} "${name}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/resources/${context}/${namespace}/${type}/${name}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete resource');
      }
      
      router.push(`/`);
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert(`Failed to delete resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleSaveChanges = async () => {
    if (!context || !namespace) {
      return;
    }
    
    setSavingChanges(true);
    setSaveError(null);
    
    try {
      const response = await fetch(`/api/resources/${context}/yaml`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ yaml: yamlContent }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to apply changes');
      }
      
      setEditMode(false);
      handleRefresh();
    } catch (error) {
      console.error('Error applying changes:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to apply changes');
    } finally {
      setSavingChanges(false);
    }
  };
  
  const handleCancelEdit = () => {
    setEditMode(false);
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <FaSpinner className="animate-spin text-primary mr-2 text-xl" />
          <span>Loading resource...</span>
        </div>
      </Layout>
    );
  }
  
  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-red-100 dark:bg-red-900 text-error p-4 rounded">
            {error}
          </div>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
          >
            Go Back
          </button>
        </div>
      </Layout>
    );
  }
  
  const isPod = typeof type === 'string' && (type === 'pods' || type === 'pod');
  
  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {displayType}: {name}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({namespace})
            </span>
          </h1>
          
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              className="p-2 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
              title="Refresh"
            >
              <FaSyncAlt />
            </button>
            
            <button
              onClick={() => setEditMode(true)}
              className="p-2 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
              title="Edit YAML"
              disabled={editMode}
            >
              <FaEdit />
            </button>
            
            <button
              onClick={handleDelete}
              className="p-2 bg-red-500 rounded text-white"
              title="Delete"
            >
              <FaTrash />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-secondary shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">
              {editMode ? 'Edit YAML' : 'YAML'}
            </h2>
            
            {editMode ? (
              <div>
                <textarea
                  className="w-full h-80 p-3 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-secondary-dark"
                  value={yamlContent}
                  onChange={(e) => setYamlContent(e.target.value)}
                />
                
                {saveError && (
                  <div className="mt-4 text-error p-4 bg-red-100 dark:bg-red-900 bg-opacity-50 rounded">
                    {saveError}
                  </div>
                )}
                
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                    disabled={savingChanges}
                  >
                    {savingChanges ? (
                      <>
                        <FaSpinner className="animate-spin inline mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                  
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <pre className="overflow-auto bg-gray-100 dark:bg-secondary-dark p-4 rounded h-80 font-mono text-sm">
                {yamlContent}
              </pre>
            )}
          </div>
          
          {isPod && (
            <div className="bg-white dark:bg-secondary shadow rounded-lg">
              <LogViewer
                context={context as string}
                namespace={namespace as string}
                podName={name as string}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ResourceDetailPage; 