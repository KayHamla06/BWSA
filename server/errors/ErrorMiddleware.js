import { ErrorHandler } from './ErrorHandler.js';

export function errorMiddleware(err, req, res, _next) {
  const apiError = ErrorHandler.classify(err);
  ErrorHandler.log(apiError, req);

  const response = {
    success: false,
    type: apiError.type,
    message: apiError.statusCode >= 500
      ? 'Something went wrong on our side. Our team is working on fixing it.'
      : apiError.message,
  };

  res.status(apiError.statusCode).json(response);
}
