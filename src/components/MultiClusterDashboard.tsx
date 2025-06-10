import React, { useState, useEffect } from 'react';
import { useClusterStore } from '@/store/clusterStore';
import { KubeConfig } from '@/services/kubernetes';
import { FaServer, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaSyncAlt, FaLayerGroup, FaChartBar, FaCog } from 'react-icons/fa';
import { useRouter } from 'next/router';

interface ClusterHealthStatus {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  details?: {
    nodes: { ready: number; total: number };
    pods: { running: number; total: number };
    deployments?: { ready: number; total: number };
  };
}

interface ClusterMetrics {
  cpu: { usage: number; capacity: number };
  memory: { usage: number; capacity: number };
  pods: { running: number; capacity: number };
}

const MultiClusterDashboard: React.FC = () => {
  const router = useRouter();
  const {
    connectedClusters,
    selectedClusters,
    viewMode,
    alerts,
    toggleSelectedCluster,
    setViewMode,
  } = useClusterStore();

  const [clusterHealth, setClusterHealth] = useState<Record<string, ClusterHealthStatus>>({});
  const [clusterMetrics, setClusterMetrics] = useState<Record<string, ClusterMetrics>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <FaCheckCircle className="text-green-500" />;
      case 'warning':
        return <FaExclamationTriangle className="text-yellow-500" />;
      case 'critical':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaServer className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'critical':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const fetchClusterHealth = async (cluster: KubeConfig) => {
    try {
      const response = await fetch(`/api/clusters/${cluster.context}/health`);
      if (response.ok) {
        const health = await response.json();
        setClusterHealth(prev => ({ ...prev, [cluster.name]: health }));
      }
    } catch (error) {
      console.error(`Error fetching health for ${cluster.name}:`, error);
      setClusterHealth(prev => ({
        ...prev,
        [cluster.name]: {
          status: 'unknown',
          message: 'Unable to fetch cluster health',
        },
      }));
    }
  };

  const fetchClusterMetrics = async (cluster: KubeConfig) => {
    try {
      const response = await fetch(`/api/clusters/${cluster.context}/metrics`);
      if (response.ok) {
        const metrics = await response.json();
        setClusterMetrics(prev => ({ ...prev, [cluster.name]: metrics }));
      }
    } catch (error) {
      console.error(`Error fetching metrics for ${cluster.name}:`, error);
    }
  };

  const refreshAllClusters = async () => {
    setIsRefreshing(true);
    const promises = connectedClusters.flatMap(cluster => [
      fetchClusterHealth(cluster),
      fetchClusterMetrics(cluster),
    ]);
    await Promise.all(promises);
    setIsRefreshing(false);
  };

  useEffect(() => {
    refreshAllClusters();
    const interval = setInterval(refreshAllClusters, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [connectedClusters]);

  const renderClusterCard = (cluster: KubeConfig) => {
    const health = clusterHealth[cluster.name] || { status: 'unknown', message: 'Loading...' };
    const metrics = clusterMetrics[cluster.name];
    const isSelected = selectedClusters.some(c => c.name === cluster.name);
    const clusterAlerts = alerts.filter(a => a.resource?.name === cluster.name);

    return (
      <div
        key={cluster.name}
        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
          isSelected ? 'ring-2 ring-primary' : ''
        } ${getStatusColor(health.status)}`}
        onClick={() => toggleSelectedCluster(cluster)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {getStatusIcon(health.status)}
            <h3 className="font-semibold text-lg">{cluster.name}</h3>
          </div>
          <div className="flex items-center space-x-2">
            {cluster.provider && (
              <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                {cluster.provider.toUpperCase()}
              </span>
            )}
            {cluster.region && (
              <span className="text-xs px-2 py-1 bg-blue-200 dark:bg-blue-700 rounded">
                {cluster.region}
              </span>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{health.message}</p>

        {health.details && (
          <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
            <div className="text-center">
              <div className="font-semibold">Nodes</div>
              <div>{health.details.nodes.ready}/{health.details.nodes.total}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">Pods</div>
              <div>{health.details.pods.running}/{health.details.pods.total}</div>
            </div>
            {health.details.deployments && (
              <div className="text-center">
                <div className="font-semibold">Deployments</div>
                <div>{health.details.deployments.ready}/{health.details.deployments.total}</div>
              </div>
            )}
          </div>
        )}

        {metrics && (
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>CPU Usage</span>
                <span>{((metrics.cpu.usage / metrics.cpu.capacity) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(metrics.cpu.usage / metrics.cpu.capacity) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Memory Usage</span>
                <span>{((metrics.memory.usage / metrics.memory.capacity) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(metrics.memory.usage / metrics.memory.capacity) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {clusterAlerts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs font-semibold mb-1">Active Alerts ({clusterAlerts.length})</div>
            {clusterAlerts.slice(0, 2).map(alert => (
              <div key={alert.id} className="text-xs text-red-600 dark:text-red-400">
                • {alert.title}
              </div>
            ))}
            {clusterAlerts.length > 2 && (
              <div className="text-xs text-gray-500">
                +{clusterAlerts.length - 2} more
              </div>
            )}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/cluster/${cluster.context}`);
            }}
            className="text-sm text-primary hover:text-primary-dark"
          >
            View Details
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/cluster/${cluster.context}/resources`);
            }}
            className="text-sm text-primary hover:text-primary-dark"
          >
            Resources
          </button>
        </div>
      </div>
    );
  };

  const renderComparisonView = () => {
    if (selectedClusters.length < 2) {
      return (
        <div className="text-center py-8 text-gray-500">
          Select at least 2 clusters to compare
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Metric
              </th>
              {selectedClusters.map(cluster => (
                <th key={cluster.name} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {cluster.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">Status</td>
              {selectedClusters.map(cluster => {
                const health = clusterHealth[cluster.name];
                return (
                  <td key={cluster.name} className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(health?.status || 'unknown')}
                      <span>{health?.status || 'unknown'}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">CPU Usage</td>
              {selectedClusters.map(cluster => {
                const metrics = clusterMetrics[cluster.name];
                return (
                  <td key={cluster.name} className="px-6 py-4 whitespace-nowrap text-sm">
                    {metrics ? `${((metrics.cpu.usage / metrics.cpu.capacity) * 100).toFixed(1)}%` : 'N/A'}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">Memory Usage</td>
              {selectedClusters.map(cluster => {
                const metrics = clusterMetrics[cluster.name];
                return (
                  <td key={cluster.name} className="px-6 py-4 whitespace-nowrap text-sm">
                    {metrics ? `${((metrics.memory.usage / metrics.memory.capacity) * 100).toFixed(1)}%` : 'N/A'}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">Active Alerts</td>
              {selectedClusters.map(cluster => {
                const clusterAlerts = alerts.filter(a => a.resource?.name === cluster.name);
                return (
                  <td key={cluster.name} className="px-6 py-4 whitespace-nowrap text-sm">
                    {clusterAlerts.length}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Multi-Cluster Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setViewMode('single')}
              className={`px-4 py-2 text-sm ${
                viewMode === 'single'
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <FaServer className="inline mr-2" />
              Single
            </button>
            <button
              onClick={() => setViewMode('multi')}
              className={`px-4 py-2 text-sm ${
                viewMode === 'multi'
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <FaLayerGroup className="inline mr-2" />
              Multi
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              className={`px-4 py-2 text-sm ${
                viewMode === 'comparison'
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <FaChartBar className="inline mr-2" />
              Compare
            </button>
          </div>
          <button
            onClick={refreshAllClusters}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <FaSyncAlt className={`${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <FaCog />
          </button>
        </div>
      </div>

      {viewMode === 'comparison' ? (
        renderComparisonView()
      ) : (
        <div className={`grid gap-4 ${
          viewMode === 'multi' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
        }`}>
          {connectedClusters.map(renderClusterCard)}
        </div>
      )}

      {connectedClusters.length === 0 && (
        <div className="text-center py-12">
          <FaServer className="mx-auto text-6xl text-gray-400 mb-4" />
          <p className="text-gray-500 mb-4">No clusters connected</p>
          <button
            onClick={() => router.push('/connect')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            Connect a Cluster
          </button>
        </div>
      )}
    </div>
  );
};

export default MultiClusterDashboard;