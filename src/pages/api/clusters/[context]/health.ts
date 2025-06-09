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
    const appsApi = kc.makeApiClient(k8s.AppsV1Api);

    // Fetch cluster health information
    const [nodes, pods, deployments] = await Promise.all([
      k8sApi.listNode(),
      k8sApi.listPodForAllNamespaces(),
      appsApi.listDeploymentForAllNamespaces(),
    ]);

    // Calculate node health
    const readyNodes = nodes.body.items.filter(node => 
      node.status?.conditions?.some(c => c.type === 'Ready' && c.status === 'True')
    ).length;

    // Calculate pod health
    const runningPods = pods.body.items.filter(pod => 
      pod.status?.phase === 'Running'
    ).length;

    // Calculate deployment health
    const readyDeployments = deployments.body.items.filter(deployment => 
      deployment.status?.readyReplicas === deployment.status?.replicas &&
      deployment.status?.replicas === deployment.spec?.replicas
    ).length;

    // Determine overall health status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let message = 'All systems operational';

    const nodeReadyPercentage = (readyNodes / nodes.body.items.length) * 100;
    const podRunningPercentage = (runningPods / pods.body.items.length) * 100;
    const deploymentReadyPercentage = deployments.body.items.length > 0 
      ? (readyDeployments / deployments.body.items.length) * 100 
      : 100;

    if (nodeReadyPercentage < 100 || podRunningPercentage < 90 || deploymentReadyPercentage < 90) {
      status = 'warning';
      message = 'Some resources are not fully operational';
    }

    if (nodeReadyPercentage < 50 || podRunningPercentage < 50 || deploymentReadyPercentage < 50) {
      status = 'critical';
      message = 'Cluster experiencing significant issues';
    }

    const health = {
      status,
      message,
      details: {
        nodes: {
          ready: readyNodes,
          total: nodes.body.items.length,
        },
        pods: {
          running: runningPods,
          total: pods.body.items.length,
        },
        deployments: {
          ready: readyDeployments,
          total: deployments.body.items.length,
        },
      },
    };

    res.status(200).json(health);
  } catch (error) {
    console.error('Error fetching cluster health:', error);
    res.status(500).json({ 
      status: 'critical',
      message: 'Unable to connect to cluster',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}