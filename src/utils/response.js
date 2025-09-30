class ApiResponse {
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (errors) {
      response.errors = errors;
    }

    if (process.env.NODE_ENV === 'development' && statusCode === 500) {
      response.stack = new Error().stack;
    }

    return res.status(statusCode).json(response);
  }

  static created(res, data, message = 'Created successfully') {
    return this.success(res, data, message, 201);
  }

  static badRequest(res, message = 'Bad Request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  static conflict(res, message = 'Conflict') {
    return this.error(res, message, 409);
  }

  static validationError(res, errors) {
    return this.error(res, 'Validation failed', 422, errors);
  }

  static serverError(res, message = 'Internal Server Error') {
    return this.error(res, message, 500);
  }
}

// Export both the class and individual functions for backward compatibility
const successResponse = (res, message, data = null, statusCode = 200) => {
  return ApiResponse.success(res, data, message, statusCode);
};

const errorResponse = (res, message, statusCode = 500, errors = null) => {
  return ApiResponse.error(res, message, statusCode, errors);
};

module.exports = {
  ApiResponse,
  successResponse,
  errorResponse
};
