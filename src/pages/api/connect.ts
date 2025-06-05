import { NextApiRequest, NextApiResponse } from 'next';
import { connectToCloudCluster, getKubeConfigForContext } from '@/services/kubernetes';
import { KubeConfig as K8sKubeConfig } from '@kubernetes/client-node';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const {
        provider,
        clusterName,
        credentialName, // This is the profile name for AWS, or credential name for others
        contextName,    // For existing kubeconfig contexts
        accountId,      // For AWS if needed beyond profile, or other providers
        subscriptionId, // For Azure
        projectId,       // For GCP
        region,          // For AWS
        resourceGroup    // For Azure
      } = req.body;

      if (contextName) {
        // Connect using an existing kubeconfig context
        const kc = await getKubeConfigForContext(contextName);
        // This doesn't "connect" in the sense of fetching new credentials,
        // but rather prepares the config for use.
        // Actual connection to API server happens when k8s client is used.
        return res.status(200).json({ message: `Prepared to use context: ${contextName}`, context: kc });
      } else if (provider && clusterName && credentialName) {
        // Connect to a new cloud cluster
        await connectToCloudCluster(
          provider,
          clusterName,
          credentialName, // Profile for AWS, name for others
          accountId,
          subscriptionId,
          projectId,
          region,
          resourceGroup    // Pass resourceGroup here
        );
        // After connectToCloudCluster, the kubeconfig should be updated.
        // We might want to return the new/updated kubeconfig context name or path.
        // For now, just a success message.
        return res.status(200).json({ message: `Successfully connected to ${provider} cluster: ${clusterName}` });
      } else {
        return res.status(400).json({ error: 'Missing required parameters for connection.' });
      }
    } catch (error: unknown) {
      console.error(`Error in /api/connect:`, error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to connect to cluster' 
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 