import { NextApiRequest, NextApiResponse } from 'next';
import { applyYaml } from '@/services/kubernetes';

// Helper function (can be moved to a shared utils file if used in multiple API routes)
const getQueryParam = (param: string | string[] | undefined, paramName: string): string | null => {
  if (typeof param === 'string' && param) {
    return param;
  }
  return null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const { context: rawContext } = req.query;
    const { yamlContent } = req.body;

    const context = getQueryParam(rawContext, 'context');

    if (!context) {
      return res.status(400).json({ error: 'Context parameter is required and must be a non-empty string.' });
    }

    if (!yamlContent || typeof yamlContent !== 'string') {
      return res.status(400).json({ error: 'yamlContent is required in the request body and must be a string.' });
    }

    try {
      const results = await applyYaml(context, yamlContent);
      return res.status(200).json(results);
    } catch (error: any) {
      console.error(`Error applying YAML for context ${context}:`, error);
      // Check if error has a response and statusCode for more specific error reporting if needed
      if (error.response && error.response.body) {
        // The k8s client often puts detailed errors in error.response.body
        return res.status(error.response.statusCode || 500).json({ 
          error: error.message, 
          details: error.response.body.message || error.response.body
        });
      }
      return res.status(500).json({ error: error.message || 'Failed to apply YAML' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 