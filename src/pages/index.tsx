import React from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ResourceDashboard from '@/components/ResourceDashboard';
import MultiClusterDashboard from '@/components/MultiClusterDashboard';
import { useClusterStore } from '@/store/clusterStore';
import { FaServer } from 'react-icons/fa';
import { NextPage } from 'next';

const HomePage: NextPage = () => {
  const router = useRouter();
  const { selectedCluster, viewMode, connectedClusters } = useClusterStore();

  // Show multi-cluster dashboard if in multi mode or if multiple clusters are connected
  if (viewMode === 'multi' || viewMode === 'comparison' || connectedClusters.length > 1) {
    return (
      <Layout>
        <MultiClusterDashboard />
      </Layout>
    );
  }

  if (!selectedCluster && connectedClusters.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <FaServer className="text-6xl text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">No Cluster Selected</h2>
          <p className="text-gray-500 mb-4">Please connect to a cluster to view resources</p>
          <button
            onClick={() => router.push('/connect')}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
          >
            Connect to Cluster
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ResourceDashboard />
    </Layout>
  );
};

export default HomePage; 