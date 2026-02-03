
import { useLocalSearchParams } from 'expo-router';

/**
 * Safe parameter hook that validates route params before use
 * Prevents calling APIs with undefined/null values
 * 
 * @returns Validated params or throws error if required params are missing
 */
export function useSafeParams<T extends Record<string, string | undefined>>(): T {
  const params = useLocalSearchParams<T>();
  
  // Log params for debugging
  console.log('[useSafeParams] Route params:', params);
  
  return params;
}

/**
 * Validate that a required parameter exists and is not 'undefined' string
 * Also validates UUID format if the parameter name suggests it's an ID
 * 
 * @param value - Parameter value to validate
 * @param paramName - Name of parameter for error message
 * @returns true if valid, false if invalid
 */
export function isValidParam(value: string | undefined, paramName: string): boolean {
  // Check if value exists and is not 'undefined' or 'null' string
  if (!value || value === 'undefined' || value === 'null' || value.trim() === '') {
    console.error(`[useSafeParams] Invalid ${paramName}: value is empty or undefined`);
    return false;
  }
  
  // If it's an ID parameter, validate UUID format
  if (paramName.toLowerCase().includes('id')) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      console.error(`[useSafeParams] Invalid ${paramName}: not a valid UUID format`);
      return false;
    }
  }
  
  return true;
}

/**
 * Get a required parameter or throw error
 * 
 * @param params - Route params object
 * @param paramName - Name of required parameter
 * @returns Parameter value
 * @throws Error if parameter is missing or invalid
 */
export function getRequiredParam(params: Record<string, any>, paramName: string): string {
  const value = params[paramName];
  
  if (!isValidParam(value, paramName)) {
    const errorMessage = `Required parameter '${paramName}' is missing or invalid. Please go back and select a valid ${paramName.replace('Id', '')}.`;
    throw new Error(errorMessage);
  }
  
  return value;
}

/**
 * Validate multiple required parameters at once
 * 
 * @param params - Route params object
 * @param paramNames - Array of required parameter names
 * @returns Object with validated parameters
 * @throws Error if any parameter is missing or invalid
 */
export function validateRequiredParams(
  params: Record<string, any>,
  paramNames: string[]
): Record<string, string> {
  const validated: Record<string, string> = {};
  const missing: string[] = [];
  
  for (const paramName of paramNames) {
    if (isValidParam(params[paramName], paramName)) {
      validated[paramName] = params[paramName];
    } else {
      missing.push(paramName);
    }
  }
  
  if (missing.length > 0) {
    const errorMessage = `Missing or invalid parameters: ${missing.join(', ')}. Please go back and try again.`;
    throw new Error(errorMessage);
  }
  
  return validated;
}
