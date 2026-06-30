/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, Dispatch, SetStateAction, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Room, Reservation, TeamActivity } from '../types';

interface BookingModalProps {
  rooms: Room[];
  onClose: () => void;
  setReservations: Dispatch<SetStateAction<Reservation[]>>;
  setActivities: Dispatch<SetStateAction<TeamActivity[]>>;
}

export default function BookingModal({
  rooms,
  onClose,
  setReservations,
  setActivities,
}: BookingModalProps) {
  const [guestName, setGuestName] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id || '101');
  const [checkInDate, setCheckInDate] = useState('2026-10-23');
  const [checkOutDate, setCheckOutDate] = useState('2026-10-26');
  const [numGuests, setNumGuests] = useState(2);

  // Available room types matching our schema
  const matchedRoom = rooms.find((r) => r.id === selectedRoomId);
  const roomTypeStr = matchedRoom ? matchedRoom.type : 'Deluxe King Room';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!guestName) return;

    // Build dates preview range e.g. "Oct 23 - 26"
    const formatDateRange = (inDate: string, outDate: string) => {
      try {
        const inM = new Date(inDate).toLocaleString('en-US', { month: 'short' });
        const inD = new Date(inDate).getDate();
        const outD = new Date(outDate).getDate();
        return `${inM} ${inD} - ${outD}`;
      } catch (err) {
        return 'Oct 23 - 26';
      }
    };

    const dateRangeStr = formatDateRange(checkInDate, checkOutDate);

    const newRes: Reservation = {
      id: `RS-NEW-${Date.now().toString().slice(-4)}`,
      guestName,
      guestAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80', // Default gorgeous avatar
      roomNo: selectedRoomId,
      roomType: roomTypeStr,
      checkInDate,
      checkOutDate,
      dateRange: dateRangeStr,
      numGuests,
      status: 'EXPECTED',
    };

    setReservations((prev) => [newRes, ...prev]);

    // Add activity log
    const newAct: TeamActivity = {
      id: `ACT-NEW-${Date.now()}`,
      staffName: 'Alex (Self)',
      staffAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxGm3a3W-LI8d5QNibA8SrQkNLomr326c1h1GZ4G_reYFV5TA0AZYJfhNbvdqzXSFiQpdvhkavCIIYuoO5nTy4haIBeZ3kKso1Mk1QUkG4uxUgYMdT6j5pucYWUAqFgVHtoKDp87lA743OyVkOwVFHlsU_CjeRkQC9zqOZpNbDRqbTEC-1rmH2BhOHtQhT61niuGcse37BESyodVDdwDRQvcUD7Ajjj3_r7n30a5sXVnusbZ9Gn93ZBK3GlPqYvTqksXFIQuT5tf8',
      action: `recorded a new expected reservation for ${guestName} in Room ${selectedRoomId}`,
      timeAgo: 'Just now',
      statusType: 'success',
    };

    setActivities((prev) => [newAct, ...prev]);
    onClose();
    alert(`Reservation booked successfully! ${guestName} is expected in Room ${selectedRoomId} (${dateRangeStr}).`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-container-lowest w-full max-w-md rounded-lg overflow-hidden shadow-2xl p-6"
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-display text-lg font-black text-primary">New Booking Request</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#5f5e5c] uppercase tracking-wider mb-1.5">
              Guest Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Liam Johnson"
              className="w-full bg-surface-container-low border border-[#eae8e4] rounded-lg p-3 text-xs font-medium focus:ring-1 focus:ring-primary"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5f5e5c] uppercase tracking-wider mb-1.5">
                Assign Room No
              </label>
              <select
                className="w-full bg-surface-container-low border border-[#eae8e4] rounded-lg p-2.5 text-xs font-bold focus:ring-1 focus:ring-primary"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    Room {room.id} ({room.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5f5e5c] uppercase tracking-wider mb-1.5">
                Guests Number
              </label>
              <input
                type="number"
                min={1}
                max={4}
                className="w-full bg-surface-container-low border border-[#eae8e4] rounded-lg p-2.5 text-xs font-medium focus:ring-1 focus:ring-primary"
                value={numGuests}
                onChange={(e) => setNumGuests(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5f5e5c] uppercase tracking-wider mb-1.5">
                Check In Date
              </label>
              <input
                type="date"
                className="w-full bg-surface-container-low border border-[#eae8e4] rounded-lg p-2.5 text-xs font-medium focus:ring-1 focus:ring-primary"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5f5e5c] uppercase tracking-wider mb-1.5">
                Check Out Date
              </label>
              <input
                type="date"
                className="w-full bg-surface-container-low border border-[#eae8e4] rounded-lg p-2.5 text-xs font-medium focus:ring-1 focus:ring-primary"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-outline-variant text-[#5f5e5c] text-xs font-bold rounded-lg hover:bg-surface-container transition-all cursor-pointer"
            >
              Cancel
                </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-primary text-on-primary text-xs font-bold rounded-lg hover:bg-black/95 transition-all cursor-pointer border-none shadow-sm"
            >
              Confirm Booking
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
