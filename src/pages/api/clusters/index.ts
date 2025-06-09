import { NextApiRequest, NextApiResponse } from 'next';
import { loadKubeConfigs } from '@/services/kubernetes';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const configs = await loadKubeConfigs();
      return res.status(200).json(configs);
    } catch (error) {
      console.error('Error loading Kubernetes configs:', error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to load Kubernetes configs' 
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
} 