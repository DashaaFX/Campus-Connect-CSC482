import { afterEach, beforeEach, vi } from 'vitest';

// Reset modules and localStorage between tests
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
 
});

afterEach(() => {
  vi.clearAllMocks();
});

