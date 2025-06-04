import { NextApiRequest, NextApiResponse } from 'next';
import { applyYaml } from '@/services/kubernetes';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { context } = req.query;
  const { yaml } = req.body;

  if (!context || typeof context !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid context parameter' });
  }

  if (!yaml || typeof yaml !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid YAML content' });
  }

  if (req.method === 'POST') {
    try {
      const result = await applyYaml(context, yaml);
      return res.status(200).json({ success: true, result });
    } catch (error) {
      console.error(`Error applying YAML to context ${context}:`, error);
      return res.status(500).json({ 
        error: 'Failed to apply YAML',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
} 