import { NextApiRequest, NextApiResponse } from 'next';
import { applyYaml } from '@/services/kubernetes';

// Helper function (can be moved to a shared utils file if used in multiple API routes)
const getQueryParam = (param: string | string[] | undefined, paramName: string): string | null => {
  if (typeof param === 'string' && param) {
    return param;
  }
  return null;
};

// Define interface for Kubernetes API error
interface K8sApiError {
  response?: {
    statusCode?: number;
    body?: {
      message?: string;
      [key: string]: any;
    } | string;
    [key: string]: any;
  };
  message?: string;
  [key: string]: any;
}

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
    } catch (error: unknown) {
      console.error(`Error applying YAML for context ${context}:`, error);
      
      // Check if error is a Kubernetes API error with response details
      const k8sError = error as K8sApiError;
      
      if (k8sError.response && k8sError.response.body) {
        // The k8s client often puts detailed errors in error.response.body
        const statusCode = k8sError.response.statusCode || 500;
        const errorMessage = k8sError instanceof Error ? k8sError.message : 'Unknown error';
        const details = typeof k8sError.response.body === 'object' && k8sError.response.body.message 
          ? k8sError.response.body.message 
          : k8sError.response.body;
          
        return res.status(statusCode).json({ 
          error: errorMessage, 
          details: details
        });
      }
      
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to apply YAML' 
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 