import { NextApiRequest, NextApiResponse } from 'next';
import { getPodLogs } from '@/services/kubernetes';
import { getQueryParam, validateRequiredParams } from '@/utils/api-helpers';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { context: rawContext, namespace: rawNamespace, podName: rawPodName, container: rawContainer } = req.query;

    const context = getQueryParam(rawContext);
    const namespace = getQueryParam(rawNamespace);
    const podName = getQueryParam(rawPodName);
    const container = getQueryParam(rawContainer); // Optional, so null is fine if not provided

    const missingParams = validateRequiredParams({
      context,
      namespace,
      podName
    });

    if (missingParams.length > 0) {
      return res.status(400).json({ 
        error: `Missing or invalid query parameters: ${missingParams.join(', ')}. All must be non-empty strings.` 
      });
    }

    try {
      const logs = await getPodLogs(context!, namespace!, podName!, container || undefined); // Use non-null assertion since we've validated
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(logs);
    } catch (error: unknown) {
      console.error(`Error fetching logs for pod ${podName} in ${namespace} for context ${context}:`, error);
      return res.status(500).json({ 
        error: (error as Error).message || 'Failed to fetch logs' 
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 