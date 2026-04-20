export class ApiError extends Error {
  constructor(message, statusCode = 400, type = 'USER') {
    super(message);
    this.statusCode = statusCode;
    this.type = type; // USER | SERVER | VALIDATION | AUTH
    this.isOperational = true;
  }

  static badRequest(message = 'Invalid request') {
    return new ApiError(message, 400, 'VALIDATION');
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(message, 401, 'AUTH');
  }

  static forbidden(message = 'Access denied') {
    return new ApiError(message, 403, 'AUTH');
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(message, 404, 'USER');
  }

  static conflict(message = 'Resource already exists') {
    return new ApiError(message, 409, 'USER');
  }

  static tooMany(message = 'Too many requests. Please try again later.') {
    return new ApiError(message, 429, 'USER');
  }

  static internal(message = 'Something went wrong on our side. Our team is working on fixing it.') {
    return new ApiError(message, 500, 'SERVER');
  }
}
