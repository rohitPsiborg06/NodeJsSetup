import type { Response } from "express";

/**
 * Interface for API Success responses
 */
export interface ApiSuccessResponse<T = unknown> {
  status: "Success";
  statusCode: number;
  message: string;
  data?: T;
}

/**
 * Interface for API Error responses
 */
export interface ApiErrorResponse {
  status: "Error";
  statusCode: number;
  message: string;
  errors?: unknown;
}

/**
 * Standard Success Response Helper
 */
export const sendSuccess = <T>(
  res: Response,
  data: T | null = null,
  message = "Success",
  statusCode = 200
): Response<ApiSuccessResponse<T>> => {
  const responsePayload: ApiSuccessResponse<T> = {
    status: "Success",
    statusCode,
    message,
    ...(data !== null && data !== undefined ? { data } : {}),
  };

  return res.status(statusCode).json(responsePayload);
};

/**
 * Standard Created Response (201)
 */
export const sendCreated = <T>(
  res: Response,
  data: T,
  message = "Resource created successfully"
): Response<ApiSuccessResponse<T>> => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Standard Error Response Helper
 */
export const sendError = (
  res: Response,
  message = "An error occurred",
  statusCode = 500,
  errors: unknown = null
): Response<ApiErrorResponse> => {
  const responsePayload: ApiErrorResponse = {
    status: "Error",
    statusCode,
    message,
    ...(errors !== null && errors !== undefined ? { errors } : {}),
  };

  return res.status(statusCode).json(responsePayload);
};

/**
 * Bad Request Response (400)
 */
export const sendBadRequest = (
  res: Response,
  message = "Bad Request",
  errors: unknown = null
): Response<ApiErrorResponse> => {
  return sendError(res, message, 400, errors);
};

/**
 * Unauthorized Response (401)
 */
export const sendUnauthorized = (
  res: Response,
  message = "Unauthorized"
): Response<ApiErrorResponse> => {
  return sendError(res, message, 401);
};

/**
 * Forbidden Response (403)
 */
export const sendForbidden = (
  res: Response,
  message = "Forbidden"
): Response<ApiErrorResponse> => {
  return sendError(res, message, 403);
};

/**
 * Not Found Response (404)
 */
export const sendNotFound = (
  res: Response,
  message = "Resource not found"
): Response<ApiErrorResponse> => {
  return sendError(res, message, 404);
};

/**
 * Internal Server Error Response (500)
 */
export const sendServerError = (
  res: Response,
  message = "Internal Server Error",
  errors: unknown = null
): Response<ApiErrorResponse> => {
  return sendError(res, message, 500, errors);
};

/**
 * Too Many Requests Response (429)
 */
export const sendTooManyRequests = (
  res: Response,
  message = "Too many requests",
  errors: unknown = null
): Response<ApiErrorResponse> => {
  return sendError(res, message, 429, errors);
};