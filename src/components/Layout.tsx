import React, { ReactNode } from 'react';
import { useClusterStore } from '@/store/clusterStore';
import { FaServer, FaCloudDownloadAlt, FaSignOutAlt, FaCog } from 'react-icons/fa';
import Link from 'next/link';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { 
    connectedClusters, 
    selectedCluster, 
    setSelectedCluster, 
    removeConnectedCluster 
  } = useClusterStore();

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-secondary-dark">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-secondary shadow-md">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-primary dark:text-primary-light">LokiKube</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">K8s Cluster Management</p>
        </div>
        
        <div className="p-4">
          <Link 
            href="/connect" 
            className="flex items-center justify-center w-full py-2 px-4 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
          >
            <FaCloudDownloadAlt className="mr-2" />
            Connect Cluster
          </Link>
        </div>
        
        <div className="p-4">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Connected Clusters
          </h2>
          <ul>
            {connectedClusters.map((cluster) => (
              <li key={cluster.name} className="mb-1">
                <button
                  onClick={() => setSelectedCluster(cluster)}
                  className={`flex items-center w-full py-2 px-4 rounded text-left ${
                    selectedCluster?.name === cluster.name
                      ? 'bg-primary-light bg-opacity-20 text-primary dark:text-primary-light'
                      : 'hover:bg-gray-100 dark:hover:bg-secondary-light text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <FaServer className="mr-2 text-gray-500" />
                  <span className="text-sm truncate flex-1">{cluster.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeConnectedCluster(cluster.name);
                    }}
                    className="text-gray-400 hover:text-error p-1 rounded-full hover:bg-gray-200 dark:hover:bg-secondary-light"
                    title="Disconnect"
                  >
                    <FaSignOutAlt size={12} />
                  </button>
                </button>
              </li>
            ))}
            {connectedClusters.length === 0 && (
              <li className="text-sm text-gray-500 dark:text-gray-400 italic">
                No clusters connected
              </li>
            )}
          </ul>
        </div>
        
        <div className="absolute bottom-0 w-64 border-t border-gray-200 dark:border-gray-700 p-4">
          <Link 
            href="/settings"
            className="flex items-center text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light"
          >
            <FaCog className="mr-2" />
            Settings
          </Link>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};

export default Layout; 