import Chat from '@/components/chat/Chat';
import { useAuthStore } from '@/store/useAuthStore';
import { format } from 'date-fns';
import { useChatStore } from '@/store/useChatStore';
import MapEmbed from '@/components/chat/Map';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { useChatSession } from '@/hooks/chat/useChatSession';
import { useNavigate } from 'react-router-dom';
// ChatPage: Sidebar for meeting coordination + main Chat component
export default function ChatPage() {
  function formatDateTime(dt) {
    if (!dt) return '';
    try {
      return format(new Date(dt), 'PPpp');
    } catch {
      return dt;
    }
  }
  const currentUser = useAuthStore(s => s.user);
  // Store actions
  const confirmMeetingLocation = useChatStore(s => s.confirmMeetingLocation);
  const proposeMeetingDateTime = useChatStore(s => s.proposeMeetingDateTime);
  const confirmMeetingDateTime = useChatStore(s => s.confirmMeetingDateTime);
  const updateMeetingLocation = useChatStore(s => s.updateMeetingLocation);
  const resetMeetingLocationConfirmation = useChatStore(s => s.resetMeetingLocationConfirmation);
  const { users, activeConversationId, meetingLocation, meetingDateTime } = useChatSession();
  const meetingLocationConfirmedBy = useChatStore(s => s.meetingLocationConfirmedBy) || [];
  const meetingLocationProposedBy = useChatStore(s => s.meetingLocationProposedBy);
  const meetingDateTimeProposedBy = useChatStore(s => s.meetingDateTimeProposedBy);
  const meetingDateTimeConfirmedBy = useChatStore(s => s.meetingDateTimeConfirmedBy) || [];

  const navigate = useNavigate();


  function handleProposeDateTime(dt) {
    if (!activeConversationId || !dt || dt.length < 16 || !currentUser?.id) return;
    proposeMeetingDateTime(activeConversationId, dt);
  }

  function handleConfirmDateTime() {
    if (!activeConversationId || !meetingDateTime || !currentUser?.id) return;
    confirmMeetingDateTime(activeConversationId);
  }
  // useChatSession handles peer extraction, auto-start, and meta subscription

   return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="flex-1">
        {currentUser ? (
          <Chat users={users} />
        ) : (
          <div className="p-4 text-sm text-gray-500 border rounded bg-gray-50">
            Please log in to use chat features.
          </div>
        )}
      </div>  
      {currentUser && (
      <div className="flex flex-col w-full gap-2 md:w-1/3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              Back
            </Button>
            {/* Navigation shortcuts */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/my-sales')}
              className="text-indigo-700 border border-indigo-300 bg-indigo-50 hover:bg-indigo-100"
            >My Sales</Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/my-orders')}
              className="text-indigo-700 border border-indigo-300 bg-indigo-50 hover:bg-indigo-100"
            >My Orders</Button>
          </div>
          <div className="relative ml-2 group">
            <Info className="w-5 h-5 text-blue-500 cursor-pointer" />
            <div className="absolute right-0 z-10 hidden w-64 p-2 mt-2 text-xs text-gray-700 bg-white border rounded shadow group-hover:block">
              <strong>How to use Meeting Location:</strong>
              <ul className="mt-1 list-disc list-inside">
                <li>Type or search for a meeting place in the input below.</li>
                <li>Select a location from the suggestions to update the map.</li>
                <li>Click <b>Confirm Meeting Location</b> to finalize the spot.</li>
                <li>Both users will see the confirmed location and map update in real time.</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mb-1 font-semibold text-gray-700">
          Meeting Location: {meetingLocation}
          {meetingLocation && meetingLocationProposedBy && meetingLocationConfirmedBy.length < 2 && (
            <span className="ml-2 text-[10px] font-normal text-gray-500">
              {meetingLocationProposedBy === currentUser?.id ? '(You proposed)' : '(Proposed by other user)'}
            </span>
          )}
        </div>
        <MapEmbed
          location={meetingLocation}
          onPlaceSelected={place => {
            if (activeConversationId) {
              const address = place.formatted_address || place.name;
              updateMeetingLocation(activeConversationId, address);
            }
          }}
        />
        {meetingLocationConfirmedBy.length < 2 && meetingLocation && (
          <Button
            variant="default"
            size="sm"
            className="mt-2 text-white bg-green-600 hover:bg-green-700"
            disabled={meetingLocationConfirmedBy.includes(currentUser?.id) || !meetingLocation}
            onClick={async () => {
              if (activeConversationId && !meetingLocationConfirmedBy.includes(currentUser?.id)) {
                await confirmMeetingLocation(activeConversationId);
              }
            }}
          >
            {meetingLocationConfirmedBy.includes(currentUser?.id)
              ? 'You Confirmed'
              : 'Confirm Meeting Location'}
          </Button>
        )}
        {meetingLocation && meetingLocationConfirmedBy.length === 1 && meetingLocationConfirmedBy.includes(currentUser?.id) && (
          <div className="mt-1 text-xs text-yellow-700">
            Waiting for the other user to confirm the meeting location...
          </div>
        )}
        {meetingLocation && meetingLocationConfirmedBy.length === 1 && !meetingLocationConfirmedBy.includes(currentUser?.id) && (
          <div className="mt-1 text-xs text-blue-700">
            Please confirm the proposed meeting location.
          </div>
        )}
        {meetingLocationConfirmedBy.length === 2 && meetingLocation && (
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="default"
              size="sm"
              className="text-white bg-green-600 cursor-default"
              disabled
            >
              Meeting Location Confirmed
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-blue-700 bg-white border-blue-600 hover:bg-blue-50"
              onClick={() => { if (activeConversationId) resetMeetingLocationConfirmation(activeConversationId); }}
            >
              Change Location
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-2 p-2 mt-4 border rounded bg-gray-50">
          <div className="flex items-center gap-1 font-semibold text-gray-700">
            <span>Meeting Date & Time:</span>
            <div className="relative ml-1 group">
              <Info className="w-4 h-4 text-blue-500 cursor-pointer" aria-label="Meeting date & time info" />
              <div className="absolute left-0 z-10 hidden w-56 p-2 mt-2 text-[10px] leading-snug text-gray-600 bg-white border border-gray-200 rounded shadow group-hover:block">
                Propose a date & time; the proposer is auto-confirmed. The other user must confirm to finalize. Once both confirm, it's locked until you click <span className="font-medium">Change Date & Time</span>. Changing the meeting location also clears the date & time confirmations.
              </div>
            </div>
          </div>
          {(!meetingLocation || meetingLocationConfirmedBy.length < 2) ? (
            <div className="text-xs text-gray-500">Please confirm the meeting location first.</div>
          ) : (
            <>
              <input
                type="datetime-local"
                className="px-3 py-2 text-sm transition-all border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                value={meetingDateTime || ''}
                onChange={e => handleProposeDateTime(e.target.value)}
                disabled={meetingDateTimeConfirmedBy.length === 2}
              />
              {meetingDateTime && (
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-700">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400"><rect x="2" y="4" width="12" height="10" rx="2"/><path d="M8 2v2"/><path d="M3 8h10"/></svg>
                  <span>Proposed: <span className="font-semibold text-blue-700">{formatDateTime(meetingDateTime)}</span></span>
                  {meetingDateTimeProposedBy && meetingDateTimeProposedBy !== currentUser.id && (
                    <span className="ml-2 text-[10px] text-gray-500">(Proposed by other user)</span>
                  )}
                  {meetingDateTimeProposedBy && meetingDateTimeProposedBy === currentUser.id && (
                    <span className="ml-2 text-[10px] text-blue-500">(You proposed)</span>
                  )}
                </div>
              )}
              {meetingDateTime && meetingDateTimeConfirmedBy.length < 2 && (
                <div className="flex items-center gap-2 mt-2">
                  {!meetingDateTimeConfirmedBy.includes(currentUser?.id) && (
                    <Button
                      variant="default"
                      size="sm"
                      className="text-white bg-blue-600 shadow-md hover:bg-blue-700"
                      onClick={handleConfirmDateTime}
                    >
                      Confirm Date & Time
                    </Button>
                  )}
                  {meetingDateTimeConfirmedBy.includes(currentUser?.id) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-700 bg-white border-blue-600 hover:bg-blue-50"
                      onClick={async () => {
                        if (activeConversationId) {
                          const { doc, updateDoc } = await import('firebase/firestore');
                          const chatRef = doc(await import('@/../firebase').then(m => m.db), 'chats', activeConversationId);
                          await updateDoc(chatRef, {
                            meetingDateTime: null,
                            meetingDateTimeProposedBy: null,
                            meetingDateTimeConfirmedBy: [],
                          });
                        }
                      }}
                    >
                      Change Date & Time
                    </Button>
                  )}
                </div>
              )}
              {meetingDateTime && meetingDateTimeConfirmedBy.length < 2 && (
                <div className="mt-1 text-xs text-yellow-700">
                  {meetingDateTimeConfirmedBy.includes(currentUser?.id)
                    ? 'Waiting for the other user to confirm...'
                    : 'Please confirm the proposed date & time.'}
                </div>
              )}
              {meetingDateTimeConfirmedBy.length === 2 && meetingDateTime && (
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="text-white bg-blue-600 cursor-default"
                    disabled
                  >
                    Date & Time Confirmed
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-700 bg-white border-blue-600 hover:bg-blue-50"
                    onClick={async () => {
                      if (activeConversationId) {
                        const { doc, updateDoc } = await import('firebase/firestore');
                        const chatRef = doc(await import('@/../firebase').then(m => m.db), 'chats', activeConversationId);
                        await updateDoc(chatRef, {
                          meetingDateTime: null,
                          meetingDateTimeProposedBy: null,
                          meetingDateTimeConfirmedBy: [],
                        });
                      }
                    }}
                  >
                    Change Date & Time
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
