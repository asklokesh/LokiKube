import React, { useEffect, useState, useRef } from 'react';
import { FaSpinner, FaDownload, FaTrash, FaPlay, FaPause } from 'react-icons/fa';

interface LogViewerProps {
  context: string;
  namespace: string;
  podName: string;
  containerName?: string;
}

const LogViewer: React.FC<LogViewerProps> = ({ context, namespace, podName, containerName }) => {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  const fetchLogs = async () => {
    try {
      let url = `/api/logs/${context}/${namespace}/${podName}`;
      if (containerName) {
        url += `?container=${containerName}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      
      const logs = await response.text();
      setLogs(logs);
      setError(null);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError('Failed to fetch logs. The pod might not be running or the container is not ready.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchLogs();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [context, namespace, podName, containerName]);
  
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 3000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh]);
  
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };
  
  const clearLogs = () => {
    setLogs('');
  };
  
  const downloadLogs = () => {
    const element = document.createElement('a');
    const file = new Blob([logs], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${podName}${containerName ? `-${containerName}` : ''}-logs.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const filteredLogs = filter 
    ? logs.split('\n').filter(line => line.toLowerCase().includes(filter.toLowerCase())).join('\n')
    : logs;
  
  return (
    <div className="bg-white dark:bg-secondary shadow rounded-lg p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">
          Logs: {podName}
          {containerName && <span className="text-gray-500 ml-2">({containerName})</span>}
        </h2>
        
        <div className="flex space-x-2">
          <button
            onClick={toggleAutoRefresh}
            className={`p-2 rounded ${
              autoRefresh ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
            title={autoRefresh ? 'Pause auto-refresh' : 'Start auto-refresh'}
          >
            {autoRefresh ? <FaPause /> : <FaPlay />}
          </button>
          
          <button
            onClick={clearLogs}
            className="p-2 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
            title="Clear logs"
          >
            <FaTrash />
          </button>
          
          <button
            onClick={downloadLogs}
            className="p-2 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
            title="Download logs"
          >
            <FaDownload />
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter logs..."
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-secondary-dark"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      
      <div
        ref={logContainerRef}
        className="flex-1 overflow-auto bg-gray-100 dark:bg-secondary-dark p-4 rounded font-mono text-sm"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <FaSpinner className="animate-spin text-primary mr-2" />
            <span>Loading logs...</span>
          </div>
        ) : error ? (
          <div className="text-error p-4 bg-red-100 dark:bg-red-900 bg-opacity-50 rounded">
            {error}
          </div>
        ) : filteredLogs ? (
          <pre className="whitespace-pre-wrap break-all">
            {filteredLogs}
          </pre>
        ) : (
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">
            No logs available.
          </div>
        )}
      </div>
    </div>
  );
};

export default LogViewer; 