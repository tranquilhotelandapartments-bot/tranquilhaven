/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, Dispatch, SetStateAction } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Room, Reservation, TeamActivity } from '../types';

interface ReservationsTabProps {
  rooms: Room[];
  reservations: Reservation[];
  setRooms: Dispatch<SetStateAction<Room[]>>;
  setReservations: Dispatch<SetStateAction<Reservation[]>>;
  setActivities: Dispatch<SetStateAction<TeamActivity[]>>;
  onOpenQuickBooking: () => void;
}

export default function ReservationsTab({
  rooms,
  reservations,
  setRooms,
  setReservations,
  setActivities,
  onOpenQuickBooking,
}: ReservationsTabProps) {
  const [selectedDay, setSelectedDay] = useState<number>(23); // Default Tuesday 23rd

  const weekDays = [
    { label: 'MON', date: 22 },
    { label: 'TUE', date: 23 },
    { label: 'WED', date: 24 },
    { label: 'THU', date: 25 },
    { label: 'FRI', date: 26 },
    { label: 'SAT', date: 27 },
    { label: 'SUN', date: 28 },
  ];

  // Separate live list for arrivals today (TUE 23) vs future upcoming stays
  const expectedToday = reservations.filter(
    (res) =>
      res.checkInDate === '2026-10-23' &&
      (res.status === 'EXPECTED' || res.status === 'CHECKED_IN')
  );

  const upcomingNext = reservations.filter(
    (res) => res.checkInDate > '2026-10-23'
  );

  // Check In action handler
  const handleCheckIn = (resId: string) => {
    // 1. Locate reservation
    const reservationToUpdate = reservations.find((r) => r.id === resId);
    if (!reservationToUpdate) return;

    const guestName = reservationToUpdate.guestName;
    const roomNumber = reservationToUpdate.roomNo;

    // 2. Update reservation status
    const currentTimeStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    setReservations((prevRes) =>
      prevRes.map((r) =>
        r.id === resId
          ? { ...r, status: 'CHECKED_IN', checkedInTime: currentTimeStr }
          : r
      )
    );

    // 3. Update the corresponding Room as Occupied with the Guest's Name
    setRooms((prevRooms) =>
      prevRooms.map((room) =>
        room.id === roomNumber
          ? {
              ...room,
              status: 'Occupied',
              guestName: guestName,
              subStatus: 'STAYOVER',
              notes: `Checked in at ${currentTimeStr}. ${room.notes}`,
            }
          : room
      )
    );

    // 4. Append team activity logged automatically
    const newActivity: TeamActivity = {
      id: `ACT-NEW-${Date.now()}`,
      staffName: 'Alex (Self)',
      staffAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxGm3a3W-LI8d5QNibA8SrQkNLomr326c1h1GZ4G_reYFV5TA0AZYJfhNbvdqzXSFiQpdvhkavCIIYuoO5nTy4haIBeZ3kKso1Mk1QUkG4uxUgYMdT6j5pucYWUAqFgVHtoKDp87lA743OyVkOwVFHlsU_CjeRkQC9zqOZpNbDRqbTEC-1rmH2BhOHtQhT61niuGcse37BESyodVDdwDRQvcUD7Ajjj3_r7n30a5sXVnusbZ9Gn93ZBK3GlPqYvTqksXFIQuT5tf8',
      action: `checked in guest ${guestName} to Room ${roomNumber}`,
      timeAgo: 'Just now',
      statusType: 'success',
    };

    setActivities((prevAct) => [newActivity, ...prevAct]);
  };

  return (
    <div className="space-y-6">
      
      {/* Week Calendar Header Selector */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-primary">Current Week</h2>
          <button className="text-primary font-bold text-xs uppercase tracking-wider flex items-center gap-1 bg-surface-container-low px-3 py-1.5 rounded-default border border-outline-variant hover:bg-surface-container hover:text-[#000000] cursor-pointer">
            <span>This Week</span>
            <span className="material-symbols-outlined text-lg">expand_more</span>
          </button>
        </div>

        {/* Days Carousel */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1">
          {weekDays.map((day) => {
            const isActive = selectedDay === day.date;
            return (
              <button
                key={day.date}
                onClick={() => setSelectedDay(day.date)}
                className={`flex-shrink-0 w-20 p-4 rounded-lg flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-lg scale-105 select-none'
                    : 'bg-surface-container-lowest text-on-surface border border-outline-variant hover:border-outline card-shadow'
                }`}
              >
                <span className={`text-[10px] font-bold tracking-widest ${isActive ? 'opacity-80' : 'text-on-surface-variant'}`}>
                  {day.label}
                </span>
                <span className="font-display text-2xl font-black mt-1">
                  {day.date}
                </span>
                {isActive && (
                  <div className="w-1.5 h-1.5 bg-on-primary rounded-full mt-2" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Arrivals Grid Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-primary">Those That Have Already Booked</h2>
          <span className="text-[11px] font-bold tracking-widest text-[#5f5e5c] uppercase bg-surface-container-high px-2.5 py-1 rounded-default">
            {expectedToday.filter((r) => r.status === 'EXPECTED').length} Expected
          </span>
        </div>

        {/* Guest Arrival Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {expectedToday.map((res) => {
              const isCheckedIn = res.status === 'CHECKED_IN';
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  key={res.id}
                  className={`rounded-lg p-5 border shadow-sm transition-all duration-200 bg-surface-container-lowest border-[#f4f1ee] flex flex-col justify-between ${
                    isCheckedIn ? 'opacity-70 bg-surface-container-low/55' : 'hover:shadow-md'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          isCheckedIn 
                            ? 'bg-surface-container-highest text-on-surface-variant' 
                            : 'bg-[#f4dfcb] text-[#241a0e] font-semibold'
                        }`}>
                          ROOM {res.roomNo}
                        </span>
                        <h3 className="font-display text-lg font-bold text-primary mt-2.5 leading-snug">
                          {res.guestName}
                        </h3>
                        <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                          {res.roomType}
                        </p>
                      </div>
                      
                      <div className="w-14 h-14 rounded-default overflow-hidden shadow-sm border border-outline-variant/30 flex-shrink-0">
                        <img
                          alt={res.guestName}
                          referrerPolicy="no-referrer"
                          className={`w-full h-full object-cover ${isCheckedIn ? 'grayscale' : ''}`}
                          src={res.guestAvatar}
                        />
                      </div>
                    </div>

                    {/* Metadata details */}
                    <div className="flex items-center gap-4 py-3 border-y border-[#f4f1ee]">
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <span className="material-symbols-outlined text-lg">calendar_today</span>
                        <span className="text-xs font-medium font-sans">{res.dateRange}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <span className="material-symbols-outlined text-lg">group</span>
                        <span className="text-xs font-medium font-sans">{res.numGuests} {res.numGuests === 1 ? 'Guest' : 'Guests'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational actions */}
                  <div className="flex gap-3 pt-4">
                    {isCheckedIn ? (
                      <div className="flex-1 flex items-center justify-between bg-surface-container-high px-4 py-3 rounded-default">
                        <div className="flex items-center gap-1.5 text-[#2e7d32]">
                          <span className="material-symbols-outlined text-xl">check_circle</span>
                          <span className="text-xs font-bold font-sans">Checked In {res.checkedInTime || 'at 11:45 AM'}</span>
                        </div>
                        <button 
                          onClick={() => alert(`Reviewing Front Desk notes for guest ${res.guestName}.`)}
                          className="w-8 h-8 rounded-full hover:bg-surface-container-highest flex items-center justify-center text-primary-fixed-dim"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleCheckIn(res.id)}
                          className="flex-1 py-3 bg-primary text-on-primary rounded-default font-semibold text-xs uppercase tracking-wider hover:bg-black/90 active:scale-95 transition-all cursor-pointer"
                        >
                          CHECK IN
                        </button>
                        <button 
                          onClick={() => {
                            const note = prompt(`Enter reservation notes for ${res.guestName}:`, `Requested extra keys.`);
                            if (note) alert(`Note added: "${note}"`);
                          }}
                          className="w-12 h-12 flex items-center justify-center border border-outline-variant rounded-default hover:bg-surface-container-low transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-primary text-lg">more_horiz</span>
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </section>

      {/* Future Bookings Section */}
      <section className="pt-4 pb-8">
        <h2 className="font-display text-lg font-bold text-primary mb-4">Upcoming (Oct 24)</h2>
        <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-[#f4f1ee] card-shadow">
          {upcomingNext.map((res, index) => (
            <div
              key={res.id}
              className={`flex items-center justify-between p-4 ${
                index < upcomingNext.length - 1 ? 'border-b border-[#f4f1ee]' : ''
              } hover:bg-surface-container-low transition-colors cursor-pointer group`}
              onClick={() => alert(`Selected upcoming stay for ${res.guestName}. Room assigned is ${res.roomNo}.`)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#e5e2df] text-primary rounded-default flex items-center justify-center font-display font-black text-xs">
                  {res.guestName.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <p className="font-display font-bold text-sm text-primary group-hover:text-black transition-colors">
                    {res.guestName}
                  </p>
                  <p className="text-xs text-on-surface-variant font-sans">
                    {res.roomType} • {res.numGuests} Guests • {res.dateRange}
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">
                chevron_right
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Floating Action Button */}
      <button
        onClick={onOpenQuickBooking}
        className="fixed right-6 bottom-24 bg-primary text-on-primary w-14 h-14 rounded-full flex items-center justify-center shadow-xl z-50 hover:scale-105 active:scale-95 transition-all cursor-pointer border-none"
        title="New Reservation"
      >
        <span className="material-symbols-outlined text-2xl font-bold">add</span>
      </button>

    </div>
  );
}
