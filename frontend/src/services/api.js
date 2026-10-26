export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest(
  path,
  { method = "GET", body, token, signal } = {}
) {
  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      "No se pudo conectar con el servidor. Intenta nuevamente.",
      0
    );
  }

  const data =
    response.status !== 204 ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message =
      response.status >= 500
        ? "El servidor no pudo completar la solicitud."
        : typeof data?.detail === "string"
        ? data.detail
        : "Revisa los datos e intenta nuevamente.";

    throw new ApiError(message, response.status);
  }

  return data;
}
