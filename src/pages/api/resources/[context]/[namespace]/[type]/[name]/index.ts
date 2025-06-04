import { NextApiRequest, NextApiResponse } from 'next';
import { getK8sClient, deleteResource } from '@/services/kubernetes';

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

  // Convert type to singular form (e.g., "pods" -> "pod")
  const kind = type.endsWith('s') ? type.slice(0, -1) : type;

  if (req.method === 'GET') {
    try {
      const client = getK8sClient(context);
      let resource;
      
      switch (kind) {
        case 'pod':
          resource = await client.core.readNamespacedPod(name, namespace);
          break;
        case 'deployment':
          resource = await client.apps.readNamespacedDeployment(name, namespace);
          break;
        case 'service':
          resource = await client.core.readNamespacedService(name, namespace);
          break;
        case 'configmap':
          resource = await client.core.readNamespacedConfigMap(name, namespace);
          break;
        case 'secret':
          resource = await client.core.readNamespacedSecret(name, namespace);
          break;
        default:
          return res.status(400).json({ error: `Unsupported resource type: ${type}` });
      }
      
      return res.status(200).json(resource.body);
    } catch (error) {
      console.error(`Error fetching ${type} ${name} in namespace ${namespace}:`, error);
      return res.status(500).json({ error: `Failed to fetch ${type}` });
    }
  } else if (req.method === 'DELETE') {
    try {
      await deleteResource(context, kind, name, namespace);
      return res.status(200).json({ success: true, message: `${kind} "${name}" deleted successfully` });
    } catch (error) {
      console.error(`Error deleting ${type} ${name} in namespace ${namespace}:`, error);
      return res.status(500).json({ error: `Failed to delete ${type}` });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
} 