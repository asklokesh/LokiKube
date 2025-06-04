import { NextApiRequest, NextApiResponse } from 'next';
import { getPodLogs } from '@/services/kubernetes';

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
  if (req.method === 'GET') {
    const { context: rawContext, namespace: rawNamespace, podName: rawPodName, container: rawContainer } = req.query;

    const context = getQueryParam(rawContext, 'context');
    const namespace = getQueryParam(rawNamespace, 'namespace');
    const podName = getQueryParam(rawPodName, 'podName');
    const container = getQueryParam(rawContainer, 'container'); // Optional, so null is fine if not provided

    if (!context || !namespace || !podName) {
      let missing = [];
      if (!context) missing.push('context');
      if (!namespace) missing.push('namespace');
      if (!podName) missing.push('podName');
      return res.status(400).json({ error: `Missing or invalid query parameters: ${missing.join(', ')}. All must be non-empty strings.` });
    }

    try {
      const logs = await getPodLogs(context, namespace, podName, container || undefined ); // Pass undefined if container is null
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(logs);
    } catch (error: any) {
      console.error(`Error fetching logs for pod ${podName} in ${namespace} for context ${context}:`, error);
      return res.status(500).json({ error: error.message || 'Failed to fetch logs' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 