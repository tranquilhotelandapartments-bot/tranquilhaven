import { useState, useEffect } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { GuestCRM, InternalMessage, ServiceRequest, SystemNotification } from './types';
import { GuestPortalScreen } from './GuestPortalScreen';

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    room: params.get('room') || params.get('roomNo') || '402',
    guestId: params.get('guestId') || params.get('id') || `TH-2026-URL-${Date.now()}`,
    guestName: params.get('guestName') || params.get('guest') || 'Valued Guest',
    phone: params.get('phone') || '+1 (555) 732-9011',
  };
}

export default function App() {
  const { room, guestId, guestName, phone } = getUrlParams();

  const [guest] = useState<GuestCRM>(() => ({
    id: guestId,
    fullName: guestName,
    phone: phone,
    email: 'guest@tranquilhaven.com',
    passport: 'AUTO-US-1029',
    nationalId: 'NID-AUTO-REG',
    emergencyContact: 'None',
    loyaltyPoints: 150,
    spendingHistory: 450,
    checkedInRoom: room,
    historyLogs: ['Instant check-in via secure WhatsApp Portal login link']
  }));

  const [messages, setMessages] = useState<InternalMessage[]>([]);

  const handleAddMessage = (text: string) => {
    const fresh: InternalMessage = {
      id: `M-${Date.now()}`,
      senderName: guest.fullName,
      senderRole: 'Guest',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, fresh]);

    setDoc(doc(db, 'messages', fresh.id), fresh).catch(console.error);
  };

  const handlePostServiceRequest = (roomNo: string, requestType: string, details?: string) => {
    const freshRequest: ServiceRequest = {
      id: `SR-${Date.now().toString().slice(-4)}`,
      roomNo,
      requestType,
      details: details || '',
      requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      requestedTimeMs: Date.now(),
      assignedStaff: 'Unassigned',
      status: 'Pending',
      priority: 'Normal',
      escalationLevel: 1
    };

    setDoc(doc(db, 'guestRequests', freshRequest.id), freshRequest).catch(console.error);
  };

  const handlePostMaintenanceTicket = async (ticket: import('./types').MaintenanceTicket) => {
    try {
      await setDoc(doc(db, 'maintenanceTickets', ticket.id), ticket);
    } catch (err) {
      console.error('Failed to create maintenance ticket:', err);
    }
  };

  const handleAddNotification = async (notif: SystemNotification) => {
    try {
      await setDoc(doc(db, 'notifications', notif.id), notif);
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcf9f5] flex items-center justify-center p-4">
      <GuestPortalScreen
        messages={messages}
        guests={[guest]}
        onAddMessage={handleAddMessage}
        onPostMaintenanceTicket={handlePostMaintenanceTicket}
        onAddNotification={handleAddNotification}
        onPostServiceRequest={handlePostServiceRequest}
      />
    </div>
  );
}
