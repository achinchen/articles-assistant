interface ValidationResult {
    valid: boolean;
    error?: string;
  }
  
export function validateAskRequest(body: any): ValidationResult {
  if (!body.query) {
    return {
      valid: false,
      error: 'Query is required',
    };
  }

  if (typeof body.query !== 'string') {
    return {
      valid: false,
      error: 'Query must be a string',
    };
  }
  
  if (body.query.trim().length === 0) {
    return {
      valid: false,
      error: 'Query cannot be empty',
    };
  }
  
  if (body.query.length > 1000) {
    return {
      valid: false,
      error: 'Query must be less than 1000 characters',
    };
  }
  
  if (body.locale && !['zh', 'en'].includes(body.locale)) {
    return {
      valid: false,
      error: 'Locale must be either "zh" or "en"',
    };
  }
  
  if (body.config) {
    if (body.config.topK && (body.config.topK < 1 || body.config.topK > 20)) {
      return {
        valid: false,
        error: 'topK must be between 1 and 20',
      };
    }
    
    if (body.config.similarityThreshold && 
        (body.config.similarityThreshold < 0 || body.config.similarityThreshold > 1)) {
      return {
        valid: false,
        error: 'similarityThreshold must be between 0 and 1',
      };
    }
  }
  
  return { valid: true };
}