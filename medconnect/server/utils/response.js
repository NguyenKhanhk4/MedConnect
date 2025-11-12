export const responseHandler = {
  successResponse: (res, data = {}, meta = {}, status = 200, message = "") => {
    return res.status(status).json({
      success: true,
      data,
      meta,
      message,
    });
  },

  errorResponse: (res, error = {}, status = 500, message = "") => {
    return res.status(status).json({
      success: false,
      error,
      message,
    });
  },
};

// Backwards-compatible helpers used across controllers
export function ok(res, data = {}, meta = {}, status = 200, message = "") {
  return responseHandler.successResponse(res, data, meta, status, message);
}

export function fail(res, status = 500, error = {}, message = "") {
  // Normalize error payload: if error is a string or code, wrap it
  const errorPayload =
    error && typeof error === "object" ? error : { code: error };
  return responseHandler.errorResponse(res, errorPayload, status, message);
}
