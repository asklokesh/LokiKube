import { NextApiRequest, NextApiResponse } from 'next';
import { listClustersForCredential } from '@/services/kubernetes';
import type { CloudCredential } from '@/services/kubernetes';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const { credential, regions, locations } = req.body as { 
      credential: CloudCredential, 
      regions?: string[], 
      locations?: string[] 
    };
    
    if (!credential) {
      return res.status(400).json({ error: 'Credential is required' });
    }

    try {
      const clusters: Array<string | { name: string; resourceGroup: string; location: string }> = 
        await listClustersForCredential(credential, regions, locations);
      
      // The frontend expects an array of objects for Azure, or an array of strings for AWS/GCP.
      // The listClustersForCredential function already returns this mixed type based on provider.
      return res.status(200).json({ clusters });
    } catch (error: any) {
      console.error(`Error in /api/cloud-clusters for ${credential.name}:`, error);
      return res.status(500).json({ error: error.message || 'Failed to list cloud clusters' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 