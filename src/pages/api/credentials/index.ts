import { NextApiRequest, NextApiResponse } from 'next';
import { loadCloudCredentials } from '@/services/kubernetes';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const credentials = await loadCloudCredentials();
      return res.status(200).json(credentials);
    } catch (error) {
      console.error('Error loading cloud credentials:', error);
      return res.status(500).json({ error: 'Failed to load cloud credentials' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
} 