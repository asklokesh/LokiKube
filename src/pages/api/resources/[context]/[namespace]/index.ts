import { NextApiRequest, NextApiResponse } from 'next';
import { listPods, listDeployments } from '@/services/kubernetes';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { context, namespace, resourceType } = req.query;

  if (!context || typeof context !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid context parameter' });
  }

  if (!namespace || typeof namespace !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid namespace parameter' });
  }

  if (req.method === 'GET') {
    try {
      let resources;
      
      switch (resourceType) {
        case 'pods':
          resources = await listPods(context, namespace);
          break;
        case 'deployments':
          resources = await listDeployments(context, namespace);
          break;
        case 'all':
        default:
          const [pods, deployments] = await Promise.all([
            listPods(context, namespace),
            listDeployments(context, namespace),
          ]);
          resources = {
            pods,
            deployments,
          };
      }
      
      return res.status(200).json(resources);
    } catch (error) {
      console.error(`Error fetching resources for context ${context} in namespace ${namespace}:`, error);
      return res.status(500).json({ error: 'Failed to fetch resources' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
} 