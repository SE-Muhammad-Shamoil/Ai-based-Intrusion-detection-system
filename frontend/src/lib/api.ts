import {
  ExplainResponse,
  MetaResponse,
  PredictResponse,
  RowDetailResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiRequestError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string = "REQUEST_FAILED", details?: any) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.details = details;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return (await res.json()) as T;
  }

  let errorBody: any = null;
  try {
    errorBody = await res.json();
  } catch {
    // Ignore JSON parsing errors for empty or non-JSON bodies
  }

  const code = errorBody?.code || `HTTP_${res.status}`;
  let message = errorBody?.message || errorBody?.detail || `Request failed with status ${res.status}`;

  if (res.status === 422 && errorBody?.code === "MISSING_COLUMNS" && Array.isArray(errorBody.details)) {
    message = `Missing ${errorBody.details.length} required columns: ${errorBody.details.slice(0, 10).join(", ")}${
      errorBody.details.length > 10 ? ` and ${errorBody.details.length - 10} more` : ""
    }`;
  } else if (res.status === 404 && errorBody?.code === "SESSION_NOT_FOUND") {
    message = "Your flow session expired or the server restarted. Please upload the flows again.";
  }

  throw new ApiRequestError(message, code, errorBody?.details);
}

function catchNetworkError(err: any): never {
  if (err instanceof ApiRequestError) {
    throw err;
  }
  throw new ApiRequestError(
    `Cannot connect to backend server at ${API_BASE}. Please ensure the FastAPI backend is running.`,
    "NETWORK_ERROR"
  );
}

export async function checkHealth(): Promise<{ status: string; models_loaded: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
    return await handleResponse(res);
  } catch (err) {
    return catchNetworkError(err);
  }
}

export async function fetchMeta(): Promise<MetaResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/meta`, { cache: "no-store" });
    return await handleResponse<MetaResponse>(res);
  } catch (err) {
    return catchNetworkError(err);
  }
}

export async function predictFile(file: File): Promise<PredictResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/predict`, {
      method: "POST",
      body: formData,
    });
    return await handleResponse<PredictResponse>(res);
  } catch (err) {
    return catchNetworkError(err);
  }
}

export async function predictSample(): Promise<PredictResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/predict/sample`, {
      method: "POST",
    });
    return await handleResponse<PredictResponse>(res);
  } catch (err) {
    return catchNetworkError(err);
  }
}

export async function fetchRowDetail(sessionId: string, rowId: number): Promise<RowDetailResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/results/${sessionId}/rows/${rowId}`, {
      cache: "no-store",
    });
    return await handleResponse<RowDetailResponse>(res);
  } catch (err) {
    return catchNetworkError(err);
  }
}

export async function requestExplanation(sessionId: string, rowId: number): Promise<ExplainResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, row_id: rowId }),
    });
    return await handleResponse<ExplainResponse>(res);
  } catch (err) {
    return catchNetworkError(err);
  }
}
