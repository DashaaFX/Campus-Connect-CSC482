import React, { useState } from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { Button } from '../components/ui/button';

// Page to display all notifications for clearer overview
const AllNotificationPage = () => {
  const notifications = useNotificationStore(s => s.notifications);
  const markAllRead = useNotificationStore(s => s.markAllRead);
  const markRead = useNotificationStore(s => s.markRead);
  const loadOlder = useNotificationStore(s => s.loadOlder);
  const loading = useNotificationStore(s => s.loading);
  const error = useNotificationStore(s => s.error);

  const [activeTab, setActiveTab] = useState('unread');
  const [loadingMore, setLoadingMore] = useState(false);

  const unread = notifications.filter(n => !n.readAt);
  const read = notifications.filter(n => !!n.readAt);

  const renderItem = (n) => {
    const productTitle = n.payload?.productTitle;
    const isOrder = n.type === 'order.requested' || n.type === 'order.status.changed';
    const heading = isOrder && productTitle ? productTitle : (n.title || 'Notification');
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
        className={`relative w-full group rounded-lg px-6 py-5 text-base flex flex-col items-start text-left bg-gray-100 hover:bg-gray-200 border border-gray-300 shadow transition-colors duration-150 ${!n.readAt ? 'font-semibold ring-1 ring-yellow-300/20' : 'opacity-80'}`}
        style={{ minHeight: 80 }}
      >
        {!n.readAt && <span className="absolute w-2 h-2 bg-red-500 rounded-full top-4 right-4" />}
        <span className="truncate max-w-[500px] text-base text-blue-900 font-semibold" title={heading}>{heading}</span>
        {isOrder && productTitle && n.title && productTitle !== n.title && (
          <p className="mt-1 text-[15px] italic truncate max-w-[500px] text-indigo-800" title={n.title}>{n.title}</p>
        )}
        {n.body && <p className="mt-1 text-[15px] line-clamp-2 text-gray-800" title={n.body}>{n.body}</p>}
        {dateStr && <p className="mt-2 text-[13px] tracking-wide text-gray-600">{dateStr}</p>}
        {n.payload?.to && n.payload?.from && n.type === 'order.status.changed' && (
          <p className="mt-1 text-[13px] text-gray-700">{n.payload.from} → {n.payload.to}</p>
        )}
      </button>
    );
  };

  const renderList = () => {
    let list = [];
    if (activeTab === 'unread') list = unread;
    else if (activeTab === 'read') list = read;
    else list = notifications;
    if (!list.length) return <p className="py-12 text-center text-[16px] opacity-50 text-black">No notifications</p>;
    return (
      <div className="overflow-hidden divide-y shadow-md divide-white/10 bg-white/2 rounded-xl">
        {list.map(renderItem)}
      </div>
    );
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadOlder();
    setLoadingMore(false);
  };

  return (
    <div className="max-w-3xl px-4 py-12 mx-auto text-white">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
        <Button
          size="sm"
          variant="outline"
          className="text-base bg-gray-800/60 hover:bg-gray-700/70 border-white/20"
          onClick={markAllRead}
          disabled={unread.length === 0}
        >
          Mark all as read
        </Button>
      </div>
      <div className="flex items-center gap-4 mb-8">
        {['unread', 'read', 'all'].map(tab => (
          <Button
            key={tab}
            size="sm"
            variant={activeTab === tab ? 'secondary' : 'outline'}
            className={`text-base px-5 py-2 ${activeTab === tab ? 'bg-gray-700/80' : 'bg-gray-800/40'} transition-colors`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'unread' && 'Unread'}
            {tab === 'read' && 'Read'}
            {tab === 'all' && 'All'}
            {tab === 'unread' && unread.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 text-[13px] font-bold text-white bg-red-600 rounded-full min-w-[22px]">
                {unread.length}
              </span>
            )}
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-6 min-h-[500px]">
        {renderList()}
      </div>
      <div className="flex justify-center mt-10">
        <Button
          size="sm"
          variant="outline"
          onClick={handleLoadMore}
          disabled={loadingMore || loading}
          className="px-8 py-2 text-base text-black"
        >
          {loadingMore || loading ? 'Loading...' : 'Load more'}
        </Button>
      </div>
      {error && <p className="mt-6 text-center text-red-500">{error}</p>}
    </div>
  );
};

export default AllNotificationPage;
