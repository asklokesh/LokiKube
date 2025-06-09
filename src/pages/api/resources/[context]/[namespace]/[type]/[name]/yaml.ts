import { NextApiRequest, NextApiResponse } from 'next';
import { getResourceYaml } from '@/services/kubernetes';
import { getQueryParam } from '@/utils/api-helpers';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { context: rawContext, namespace: rawNamespace, type: rawType, name: rawName } = req.query;

    const context = getQueryParam(rawContext);
    const namespace = getQueryParam(rawNamespace);
    const type = getQueryParam(rawType);
    const name = getQueryParam(rawName);

    if (!context || !namespace || !type || !name) {
      const missing: string[] = [];
      if (!context) missing.push('context');
      if (!namespace) missing.push('namespace');
      if (!type) missing.push('type');
      if (!name) missing.push('name');
      return res.status(400).json({ error: `Missing or invalid query parameters: ${missing.join(', ')}. All must be non-empty strings.` });
    }

    try {
      const yamlContent = await getResourceYaml(context, type, name, namespace);
      res.setHeader('Content-Type', 'application/yaml');
      return res.status(200).send(yamlContent);
    } catch (error: unknown) {
      console.error(`Error getting YAML for ${type}/${name} in ${namespace} for context ${context}:`, error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get resource YAML' 
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 