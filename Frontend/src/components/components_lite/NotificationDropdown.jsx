import React, { useState } from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';
// Implemented a dropdown notification component with tabs for unread, read, and all notifications
// Modified notification component for better view
// Unread notifications can now be marked as read when clicked on it
const NotificationDropdown = () => {
  const notifications = useNotificationStore(s => s.notifications);
  const markAllRead = useNotificationStore(s => s.markAllRead);
  const markRead = useNotificationStore(s => s.markRead);

  const [activeTab, setActiveTab] = useState('unread'); // 'unread' | 'read' | 'all'
  const unread = notifications.filter(n => !n.readAt);
  const read = notifications.filter(n => !!n.readAt);

  const renderItem = (n) => {
    const productTitle = n.payload?.productTitle;
    const isOrder = n.type === 'order.requested' || n.type === 'order.status.changed';
    // Product title as primary heading for notifications
    const heading = isOrder && productTitle ? productTitle : (n.title || 'Notification');
    // Format date
    let dateStr = '';
    if (n.createdAt) {
      const d = typeof n.createdAt === 'string' ? new Date(n.createdAt) : n.createdAt.toDate?.() || new Date();
      dateStr = d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return (
      <button
        key={n.id}
        type="button"
        onClick={() => { if (!n.readAt) markRead(n.id); }}
        className={`relative w-full group rounded-md px-3 py-3 text-xs flex flex-col items-center text-center border border-white/10 bg-gray-800/50 backdrop-blur-sm hover:bg-gray-700/60 transition-colors shadow-sm ${!n.readAt ? 'font-semibold ring-1 ring-yellow-300/20' : 'opacity-80'}`}
      >
        {!n.readAt && <span className="absolute w-2 h-2 bg-red-500 rounded-full top-2 right-2" />}
        <span className="truncate max-w-[200px]" title={heading}>{heading}</span>
        {isOrder && productTitle && n.title && productTitle !== n.title && (
          <p className="mt-1 text-[11px] opacity-60 italic truncate max-w-[200px]" title={n.title}>{n.title}</p>
        )}
        {n.body && <p className="mt-1 text-[11px] line-clamp-2 opacity-70" title={n.body}>{n.body}</p>}
        {/* Show date instead of type */}
        {dateStr && <p className="mt-2 text-[10px] tracking-wide opacity-40">{dateStr}</p>}
        {n.payload?.to && n.payload?.from && n.type === 'order.status.changed' && (
          <p className="mt-1 text-[10px] opacity-50">{n.payload.from} → {n.payload.to}</p>
        )}
      </button>
    );
  };

      const renderList = () => {
        if (activeTab === 'unread') {
          if (!unread.length) return <p className="py-6 text-center text-[11px] opacity-50">No unread notifications</p>;
          return unread.map(renderItem);
        }
        if (activeTab === 'read') {
          if (!read.length) return <p className="py-6 text-center text-[11px] opacity-50">No read notifications yet</p>;
          return read.map(renderItem);
        }
        // Merge read + unread, newest first (incoming already newest first from store)
        const all = notifications;
        if (!all.length) return <p className="py-6 text-center text-[11px] opacity-50">No notifications</p>;
        return all.map(renderItem);
      };

      return (
        <div className="w-[360px] text-white px-3 py-2">
          <div className="mx-auto w-full max-w-[320px] flex flex-col items-center">
            {/* Header (consistent layout) */}
            <div className="flex items-center w-full pb-2 mb-3 border-b border-white/10">
              <div className="flex justify-center flex-1">
                <h4 className="text-sm font-medium tracking-wide text-center">Notifications</h4>
              </div>
              <div className="w-[72px] flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className={`text-xs bg-gray-800/60 hover:bg-gray-700/70 border-white/20 ${activeTab === 'unread' ? 'visible' : 'invisible'}`}
                  onClick={markAllRead}
                  disabled={unread.length === 0}
                >
                  Mark all
                </Button>
              </div>
            </div>
            {/* Tabs */}
            <div className="flex items-center justify-center w-full gap-2 mb-3">
              {['unread', 'read', 'all'].map(tab => (
                <Button
                  key={tab}
                  size="sm"
                  variant={activeTab === tab ? 'secondary' : 'outline'}
                  className={`text-xs px-3 py-1 flex items-center ${activeTab === tab ? 'bg-gray-700/80' : 'bg-gray-800/40'} transition-colors`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'unread' && 'Unread'}
                  {tab === 'read' && 'Read'}
                  {tab === 'all' && 'All'}
                  {tab === 'unread' && unread.length > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-600 rounded-full min-w-[16px]">
                      {unread.length}
                    </span>
                  )}
                </Button>
              ))}
            </div>
            {/* List */}
            <div className="w-full max-w-[320px] space-y-2 max-h-[280px] overflow-y-auto custom-scroll">
              {renderList()}
            </div>
            {/* Footer */}
            <div className="flex justify-center w-full mt-3">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="text-xs bg-gray-800/60 hover:bg-gray-700/70 border-white/20"
              >
                <Link to="/notifications" aria-label="All notifications page">All Notifications</Link>
              </Button>
            </div>
          </div>
        </div>
      );
    };

    export default NotificationDropdown;
