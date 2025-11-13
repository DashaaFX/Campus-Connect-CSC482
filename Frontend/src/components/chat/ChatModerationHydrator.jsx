import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
// Component that hydrates chat moderation (block lists) on app load.
// Reflects block state changes in chat components. 
export default function ChatModerationHydrator() {
  const user = useAuthStore(s => s.user);
  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_FIREBASE_CHAT === 'true' && user?.firebaseUid) {
      try { useChatStore.getState().subscribeBlockedUsers(); } catch {/* ignore */}
    }
  }, [user]);
  return null; 
}
