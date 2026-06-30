import { useState, useEffect } from 'react';
import { collection, doc, setDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { InternalMessage } from './types';
import { GuestPortalScreen } from './GuestPortalScreen';

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    room: params.get('room') || params.get('roomNo') || '',
    guestId: params.get('guestId') || params.get('id') || `guest-${Date.now()}`,
    guestName: params.get('guestName') || params.get('guest') || '',
  };
}

export default function App() {
  const { room: urlRoom } = getUrlParams();
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [room, setRoom] = useState(urlRoom || '');

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('timestamp'));
    const unsub = onSnapshot(q, (snap) => {
      const msgs: InternalMessage[] = [];
      snap.forEach((d) => msgs.push(d.data() as InternalMessage));
      setMessages(msgs);
    });
    return unsub;
  }, []);

  const handleAddMessage = (text: string) => {
    const fresh: InternalMessage = {
      id: `M-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderName: room ? `Room ${room}` : 'Guest',
      text,
      timestamp: new Date().toISOString(),
    };
    setDoc(doc(db, 'messages', fresh.id), fresh).catch(console.error);
  };

  return (
    <div className="min-h-screen bg-[#fcf9f5] flex items-center justify-center p-4">
      <GuestPortalScreen
        messages={messages}
        onAddMessage={handleAddMessage}
        initialRoom={room}
      />
    </div>
  );
}
