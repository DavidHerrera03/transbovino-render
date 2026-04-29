const cache = new Map();
const pending = new Map();
const DEFAULT_TTL = 30000;

const buildKey = (url, options = {}) => `${(options.method || 'GET').toUpperCase()} ${url}`;

export const invalidateRequestCache = (matcher = null) => {
  if (!matcher) {
    cache.clear();
    pending.clear();
    return;
  }

  const shouldDelete = typeof matcher === 'function'
    ? matcher
    : (key) => String(key).includes(String(matcher));

  Array.from(cache.keys()).forEach((key) => {
    if (shouldDelete(key)) cache.delete(key);
  });
  Array.from(pending.keys()).forEach((key) => {
    if (shouldDelete(key)) pending.delete(key);
  });
};

export const cachedJsonRequest = async (url, options = {}, { ttl = DEFAULT_TTL, force = false } = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    const response = await fetch(url, options);
    return response;
  }

  const key = buildKey(url, options);
  const now = Date.now();
  const cached = cache.get(key);

  if (!force && cached && cached.expiresAt > now) {
    return cached.value;
  }

  if (!force && pending.has(key)) {
    return pending.get(key);
  }

  const request = fetch(url, options)
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.detail || data.mensaje || 'Error en la operación');
        error.status = response.status;
        throw error;
      }
      cache.set(key, { value: data, expiresAt: Date.now() + ttl });
      return data;
    })
    .finally(() => pending.delete(key));

  pending.set(key, request);
  return request;
};
