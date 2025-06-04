import { NextApiRequest, NextApiResponse } from 'next';
import { listNamespaces } from '@/services/kubernetes';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { context } = req.query;

  if (!context || typeof context !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid context parameter' });
  }

  if (req.method === 'GET') {
    try {
      const namespaces = await listNamespaces(context);
      return res.status(200).json(namespaces);
    } catch (error) {
      console.error(`Error fetching namespaces for context ${context}:`, error);
      return res.status(500).json({ error: 'Failed to fetch namespaces' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
} 