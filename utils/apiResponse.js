export function createApiResponse(data, message = 'OK', meta = {}) {
  return {
    success: true,
    message,
    data,
    meta,
  };
}
