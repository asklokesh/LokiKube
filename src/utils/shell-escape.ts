/**
 * Utility to escape shell arguments to prevent command injection
 */

/**
 * Escapes a string for safe use in shell commands
 * @param arg The argument to escape
 * @returns The escaped string
 */
export const escapeShellArg = (arg: string): string => {
  // If the argument is empty, return empty quotes
  if (!arg) return "''";
  
  // If the argument contains only alphanumeric characters, hyphens, underscores, dots, and slashes, it's safe
  if (/^[a-zA-Z0-9_\-./]+$/.test(arg)) {
    return arg;
  }
  
  // Otherwise, wrap in single quotes and escape any single quotes within
  return "'" + arg.replace(/'/g, "'\"'\"'") + "'";
};

/**
 * Validates that a string contains only safe characters for specific use cases
 * @param value The value to validate
 * @param pattern The allowed pattern (regex)
 * @param fieldName The name of the field being validated (for error messages)
 * @returns The validated string
 * @throws Error if validation fails
 */
export const validateSafeString = (
  value: string, 
  pattern: RegExp, 
  fieldName: string
): string => {
  if (!pattern.test(value)) {
    throw new Error(`Invalid ${fieldName}: contains unsafe characters`);
  }
  return value;
};

// Common validation patterns
export const PATTERNS = {
  // AWS profile names: alphanumeric, hyphens, underscores
  AWS_PROFILE: /^[a-zA-Z0-9_\-]+$/,
  
  // AWS regions: lowercase letters, numbers, hyphens
  AWS_REGION: /^[a-z0-9\-]+$/,
  
  // Cluster names: alphanumeric, hyphens, underscores, dots
  CLUSTER_NAME: /^[a-zA-Z0-9_\-\.]+$/,
  
  // GCP project IDs: lowercase letters, numbers, hyphens
  GCP_PROJECT: /^[a-z0-9\-]+$/,
  
  // Azure subscription IDs: UUIDs
  AZURE_SUBSCRIPTION: /^[a-f0-9\-]+$/,
  
  // Azure resource groups: alphanumeric, hyphens, underscores, parentheses, dots
  AZURE_RESOURCE_GROUP: /^[a-zA-Z0-9_\-\(\)\.]+$/,
  
  // Azure locations: lowercase letters, numbers
  AZURE_LOCATION: /^[a-z0-9]+$/,
  
  // Kubernetes namespaces: lowercase letters, numbers, hyphens
  K8S_NAMESPACE: /^[a-z0-9\-]+$/,
  
  // Kubernetes resource names: lowercase letters, numbers, hyphens, dots
  K8S_RESOURCE_NAME: /^[a-z0-9\-\.]+$/,
  
  // Kubernetes resource types: lowercase letters
  K8S_RESOURCE_TYPE: /^[a-z]+$/
};