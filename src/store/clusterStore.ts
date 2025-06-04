import { create } from 'zustand';
import type { KubeConfig, CloudCredential } from '@/services/kubernetes';

interface ClusterState {
  // All available clusters from kubeconfig
  availableClusters: KubeConfig[];
  // Currently connected clusters
  connectedClusters: KubeConfig[];
  // Currently selected cluster
  selectedCluster: KubeConfig | null;
  // Available cloud credentials
  cloudCredentials: CloudCredential[];
  // Loading states
  isLoadingClusters: boolean;
  isLoadingCredentials: boolean;
  isConnecting: boolean;
  // Error states
  clusterError: string | null;
  credentialError: string | null;
  connectionError: string | null;
  // Active namespaces for each cluster
  activeNamespaces: Record<string, string[]>;
  // Actions
  setAvailableClusters: (clusters: KubeConfig[]) => void;
  addConnectedCluster: (cluster: KubeConfig) => void;
  removeConnectedCluster: (clusterName: string) => void;
  setSelectedCluster: (cluster: KubeConfig | null) => void;
  setCloudCredentials: (credentials: CloudCredential[]) => void;
  setIsLoadingClusters: (isLoading: boolean) => void;
  setIsLoadingCredentials: (isLoading: boolean) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  setClusterError: (error: string | null) => void;
  setCredentialError: (error: string | null) => void;
  setConnectionError: (error: string | null) => void;
  setActiveNamespaces: (clusterName: string, namespaces: string[]) => void;
  addActiveNamespace: (clusterName: string, namespace: string) => void;
  removeActiveNamespace: (clusterName: string, namespace: string) => void;
}

export const useClusterStore = create<ClusterState>((set) => ({
  availableClusters: [],
  connectedClusters: [],
  selectedCluster: null,
  cloudCredentials: [],
  isLoadingClusters: false,
  isLoadingCredentials: false,
  isConnecting: false,
  clusterError: null,
  credentialError: null,
  connectionError: null,
  activeNamespaces: {},
  
  setAvailableClusters: (clusters) => set({ availableClusters: clusters }),
  
  addConnectedCluster: (cluster) => set((state) => {
    // Check if already connected to avoid duplicate objects if logic allows re-adding
    const alreadyConnected = state.connectedClusters.some(c => c.name === cluster.name);
    let newConnectedClusters = state.connectedClusters;

    if (!alreadyConnected) {
      newConnectedClusters = [...state.connectedClusters, cluster];
    }
    
    return {
      connectedClusters: newConnectedClusters,
      selectedCluster: cluster, // Always set the newly added/clicked cluster as selected
    };
  }),
  
  removeConnectedCluster: (clusterName) => set((state) => {
    const newConnectedClusters = state.connectedClusters.filter(c => c.name !== clusterName);
    // If removing the selected cluster, select another one if available
    let newSelectedCluster = state.selectedCluster;
    if (state.selectedCluster?.name === clusterName) {
      newSelectedCluster = newConnectedClusters.length > 0 ? newConnectedClusters[0] : null;
    }
    
    return {
      connectedClusters: newConnectedClusters,
      selectedCluster: newSelectedCluster,
    };
  }),
  
  setSelectedCluster: (cluster) => set({ selectedCluster: cluster }),
  
  setCloudCredentials: (credentials) => set({ cloudCredentials: credentials }),
  
  setIsLoadingClusters: (isLoading) => set({ isLoadingClusters: isLoading }),
  
  setIsLoadingCredentials: (isLoading) => set({ isLoadingCredentials: isLoading }),
  
  setIsConnecting: (isConnecting) => set({ isConnecting: isConnecting }),
  
  setClusterError: (error) => set({ clusterError: error }),
  
  setCredentialError: (error) => set({ credentialError: error }),
  
  setConnectionError: (error) => set({ connectionError: error }),
  
  setActiveNamespaces: (clusterName, namespaces) => set((state) => ({
    activeNamespaces: {
      ...state.activeNamespaces,
      [clusterName]: namespaces,
    },
  })),
  
  addActiveNamespace: (clusterName, namespace) => set((state) => {
    const currentNamespaces = state.activeNamespaces[clusterName] || [];
    if (currentNamespaces.includes(namespace)) {
      return state;
    }
    
    return {
      activeNamespaces: {
        ...state.activeNamespaces,
        [clusterName]: [...currentNamespaces, namespace],
      },
    };
  }),
  
  removeActiveNamespace: (clusterName, namespace) => set((state) => {
    const currentNamespaces = state.activeNamespaces[clusterName] || [];
    return {
      activeNamespaces: {
        ...state.activeNamespaces,
        [clusterName]: currentNamespaces.filter(ns => ns !== namespace),
      },
    };
  }),
})); 