import type { NextApiRequest, NextApiResponse } from 'next';
import { getKubeConfig } from '@/services/kubernetes';
import * as k8s from '@kubernetes/client-node';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { context } = req.query;

  if (!context || typeof context !== 'string') {
    return res.status(400).json({ error: 'Context is required' });
  }

  try {
    const kc = getKubeConfig();
    kc.setCurrentContext(context);

    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    // Get nodes for capacity information
    const nodes = await k8sApi.listNode();
    
    // Calculate total capacity and usage
    let totalCpuCapacity = 0;
    let totalMemoryCapacity = 0;
    let totalCpuUsage = 0;
    let totalMemoryUsage = 0;
    let totalPodsCapacity = 0;
    let runningPods = 0;

    // Get pods for counting
    const pods = await k8sApi.listPodForAllNamespaces();
    runningPods = pods.body.items.filter(pod => pod.status?.phase === 'Running').length;

    // Process node information
    for (const node of nodes.body.items) {
      const cpuCapacity = node.status?.capacity?.cpu;
      const memoryCapacity = node.status?.capacity?.memory;
      const podsCapacity = node.status?.capacity?.pods;

      if (cpuCapacity) {
        totalCpuCapacity += parseCPU(cpuCapacity);
      }
      if (memoryCapacity) {
        totalMemoryCapacity += parseMemory(memoryCapacity);
      }
      if (podsCapacity) {
        totalPodsCapacity += parseInt(podsCapacity);
      }
    }

    // Estimate usage at 40% for demo purposes
    // In production, you would use metrics-server API
    totalCpuUsage = totalCpuCapacity * 0.4;
    totalMemoryUsage = totalMemoryCapacity * 0.4;

    const metrics = {
      cpu: {
        usage: totalCpuUsage,
        capacity: totalCpuCapacity,
      },
      memory: {
        usage: totalMemoryUsage,
        capacity: totalMemoryCapacity,
      },
      pods: {
        running: runningPods,
        capacity: totalPodsCapacity,
      },
    };

    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error fetching cluster metrics:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

// Helper function to parse CPU values (convert to millicores)
function parseCPU(cpu: string): number {
  if (cpu.endsWith('m')) {
    return parseInt(cpu.slice(0, -1));
  } else if (cpu.endsWith('n')) {
    return parseInt(cpu.slice(0, -1)) / 1000000;
  } else {
    return parseFloat(cpu) * 1000;
  }
}

// Helper function to parse memory values (convert to bytes)
function parseMemory(memory: string): number {
  const units: Record<string, number> = {
    'Ki': 1024,
    'Mi': 1024 * 1024,
    'Gi': 1024 * 1024 * 1024,
    'Ti': 1024 * 1024 * 1024 * 1024,
    'K': 1000,
    'M': 1000 * 1000,
    'G': 1000 * 1000 * 1000,
    'T': 1000 * 1000 * 1000 * 1000,
  };

  for (const [unit, multiplier] of Object.entries(units)) {
    if (memory.endsWith(unit)) {
      return parseFloat(memory.slice(0, -unit.length)) * multiplier;
    }
  }

  return parseFloat(memory);
}