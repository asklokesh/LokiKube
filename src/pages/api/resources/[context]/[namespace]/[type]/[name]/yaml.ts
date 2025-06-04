import { NextApiRequest, NextApiResponse } from 'next';
import { getResourceYaml } from '@/services/kubernetes';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { context, namespace, type, name } = req.query;

  if (!context || typeof context !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid context parameter' });
  }

  if (!namespace || typeof namespace !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid namespace parameter' });
  }

  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid type parameter' });
  }

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid name parameter' });
  }

  if (req.method === 'GET') {
    try {
      // Convert type to singular form (e.g., "pods" -> "pod")
      const kind = type.endsWith('s') ? type.slice(0, -1) : type;
      
      const yaml = await getResourceYaml(context, kind, name, namespace);
      return res.status(200).json({ yaml });
    } catch (error) {
      console.error(`Error fetching YAML for ${type} ${name} in namespace ${namespace}:`, error);
      return res.status(500).json({ error: 'Failed to fetch resource YAML' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
} 