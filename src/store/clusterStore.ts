import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { KubeConfig, CloudCredential, Alert, ClusterConfig, AlertRule } from '@/services/kubernetes';

interface ClusterState {
  // All available clusters from kubeconfig
  availableClusters: KubeConfig[];
  // Currently connected clusters
  connectedClusters: KubeConfig[];
  // Currently selected cluster
  selectedCluster: KubeConfig | null;
  // Selected clusters for multi-cluster view
  selectedClusters: KubeConfig[];
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
  // Alerts
  alerts: Alert[];
  // Alert rules
  alertRules: AlertRule[];
  // Cluster configurations
  clusterConfigs: ClusterConfig[];
  // Active configuration
  activeConfig: ClusterConfig | null;
  // Theme settings
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  // View settings
  viewMode: 'single' | 'multi' | 'comparison';
  refreshInterval: number;
  // Actions
  setAvailableClusters: (clusters: KubeConfig[]) => void;
  addConnectedCluster: (cluster: KubeConfig) => void;
  removeConnectedCluster: (clusterName: string) => void;
  setSelectedCluster: (cluster: KubeConfig | null) => void;
  toggleSelectedCluster: (cluster: KubeConfig) => void;
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
  // Alert actions
  addAlert: (alert: Alert) => void;
  removeAlert: (alertId: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  clearAlerts: () => void;
  // Alert rule actions
  addAlertRule: (rule: AlertRule) => void;
  updateAlertRule: (ruleId: string, rule: Partial<AlertRule>) => void;
  removeAlertRule: (ruleId: string) => void;
  // Config actions
  addClusterConfig: (config: ClusterConfig) => void;
  updateClusterConfig: (configId: string, config: Partial<ClusterConfig>) => void;
  removeClusterConfig: (configId: string) => void;
  setActiveConfig: (config: ClusterConfig | null) => void;
  // Theme actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setPrimaryColor: (color: string) => void;
  // View actions
  setViewMode: (mode: 'single' | 'multi' | 'comparison') => void;
  setRefreshInterval: (interval: number) => void;
}

export const useClusterStore = create<ClusterState>()(
  persist(
    (set) => ({
      availableClusters: [],
      connectedClusters: [],
      selectedCluster: null,
      selectedClusters: [],
      cloudCredentials: [],
      isLoadingClusters: false,
      isLoadingCredentials: false,
      isConnecting: false,
      clusterError: null,
      credentialError: null,
      connectionError: null,
      activeNamespaces: {},
      alerts: [],
      alertRules: [],
      clusterConfigs: [],
      activeConfig: null,
      theme: 'system',
      primaryColor: '#3B82F6',
      viewMode: 'single',
      refreshInterval: 30000,
  
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

  toggleSelectedCluster: (cluster) => set((state) => {
    const isSelected = state.selectedClusters.some(c => c.name === cluster.name);
    if (isSelected) {
      return {
        selectedClusters: state.selectedClusters.filter(c => c.name !== cluster.name),
      };
    } else {
      return {
        selectedClusters: [...state.selectedClusters, cluster],
      };
    }
  }),

  // Alert actions
  addAlert: (alert) => set((state) => ({
    alerts: [...state.alerts, alert],
  })),

  removeAlert: (alertId) => set((state) => ({
    alerts: state.alerts.filter(a => a.id !== alertId),
  })),

  acknowledgeAlert: (alertId) => set((state) => ({
    alerts: state.alerts.map(a => 
      a.id === alertId ? { ...a, acknowledged: true } : a
    ),
  })),

  clearAlerts: () => set({ alerts: [] }),

  // Alert rule actions
  addAlertRule: (rule) => set((state) => ({
    alertRules: [...state.alertRules, rule],
  })),

  updateAlertRule: (ruleId, rule) => set((state) => ({
    alertRules: state.alertRules.map(r => 
      r.id === ruleId ? { ...r, ...rule } : r
    ),
  })),

  removeAlertRule: (ruleId) => set((state) => ({
    alertRules: state.alertRules.filter(r => r.id !== ruleId),
  })),

  // Config actions
  addClusterConfig: (config) => set((state) => ({
    clusterConfigs: [...state.clusterConfigs, config],
  })),

  updateClusterConfig: (configId, config) => set((state) => ({
    clusterConfigs: state.clusterConfigs.map(c => 
      c.id === configId ? { ...c, ...config } : c
    ),
  })),

  removeClusterConfig: (configId) => set((state) => ({
    clusterConfigs: state.clusterConfigs.filter(c => c.id !== configId),
  })),

  setActiveConfig: (config) => set({ activeConfig: config }),

  // Theme actions
  setTheme: (theme) => set({ theme }),
  setPrimaryColor: (color) => set({ primaryColor: color }),

  // View actions
  setViewMode: (mode) => set({ viewMode: mode }),
  setRefreshInterval: (interval) => set({ refreshInterval: interval }),
}),
{
  name: 'lokikube-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    connectedClusters: state.connectedClusters,
    activeNamespaces: state.activeNamespaces,
    alertRules: state.alertRules,
    clusterConfigs: state.clusterConfigs,
    activeConfig: state.activeConfig,
    theme: state.theme,
    primaryColor: state.primaryColor,
    viewMode: state.viewMode,
    refreshInterval: state.refreshInterval,
  }),
}
)); 