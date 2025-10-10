import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock axios instance so it doens't make real network requests
vi.mock('@/utils/axios', () => {
  const post = vi.fn();
  const get = vi.fn();
  return { default: { post, get, interceptors: 
    { request: { use: () => {} }, 
      response: { use: () => {} } 
    } 
  } 
};
});

import { useAuthStore } from '../useAuthStore';
import api from '@/utils/axios';

const getState = () => useAuthStore.getState();
const setState = (partial) => useAuthStore.setState(partial);

// Helper to reset store between tests
function resetStore() {
  useAuthStore.setState({ user: null, token: null, loading: false, error: null });
  localStorage.clear();
}

describe('Authentication logic', () => {
  beforeEach(() => {
    resetStore();
  });

  it('register success returns data and does not persist user until login', async () => {
    const fakeResponse = { data: { success: true, message: 'Registered' } };
    api.post.mockResolvedValueOnce(fakeResponse);

    const result = await getState().register({ email: 'a@test.com', password: 'secret' });
    expect(result).toEqual(fakeResponse.data);
    expect(getState().user).toBeNull(); 
    expect(getState().error).toBeNull();
  });

  it('login stores user id & profilePicture', async () => {
    const fakeUser = { _id: '123', profile: { profilePhoto: 'http://img/p.png' } };
    api.post.mockResolvedValueOnce({ data: { user: fakeUser, token: 'jwt123' } });

    const res = await getState().login({ email: 'a@test.com', password: 'pw' });
    expect(res.user.id).toBe('123');
    expect(res.user.profilePicture).toBe('http://img/p.png');
    expect(getState().token).toBe('jwt123');
  });

  it('login sets error on failure and does not set user/token', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { message: 'Invalid email or password' } } });
    //expects login to fail, throw an error
    await expect(getState().login({ email: 'x@test.com', password: 'bad' })).rejects.toThrow();
    expect(getState().user).toBeNull();
    expect(getState().token).toBeNull();
    expect(getState().error).toBe('Invalid email or password');
  });

  it('logout clears user and token', async () => {
    // Seed state
    setState({ user: { id: 'u1' }, token: 't1' });
    await getState().logout();
    expect(getState().user).toBeNull();
    expect(getState().token).toBeNull();
  });
});
