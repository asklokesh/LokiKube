import { NextApiRequest, NextApiResponse } from 'next';
import { getResourceYaml, deleteResource } from '@/services/kubernetes';

// Helper to validate and extract single string query parameters
const getQueryParam = (param: string | string[] | undefined, paramName: string): string | null => {
  if (typeof param === 'string' && param) {
    return param;
  }
  // console.warn(`Query parameter '${paramName}' is missing or not a string.`);
  return null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { context: rawContext, namespace: rawNamespace, type: rawType, name: rawName } = req.query;

  const context = getQueryParam(rawContext, 'context');
  const namespace = getQueryParam(rawNamespace, 'namespace');
  const type = getQueryParam(rawType, 'type');
  const name = getQueryParam(rawName, 'name');

  if (!context || !namespace || !type || !name) {
    let missing = [];
    if (!context) missing.push('context');
    if (!namespace) missing.push('namespace');
    if (!type) missing.push('type');
    if (!name) missing.push('name');
    return res.status(400).json({ error: `Missing or invalid query parameters: ${missing.join(', ')}. All must be non-empty strings.` });
  }

  if (req.method === 'GET') {
    try {
      // NOTE: getResourceYaml is used here. If a non-YAML version (e.g., just JSON object) is needed,
      // a new service function like `getSpecificResource` would be required.
      // For now, assuming this API endpoint is intended to serve the YAML representation for GET.
      const resource = await getResourceYaml(context, type, name, namespace);
      // getResourceYaml returns a string (YAML). If the client expects JSON, this needs adjustment.
      // To return as YAML text:
      res.setHeader('Content-Type', 'application/yaml');
      return res.status(200).send(resource);
    } catch (error: any) {
      console.error(`Error getting resource ${type}/${name} in ${namespace} for context ${context}:`, error);
      return res.status(500).json({ error: error.message || 'Failed to get resource' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await deleteResource(context, type, name, namespace);
      return res.status(204).end(); // Successfully deleted, no content to return
    } catch (error: any) {
      console.error(`Error deleting resource ${type}/${name} in ${namespace} for context ${context}:`, error);
      return res.status(500).json({ error: error.message || 'Failed to delete resource' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 