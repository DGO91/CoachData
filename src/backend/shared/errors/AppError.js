'use strict';

class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
        super(message);
        this.name       = 'AppError';
        this.statusCode = statusCode;
        this.errorCode  = errorCode;
        if (process.env.NODE_ENV !== 'production') {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

module.exports = { AppError };
