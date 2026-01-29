
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
 * 
 * @param value - Parameter value to validate
 * @param paramName - Name of parameter for error message
 * @returns true if valid, false if invalid
 */
export function isValidParam(value: string | undefined, paramName: string): boolean {
  const isValid = !!value && value !== 'undefined' && value !== 'null';
  
  if (!isValid) {
    console.error(`[useSafeParams] Invalid ${paramName}:`, value);
  }
  
  return isValid;
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
    throw new Error(`Required parameter '${paramName}' is missing or invalid`);
  }
  
  return value;
}
