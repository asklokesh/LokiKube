import type { NextApiRequest, NextApiResponse } from 'next';
import { loadAuthConfigs, saveAuthConfigs, CloudAuthConfig } from '@/services/kubernetes/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET': {
        const configs = await loadAuthConfigs();
        res.status(200).json(configs);
        break;
      }
      
      case 'POST': {
        const config: CloudAuthConfig = req.body;
        const configs = await loadAuthConfigs();
        
        // Check if config with same name exists
        const existingIndex = configs.findIndex(
          c => c.displayName === config.displayName && c.provider === config.provider
        );
        
        if (existingIndex >= 0) {
          configs[existingIndex] = { ...configs[existingIndex], ...config };
        } else {
          configs.push(config);
        }
        
        await saveAuthConfigs(configs);
        res.status(200).json({ success: true });
        break;
      }
      
      case 'DELETE': {
        const { displayName, provider } = req.query;
        const configs = await loadAuthConfigs();
        const filtered = configs.filter(
          c => !(c.displayName === displayName && c.provider === provider)
        );
        await saveAuthConfigs(filtered);
        res.status(200).json({ success: true });
        break;
      }
      
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in auth configs API:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}