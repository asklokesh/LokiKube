/**
 * API helper utilities for shared functionality across API routes
 */

/**
 * Gets a query parameter from the request, validating it's a string and not empty
 * @param param The parameter value from req.query
 * @returns The string value or null if invalid
 */
export const getQueryParam = (param: string | string[] | undefined): string | null => {
  if (typeof param === 'string' && param) {
    return param;
  }
  return null;
};

/**
 * Validates that all required parameters are present in the request
 * @param params Object with parameter names as keys and their values
 * @returns Array of missing parameter names, empty if all are valid
 */
export const validateRequiredParams = (
  params: Record<string, string | null>
): string[] => {
  const missing: string[] = [];
  
  for (const [name, value] of Object.entries(params)) {
    if (!value) {
      missing.push(name);
    }
  }
  
  return missing;
}; 