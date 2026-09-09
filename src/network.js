const TRANSIENT_STATUS_CODES = new Set([408, 425, 429]);

function isTransientStatus(status) {
  return TRANSIENT_STATUS_CODES.has(status) || status >= 500;
}

export async function fetchWithRetry(url, options = {}) {
  const {
    fetchImpl = globalThis.fetch,
    timeoutMs = 8000,
    retries = 1,
    ...fetchOptions
  } = options;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      if (response.ok) return response;

      const error = new Error(`HTTP ${response.status}`);
      error.transient = isTransientStatus(response.status);
      throw error;
    } catch (error) {
      lastError = error;
      const transient = error?.name === "AbortError" || error?.transient === true;
      if (!transient || attempt >= retries) throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}
