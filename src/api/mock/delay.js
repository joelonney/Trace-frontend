// Simulates network latency for mock responses.
export const mockDelay = (data, ms = 350) =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms))
