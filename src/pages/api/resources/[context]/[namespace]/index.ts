import { NextApiRequest, NextApiResponse } from 'next';
import { listPods, listDeployments, listServices, listConfigMaps, listSecrets } from '@/services/kubernetes';

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
    const { context: rawContext, namespace: rawNamespace, type: rawType } = req.query;

    const context = getQueryParam(rawContext, 'context');
    const namespace = getQueryParam(rawNamespace, 'namespace');
    const type = getQueryParam(rawType, 'type'); // Optional, so null is fine if not provided

    if (!context || !namespace) {
      const missing: string[] = [];
      if (!context) missing.push('context');
      if (!namespace) missing.push('namespace');
      return res.status(400).json({ error: `Missing or invalid query parameters: ${missing.join(', ')}. Context and namespace must be non-empty strings.` });
    }

    try {
      let resources: unknown[] = [];
      if (type) {
        // If a specific type is requested, fetch only that type
        // (Assuming service functions like listPods, listDeployments handle singular type names)
        const singularType = type.endsWith('s') ? type.slice(0, -1) : type;
        switch (singularType.toLowerCase()) {
          case 'pod':
            resources = await listPods(context, namespace);
            break;
          case 'deployment':
            resources = await listDeployments(context, namespace);
            break;
          case 'service':
            resources = await listServices(context, namespace);
            break;
          case 'configmap':
            resources = await listConfigMaps(context, namespace);
            break;
          case 'secret':
            resources = await listSecrets(context, namespace);
            break;
          default:
            return res.status(400).json({ error: `Unsupported or unknown resource type: ${type}` });
        }
      } else {
        // If no type is specified, fetch a default set of resources (e.g., pods and deployments)
        const pods = await listPods(context, namespace);
        const deployments = await listDeployments(context, namespace);
        const services = await listServices(context, namespace); // Also fetch services by default
        resources = [...pods, ...deployments, ...services];
      }
      return res.status(200).json(resources);
    } catch (error: unknown) {
      console.error(`Error listing resources in ${namespace} for context ${context} (type: ${type || 'all'}):`, error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to list resources' 
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 