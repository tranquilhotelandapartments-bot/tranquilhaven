import { useState, useEffect } from 'react';
import { collection, doc, setDoc, query, orderBy, onSnapshot, where } from 'firebase/firestore';
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
    if (!room) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'messages'),
      where('roomNo', '==', room),
      orderBy('timestamp')
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs: InternalMessage[] = [];
      snap.forEach((d) => msgs.push(d.data() as InternalMessage));
      setMessages(msgs);
    });
    return unsub;
  }, [room]);

  const handleAddMessage = (text: string) => {
    const fresh: InternalMessage = {
      id: `M-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderName: room ? `Room ${room}` : 'Guest',
      text,
      timestamp: new Date().toISOString(),
      roomNo: room || undefined,
    };
    setDoc(doc(db, 'messages', fresh.id), fresh).catch(console.error);

    const reply: InternalMessage = {
      id: `M-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-reply`,
      senderName: 'Front Desk',
      text: 'Request sent ✓ A staff member will assist you shortly.',
      timestamp: new Date().toISOString(),
      roomNo: room || undefined,
    };
    setDoc(doc(db, 'messages', reply.id), reply).catch(console.error);
  };

  return (
    <div className="min-h-screen bg-[#fcf9f5] flex items-center justify-center p-4">
      <GuestPortalScreen
        messages={messages}
        onAddMessage={handleAddMessage}
        initialRoom={room}
        onSetRoom={(r) => setRoom(r)}
      />
    </div>
  );
}
