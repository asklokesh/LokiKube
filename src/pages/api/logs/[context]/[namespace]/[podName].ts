import { NextApiRequest, NextApiResponse } from 'next';
import { getPodLogs } from '@/services/kubernetes';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { context, namespace, podName, containerName } = req.query;

  if (!context || typeof context !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid context parameter' });
  }

  if (!namespace || typeof namespace !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid namespace parameter' });
  }

  if (!podName || typeof podName !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid podName parameter' });
  }

  if (req.method === 'GET') {
    try {
      const logs = await getPodLogs(
        context,
        namespace,
        podName,
        containerName && typeof containerName === 'string' ? containerName : undefined
      );
      
      return res.status(200).json({ logs });
    } catch (error) {
      console.error(`Error fetching logs for pod ${podName} in namespace ${namespace}:`, error);
      return res.status(500).json({ error: 'Failed to fetch logs' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
} 