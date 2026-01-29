import type { FastifyReply } from 'fastify';

/**
 * Validates that a parameter ID is a valid UUID string
 * Returns true if valid, false if missing, 'undefined', 'null', or invalid format
 */
export function isValidUUID(id: unknown): boolean {
  if (!id) return false;
  if (typeof id !== 'string') return false;
  if (id === 'undefined' || id === 'null') return false;

  // UUID v4 format validation (standard format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validates parameter and returns error response if invalid
 * Returns true if valid, false if invalid (and sends error response)
 */
export function validateParamId(
  id: unknown,
  paramName: string,
  reply: FastifyReply
): boolean {
  if (!id || typeof id !== 'string') {
    reply.status(400).send({
      error: 'Bad Request',
      message: `${paramName} is required and must be a string`,
    });
    return false;
  }

  if (id === 'undefined' || id === 'null') {
    reply.status(400).send({
      error: 'Bad Request',
      message: `${paramName} cannot be '${id}'`,
    });
    return false;
  }

  if (!isValidUUID(id)) {
    reply.status(400).send({
      error: 'Bad Request',
      message: `${paramName} must be a valid UUID`,
    });
    return false;
  }

  return true;
}

/**
 * Validates multiple required parameters
 */
export function validateParamIds(
  params: Record<string, unknown>,
  requiredParams: string[],
  reply: FastifyReply
): boolean {
  for (const paramName of requiredParams) {
    if (!validateParamId(params[paramName], paramName, reply)) {
      return false;
    }
  }
  return true;
}
