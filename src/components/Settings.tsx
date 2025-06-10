import React, { useState } from 'react';
import { useClusterStore } from '@/store/clusterStore';
import { FaAws, FaGoogle, FaMicrosoft, FaPlus, FaTrash, FaPalette, FaBell, FaShieldAlt, FaSave } from 'react-icons/fa';
import { AlertRule, ClusterConfig } from '@/services/kubernetes';

interface CloudAuthConfig {
  provider: 'aws' | 'azure' | 'gcp';
  displayName: string;
  credentials: Record<string, any>;
  isDefault?: boolean;
  lastUsed?: Date;
  regions?: string[];
  locations?: string[];
  tags?: string[];
}

const Settings: React.FC = () => {
  const {
    theme,
    primaryColor,
    refreshInterval,
    alertRules,
    clusterConfigs,
    setTheme,
    setPrimaryColor,
    setRefreshInterval,
    addAlertRule,
    updateAlertRule,
    removeAlertRule,
    addClusterConfig,
    updateClusterConfig,
    removeClusterConfig,
  } = useClusterStore();

  const [activeTab, setActiveTab] = useState<'general' | 'auth' | 'alerts' | 'configs'>('general');
  const [authConfigs, setAuthConfigs] = useState<CloudAuthConfig[]>([]);
  const [showAddAuth, setShowAddAuth] = useState(false);
  const [newAuthConfig, setNewAuthConfig] = useState<Partial<CloudAuthConfig>>({
    provider: 'aws',
    displayName: '',
    credentials: {},
  });

  React.useEffect(() => {
    fetch('/api/auth/configs')
      .then(res => res.json())
      .then(setAuthConfigs)
      .catch(console.error);
  }, []);

  const handleAddAuthConfig = async () => {
    if (!newAuthConfig.displayName || !newAuthConfig.provider) return;

    const config: CloudAuthConfig = {
      provider: newAuthConfig.provider as 'aws' | 'azure' | 'gcp',
      displayName: newAuthConfig.displayName,
      credentials: newAuthConfig.credentials || {},
      isDefault: authConfigs.length === 0,
      lastUsed: new Date(),
    };

    try {
      await fetch('/api/auth/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      const res = await fetch('/api/auth/configs');
      const configs = await res.json();
      setAuthConfigs(configs);
      setShowAddAuth(false);
      setNewAuthConfig({ provider: 'aws', displayName: '', credentials: {} });
    } catch (error) {
      console.error('Error adding auth config:', error);
    }
  };

  const handleRemoveAuthConfig = async (displayName: string, provider: string) => {
    try {
      await fetch(`/api/auth/configs?displayName=${displayName}&provider=${provider}`, {
        method: 'DELETE',
      });
      
      const res = await fetch('/api/auth/configs');
      const configs = await res.json();
      setAuthConfigs(configs);
    } catch (error) {
      console.error('Error removing auth config:', error);
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Appearance</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Theme Mode</label>
            <div className="flex space-x-4">
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTheme(mode)}
                  className={`px-4 py-2 rounded-lg border ${
                    theme === mode
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Primary Color</label>
            <div className="flex items-center space-x-4">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-20"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Performance</h3>
        <div>
          <label className="block text-sm font-medium mb-2">
            Auto-refresh Interval (seconds)
          </label>
          <input
            type="number"
            value={refreshInterval / 1000}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value) * 1000)}
            min="10"
            max="300"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
          />
        </div>
      </div>
    </div>
  );

  const renderAuthSettings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Cloud Credentials</h3>
        <button
          onClick={() => setShowAddAuth(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center"
        >
          <FaPlus className="mr-2" />
          Add Credential
        </button>
      </div>

      {showAddAuth && (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 space-y-4">
          <h4 className="font-medium">New Credential</h4>
          
          <div>
            <label className="block text-sm font-medium mb-2">Provider</label>
            <select
              value={newAuthConfig.provider}
              onChange={(e) => setNewAuthConfig({ ...newAuthConfig, provider: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
            >
              <option value="aws">AWS</option>
              <option value="azure">Azure</option>
              <option value="gcp">Google Cloud</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Display Name</label>
            <input
              type="text"
              value={newAuthConfig.displayName}
              onChange={(e) => setNewAuthConfig({ ...newAuthConfig, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
              placeholder="e.g., Production AWS"
            />
          </div>

          {newAuthConfig.provider === 'aws' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">AWS Profile Name</label>
                <input
                  type="text"
                  value={newAuthConfig.credentials?.profile || ''}
                  onChange={(e) => setNewAuthConfig({
                    ...newAuthConfig,
                    credentials: { ...newAuthConfig.credentials, profile: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                  placeholder="default"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Default Region</label>
                <input
                  type="text"
                  value={newAuthConfig.credentials?.region || ''}
                  onChange={(e) => setNewAuthConfig({
                    ...newAuthConfig,
                    credentials: { ...newAuthConfig.credentials, region: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                  placeholder="us-east-1"
                />
              </div>
            </>
          )}

          {newAuthConfig.provider === 'azure' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Subscription ID</label>
                <input
                  type="text"
                  value={newAuthConfig.credentials?.subscriptionId || ''}
                  onChange={(e) => setNewAuthConfig({
                    ...newAuthConfig,
                    credentials: { ...newAuthConfig.credentials, subscriptionId: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tenant ID (optional)</label>
                <input
                  type="text"
                  value={newAuthConfig.credentials?.tenantId || ''}
                  onChange={(e) => setNewAuthConfig({
                    ...newAuthConfig,
                    credentials: { ...newAuthConfig.credentials, tenantId: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                />
              </div>
            </>
          )}

          {newAuthConfig.provider === 'gcp' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Project ID</label>
                <input
                  type="text"
                  value={newAuthConfig.credentials?.projectId || ''}
                  onChange={(e) => setNewAuthConfig({
                    ...newAuthConfig,
                    credentials: { ...newAuthConfig.credentials, projectId: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Service Account Key Path (optional)</label>
                <input
                  type="text"
                  value={newAuthConfig.credentials?.keyFile || ''}
                  onChange={(e) => setNewAuthConfig({
                    ...newAuthConfig,
                    credentials: { ...newAuthConfig.credentials, keyFile: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                  placeholder="/path/to/key.json"
                />
              </div>
            </>
          )}

          <div className="flex space-x-2">
            <button
              onClick={handleAddAuthConfig}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowAddAuth(false);
                setNewAuthConfig({ provider: 'aws', displayName: '', credentials: {} });
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {authConfigs.map((config) => (
          <div
            key={`${config.provider}-${config.displayName}`}
            className="flex items-center justify-between p-4 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              {config.provider === 'aws' && <FaAws className="text-2xl text-yellow-500" />}
              {config.provider === 'azure' && <FaMicrosoft className="text-2xl text-blue-400" />}
              {config.provider === 'gcp' && <FaGoogle className="text-2xl text-blue-500" />}
              <div>
                <div className="font-medium">{config.displayName}</div>
                <div className="text-sm text-gray-500">
                  {config.provider.toUpperCase()}
                  {config.isDefault && ' • Default'}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleRemoveAuthConfig(config.displayName, config.provider)}
              className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded"
            >
              <FaTrash />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAlertSettings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Alert Rules</h3>
        <button
          onClick={() => {
            const newRule: AlertRule = {
              id: Date.now().toString(),
              name: 'New Alert Rule',
              condition: {
                metric: 'cpu',
                operator: '>',
                threshold: 80,
                duration: 300,
              },
              actions: [],
              enabled: true,
            };
            addAlertRule(newRule);
          }}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center"
        >
          <FaPlus className="mr-2" />
          Add Rule
        </button>
      </div>

      <div className="space-y-2">
        {alertRules.map((rule) => (
          <div
            key={rule.id}
            className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <input
                type="text"
                value={rule.name}
                onChange={(e) => updateAlertRule(rule.id, { name: e.target.value })}
                className="font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary"
              />
              <div className="flex items-center space-x-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => updateAlertRule(rule.id, { enabled: e.target.checked })}
                    className="mr-2"
                  />
                  Enabled
                </label>
                <button
                  onClick={() => removeAlertRule(rule.id)}
                  className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                >
                  <FaTrash />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <select
                value={rule.condition.metric}
                onChange={(e) => updateAlertRule(rule.id, {
                  condition: { ...rule.condition, metric: e.target.value as any }
                })}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
              >
                <option value="cpu">CPU</option>
                <option value="memory">Memory</option>
                <option value="restarts">Restarts</option>
              </select>

              <select
                value={rule.condition.operator}
                onChange={(e) => updateAlertRule(rule.id, {
                  condition: { ...rule.condition, operator: e.target.value as any }
                })}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
              >
                <option value=">">{'>'}</option>
                <option value="<">{'<'}</option>
                <option value="=">{'='}</option>
                <option value=">=">={'>='}</option>
                <option value="<=">{'<='}</option>
              </select>

              <input
                type="number"
                value={rule.condition.threshold}
                onChange={(e) => updateAlertRule(rule.id, {
                  condition: { ...rule.condition, threshold: parseInt(e.target.value) }
                })}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
              />

              <input
                type="number"
                value={rule.condition.duration || 0}
                onChange={(e) => updateAlertRule(rule.id, {
                  condition: { ...rule.condition, duration: parseInt(e.target.value) }
                })}
                placeholder="Duration (s)"
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderConfigSettings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Cluster Configurations</h3>
        <button
          onClick={() => {
            const newConfig: ClusterConfig = {
              id: Date.now().toString(),
              name: 'New Configuration',
              clusters: [],
              settings: {
                refreshInterval: 30000,
                defaultNamespace: 'default',
              },
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            addClusterConfig(newConfig);
          }}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center"
        >
          <FaPlus className="mr-2" />
          Add Configuration
        </button>
      </div>

      <div className="space-y-2">
        {clusterConfigs.map((config) => (
          <div
            key={config.id}
            className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <input
                type="text"
                value={config.name}
                onChange={(e) => updateClusterConfig(config.id, { name: e.target.value })}
                className="font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary"
              />
              <button
                onClick={() => removeClusterConfig(config.id)}
                className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded"
              >
                <FaTrash />
              </button>
            </div>

            <div className="text-sm text-gray-500">
              {config.clusters.length} clusters • Updated {new Date(config.updatedAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="flex space-x-6">
        <div className="w-48">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                activeTab === 'general'
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <FaPalette className="mr-3" />
              General
            </button>
            <button
              onClick={() => setActiveTab('auth')}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                activeTab === 'auth'
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <FaShieldAlt className="mr-3" />
              Authentication
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                activeTab === 'alerts'
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <FaBell className="mr-3" />
              Alerts
            </button>
            <button
              onClick={() => setActiveTab('configs')}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                activeTab === 'configs'
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <FaSave className="mr-3" />
              Configurations
            </button>
          </nav>
        </div>

        <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg p-6">
          {activeTab === 'general' && renderGeneralSettings()}
          {activeTab === 'auth' && renderAuthSettings()}
          {activeTab === 'alerts' && renderAlertSettings()}
          {activeTab === 'configs' && renderConfigSettings()}
        </div>
      </div>
    </div>
  );
};

export default Settings;