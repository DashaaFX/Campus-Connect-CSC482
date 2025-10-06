import { describe, it, expect } from 'vitest';
import { directConversationId } from '../useChat';

describe('directConversationId', () => {
  it('sorts ids alphabetically regardless of order', () => {
    const a = 'userB';
    const b = 'userA';
    const id = directConversationId(a, b);
    expect(id).toBe('userA_userB');
  });

  it('is stable for repeated calls with same inputs', () => {
    const first = directConversationId('alpha', 'zeta');
    const second = directConversationId('zeta', 'alpha');
    expect(first).toBe(second);
  });

  it('throws if either id missing', () => {
    expect(() => directConversationId(null, 'x')).toThrow();
    expect(() => directConversationId('x', undefined)).toThrow();
  });
});
