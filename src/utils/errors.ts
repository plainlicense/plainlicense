/**
 * Custom error class for CMS and license-specific operations.
 */
export class LicenseError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "LicenseError";
  }
}

/**
 * Validates content-specific requirements.
 */
export function validateContent(
  content: string,
  minLength: number = 100,
): boolean {
  if (!content || content.length < minLength) {
    throw new LicenseError(
      `Content too short: minimum ${minLength} characters required.`,
      "ERR_CONTENT_TOO_SHORT",
    );
  }
  return true;
}

/**
 * Handle async operations with standardized error handling.
 */
export async function handleAsync<T>(
  promise: Promise<T>,
): Promise<[T | null, Error | null]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    return [null, error as Error];
  }
}
