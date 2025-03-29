// StripeLogger.ts - Utility for logging Stripe-related events and errors

/**
 * Logs a Stripe-related error with optional metadata
 * @param context The context where the error occurred
 * @param error The error object or message
 * @param metadata Additional information about the error context
 */
export const logStripeError = (
  context: string, 
  error: any, 
  metadata: Record<string, any> = {}
): void => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  // Construct the log entry
  const logEntry = {
    timestamp: new Date().toISOString(),
    context,
    error: errorMessage,
    stack: errorStack,
    ...metadata,
  };
  
  // Log to console (in production, you might send this to a logging service)
  console.error(`[STRIPE ERROR] ${context}:`, logEntry);
  
  // In the future, you could add additional logging targets here
  // For example, sending to a monitoring service or Supabase logging table
};

/**
 * Logs a Stripe-related success event with optional metadata
 * @param context The context where the success occurred
 * @param message The success message
 * @param metadata Additional information about the success context
 */
export const logStripeSuccess = (
  context: string, 
  message: string, 
  metadata: Record<string, any> = {}
): void => {
  // Construct the log entry
  const logEntry = {
    timestamp: new Date().toISOString(),
    context,
    message,
    ...metadata,
  };
  
  // Log to console
  console.log(`[STRIPE SUCCESS] ${context}:`, logEntry);
  
  // In the future, you could add additional logging targets here
};

export default {
  logError: logStripeError,
  logSuccess: logStripeSuccess,
};
