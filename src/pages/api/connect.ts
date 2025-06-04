import { NextApiRequest, NextApiResponse } from 'next';
import { connectToCloudCluster } from '@/services/kubernetes';
import type { CloudCredential } from '@/services/kubernetes';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { credential, clusterName } = req.body;
      
      if (!credential || !clusterName) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      const success = await connectToCloudCluster(credential as CloudCredential, clusterName);
      
      if (success) {
        return res.status(200).json({ success: true, message: 'Connected to cluster successfully' });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to connect to cluster' });
      }
    } catch (error) {
      console.error('Error connecting to cluster:', error);
      return res.status(500).json({ error: 'Failed to connect to cluster' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
} 