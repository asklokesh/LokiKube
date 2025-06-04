import { NextApiRequest, NextApiResponse } from 'next';
import { listClustersForCredential } from '@/services/kubernetes';
import type { CloudCredential } from '@/services/kubernetes';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const credential = req.body.credential as CloudCredential;

      if (!credential || !credential.provider || !credential.name) {
        return res.status(400).json({ error: 'Invalid credential provided.' });
      }

      const clusters = await listClustersForCredential(credential);
      return res.status(200).json({ clusters });
    } catch (error: any) {
      console.error('Error in /api/cloud-clusters:', error);
      return res.status(500).json({ error: error.message || 'Failed to list cloud clusters.' });
    }
  }

  res.setHeader('Allow', ['POST']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
} 