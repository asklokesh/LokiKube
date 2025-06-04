import { NextApiRequest, NextApiResponse } from 'next';
import { listNamespaces } from '@/services/kubernetes';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { context } = req.query;

    if (typeof context !== 'string' || !context) {
      return res.status(400).json({ error: 'Context parameter is required and must be a string.' });
    }

    try {
      const namespaces = await listNamespaces(context);
      return res.status(200).json(namespaces);
    } catch (error: any) {
      console.error(`Error listing namespaces for context ${context}:`, error);
      return res.status(500).json({ error: error.message || 'Failed to list namespaces' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 