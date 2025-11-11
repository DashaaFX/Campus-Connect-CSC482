/**
 * Chat message notification endpoint 
 * This Lambda backs POST /notifications/chat-message. The frontend hits this
 * after sending a chat message so we can drop a notification for other user.
 *
 * What it does (in order):
 * 2. Verifies the caller is actually in the conversation 
 * 3. Figures out the other participant's userId.
 * 4. Calls notifyChatMessage() which writes a Firestore notification for them.
 *
 * Why keep it:
 * - Decouples chat write flow from notification formatting.
 * - Gives us an auth gate; prevents random users from spamming notifications.
 */
import { createErrorResponse, createSuccessResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';
import { notifyChatMessage } from '/opt/nodejs/services/notifications.js';

// Single handler for chat message notification publishing
export const handler = async (event) => {
  const path = event.path || '';
  const method = event.httpMethod;

  // CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '{}' };
  }

  if (path.endsWith('/notifications/chat-message') && method === 'POST') {
    try {
      const userId = event.requestContext?.authorizer?.userId;
      const firebaseUid = event.requestContext?.authorizer?.firebaseUid || null;
      if (!userId) return withCors(createErrorResponse('Auth required', 401));

      const body = parseJSONBody(event.body);
      const required = ['conversationId'];
      const v = validateRequiredFields(body, required);
      if (!v.isValid) return withCors(createErrorResponse(v.message, 400));

      const { conversationId, textPreview = '' } = body;

      // Load chat via Firebase Admin to derive participants and verify membership
      const { getFirebaseApp } = await import('/opt/nodejs/utils/firebaseAdmin.js');
      const app = await getFirebaseApp();
      const { getFirestore } = await import('firebase-admin/firestore');
      const db = getFirestore(app);
      const chatDoc = await db.collection('chats').doc(conversationId).get();
      if (!chatDoc.exists) return withCors(createErrorResponse('Chat not found', 404));
      const chatData = chatDoc.data();
      const participants = chatData.participants || chatData.participantIds || [];
      const firebaseParticipants = chatData.participantFirebaseUids || [];
  console.log('[notifications] chat-message membership', { userId, participants });

      // Basic membership check (app-level id)
      if (!participants.includes(userId)) {
        return withCors(createErrorResponse('Not a participant', 403));
      }

      // Derive other participant app user id
      const otherUserId = participants.find(p => p !== userId);
      if (!otherUserId) return withCors(createErrorResponse('Missing peer', 400));

      // Publish notification to other participant only via helper
      await notifyChatMessage({
        conversationId,
        otherUserId,
        actorId: userId,
        textPreview
      });
      console.log('[notifications] chat-message notify queued', { conversationId, otherUserId });
      return withCors(createSuccessResponse({ message: 'Notification queued' }, 201));
    } catch (e) {
      console.error('chat-message notify error:', e);
      return withCors(createErrorResponse(e.message || 'Internal error', 500));
    }
  }

  return withCors(createErrorResponse('Not found', 404));
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };
}
function withCors(resp) {
  return { ...resp, headers: { ...(resp.headers || {}), ...corsHeaders() } };
}
