/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, Dispatch, SetStateAction, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Room, MaintenanceTicket } from '../types';

interface MaintenanceTabProps {
  rooms: Room[];
  tickets: MaintenanceTicket[];
  setRooms: Dispatch<SetStateAction<Room[]>>;
  setTickets: Dispatch<SetStateAction<MaintenanceTicket[]>>;
}

export default function MaintenanceTab({
  rooms,
  tickets,
  setRooms,
  setTickets,
}: MaintenanceTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [newIssue, setNewIssue] = useState('');
  const [newCategory, setNewCategory] = useState<'Urgent' | 'Routine' | 'Facility'>('Routine');
  const [newTicketType, setNewTicketType] = useState<'plumbing' | 'light_off' | 'wifi_off' | 'build'>('plumbing');

  // Dynamic calculated stats (plus baseline offsets matching Mockup)
  const activeTickets = tickets.filter((t) => t.status === 'ACTIVE');
  const activeIssuesCount = activeTickets.length + 9;
  
  const oooRoomsCount = rooms.filter((r) => r.status === 'Out of Order').length + 1;

  // Ticket Operations
  const handleMarkFixed = (ticketId: string, location: string) => {
    // 1. Resolve ticket status
    setTickets((prevTickets) =>
      prevTickets.map((t) => (t.id === ticketId ? { ...t, status: 'RESOLVED' } : t))
    );

    // 2. If it's a Room, change its status back from OOO to Dirty (Needs clean after repair)
    const roomNumber = location.replace('Room ', '').trim();
    const targetRoom = rooms.find((r) => r.id === roomNumber);
    if (targetRoom) {
      setRooms((prevRooms) =>
        prevRooms.map((r) =>
          r.id === roomNumber
            ? {
                ...r,
                status: 'Dirty',
                subStatus: 'IN QUEUE',
                notes: `Refixed following maintenance ticket resolution. ${r.notes}`,
              }
            : r
        )
      );
      alert(`Ticket resolved! ${location} has been returned to Housekeeping in Dirty (In Queue) status.`);
    } else {
      alert(`Facility ticket resolved at ${location}.`);
    }
  };

  const handleBlockRoom = (location: string) => {
    const roomNumber = location.replace('Room ', '').trim();
    const targetRoom = rooms.find((r) => r.id === roomNumber);

    if (targetRoom) {
      setRooms((prevRooms) =>
        prevRooms.map((r) =>
          r.id === roomNumber
            ? { ...r, status: 'Out of Order', subStatus: 'MAINTENANCE' }
            : r
        )
      );
      alert(`${location} blocked. Status changed to Out of Order (OOO).`);
    } else {
      alert(`${location} is a Facility location and cannot be blocked as an inventory room.`);
    }
  };

  // Log custom high-fidelity ticket
  const handleCreateTicket = (e: FormEvent) => {
    e.preventDefault();
    if (!newLocation || !newIssue) return;

    const newTicket: MaintenanceTicket = {
      id: `TCK-${Date.now().toString().slice(-4)}`,
      location: newLocation,
      issue: newIssue,
      type: newTicketType,
      category: newCategory,
      status: 'ACTIVE',
      reportedTime: 'Just now',
      assignedStaff: 'Unassigned',
    };

    setTickets((prev) => [newTicket, ...prev]);

    // If marked urgent & a Room, prompt to block
    if (newCategory === 'Urgent' && newLocation.startsWith('Room ')) {
      const autoBlock = window.confirm(
        `Would you like to automatically take ${newLocation} Out of Order (OOO) due to this urgent ticket?`
      );
      if (autoBlock) {
        setRooms((prevRooms) =>
          prevRooms.map((r) =>
            `Room ${r.id}` === newLocation
              ? { ...r, status: 'Out of Order', subStatus: 'MAINTENANCE' }
              : r
          )
        );
      }
    }

    setShowAddModal(false);
    setNewLocation('');
    setNewIssue('');
  };

  return (
    <div className="space-y-6">
      
      {/* Metrics Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-lg card-shadow border border-[#f4f1ee]">
          <p className="text-on-secondary-container font-semibold text-[11px] uppercase tracking-wider mb-2">
            Active Issues
          </p>
          <p className="font-display text-4xl font-extrabold text-primary">{activeIssuesCount}</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-lg card-shadow border border-[#f4f1ee]">
          <p className="text-on-secondary-container font-semibold text-[11px] uppercase tracking-wider mb-2">
            Out of Order
          </p>
          <p className="font-display text-4xl font-extrabold text-primary">{oooRoomsCount}</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-lg card-shadow border border-[#f4f1ee]">
          <p className="text-on-secondary-container font-semibold text-[11px] uppercase tracking-wider mb-2">
            Avg. Resolve
          </p>
          <p className="font-display text-4xl font-extrabold text-primary">4.2h</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-lg card-shadow border border-[#f4f1ee]">
          <p className="text-on-secondary-container font-semibold text-[11px] uppercase tracking-wider mb-2">
            Staff Online
          </p>
          <p className="font-display text-4xl font-extrabold text-primary">5</p>
        </div>
      </section>

      {/* Maintenance List Logs Header */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="font-display text-2xl font-black text-primary">Maintenance Log</h2>
            <p className="text-on-surface-variant font-sans text-xs mt-0.5">
              Manage and prioritize active facility repairs
            </p>
          </div>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-on-primary px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-black/90 active:scale-95 transition-all cursor-pointer border-none shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Ticket
          </button>
        </div>

        {/* Tickets Checklist */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {activeTickets.map((ticket) => {
              const categoryColors = {
                Urgent: 'bg-[#ffebee] text-[#c62828] font-bold border border-red-100',
                Routine: 'bg-secondary-container text-on-secondary-container font-semibold',
                Facility: 'bg-surface-container-highest text-on-secondary-container font-semibold',
              };

              const ticketIcons = {
                plumbing: 'plumbing',
                light_off: 'lightbulb',
                wifi_off: 'wifi_off',
                build: 'build',
              };

              return (
                <motion.article
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  key={ticket.id}
                  className="bg-surface-container-lowest border border-[#f4f1ee] rounded-lg p-5 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-surface rounded-default flex items-center justify-center flex-shrink-0 border border-[#f4f1ee]">
                      <span className="material-symbols-outlined text-primary text-xl">
                        {ticketIcons[ticket.type as keyof typeof ticketIcons] || 'build'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-display font-extrabold text-base text-primary">
                          {ticket.location}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider ${
                          categoryColors[ticket.category as keyof typeof categoryColors]
                        }`}>
                          {ticket.category}
                        </span>
                      </div>
                      <p className="text-on-surface-variant text-sm mt-1 mb-2 max-w-2xl leading-relaxed font-sans">
                        {ticket.issue}
                      </p>
                      <div className="flex items-center gap-4 text-on-secondary-container text-xs font-sans">
                        <span className="flex items-center gap-1 font-medium">
                          <span className="material-symbols-outlined text-base">schedule</span>
                          Reported {ticket.reportedTime}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <span className="material-symbols-outlined text-base">person</span>
                          Assigned: {ticket.assignedStaff}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-3 self-end md:self-center">
                    <button
                      onClick={() => handleMarkFixed(ticket.id, ticket.location)}
                      className="border border-outline-variant px-4 py-2.5 rounded-lg text-xs font-semibold hover:bg-surface-container transition-colors cursor-pointer text-[#1a1a1a]"
                    >
                      Mark Fixed
                    </button>
                    {ticket.location.startsWith('Room ') && (
                      <button
                        onClick={() => handleBlockRoom(ticket.location)}
                        className="bg-error-container text-on-error-container px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-[#ba1a1a] hover:text-white transition-colors cursor-pointer border-none"
                      >
                        Block Room
                      </button>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      </section>

      {/* Relational Insights Panels */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 pb-8">
        <div className="lg:col-span-2 bg-surface-container-lowest border border-[#f4f1ee] rounded-lg p-5 card-shadow relative overflow-hidden h-[260px] flex flex-col justify-between">
          <div className="relative z-10">
            <h3 className="font-display font-bold text-lg text-primary">Inventory Health</h3>
            <p className="text-on-surface-variant text-sm font-sans mt-0.5">
              Current status of all guest quarters
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1 h-28 bg-[#fbf9f7] rounded-lg border border-[#f4f1ee] flex flex-col items-center justify-center">
              <span className="text-primary font-display text-2xl font-black">94%</span>
              <span className="text-on-secondary-container font-semibold text-[10px] uppercase tracking-wider mt-1">Available</span>
            </div>
            <div className="flex-1 h-28 bg-[#fbf9f7] rounded-lg border border-[#f4f1ee] flex flex-col items-center justify-center">
              <span className="text-error font-display text-2xl font-black">6%</span>
              <span className="text-on-secondary-container font-semibold text-[10px] uppercase tracking-wider mt-1">O.O.O</span>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-surface-container-low rounded-full opacity-50 blur-3xl pointer-events-none" />
        </div>

        {/* Efficiency report widgets */}
        <div className="bg-primary text-on-primary rounded-lg p-5 card-shadow flex flex-col justify-between h-[260px]">
          <div>
            <span className="material-symbols-outlined text-[32px] mb-4 text-[#f4dfcb]">monitoring</span>
            <h3 className="font-display font-bold text-lg text-[#f4dfcb] mb-1">Efficiency Report</h3>
            <p className="text-xs opacity-80 leading-relaxed font-sans">
              Your team has resolved 15% more tickets this week compared to last. Maintenance cost per room is down by UGX 15,000. Well done!
            </p>
          </div>
          <button
            onClick={() => alert("Loading advanced engineering metrics logs...")}
            className="w-full bg-white text-primary py-3 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-opacity-95 transition-all cursor-pointer border-none text-center"
          >
            View Analytics
          </button>
        </div>
      </section>

      {/* Modal - Log New Maintenance Ticket */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-lowest w-full max-w-md rounded-lg overflow-hidden shadow-2xl p-6"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-display text-lg font-black text-primary">Log Maintenance Ticket</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5f5e5c] uppercase tracking-wider mb-1.5">
                  Location (Room No / Area)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Room 102, lobby south"
                  className="w-full bg-surface-container-low border border-[#eae8e4] rounded-lg p-3 text-xs font-medium focus:ring-1 focus:ring-primary"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5f5e5c] uppercase tracking-wider mb-1.5">
                  Issue Description
                </label>
                <textarea
                  required
                  placeholder="Detail the active facility issue..."
                  className="w-full bg-surface-container-low border border-[#eae8e4] rounded-lg p-3 text-xs font-medium focus:ring-1 focus:ring-primary"
                  rows={3}
                  value={newIssue}
                  onChange={(e) => setNewIssue(e.target.value)}
                />
              </div>

              {/* Priority categories */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#5f5e5c] uppercase tracking-wider mb-1.5">
                    Category Priority
                  </label>
                  <select
                    className="w-full bg-surface-container-low border border-[#eae8e4] rounded-lg p-2.5 text-xs font-bold focus:ring-1 focus:ring-primary"
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="Routine">Routine</option>
                    <option value="Facility">Facility</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5f5e5c] uppercase tracking-wider mb-1.5">
                    Ticket Type
                  </label>
                  <select
                    className="w-full bg-surface-container-low border border-[#eae8e4] rounded-lg p-2.5 text-xs font-bold focus:ring-1 focus:ring-primary"
                    value={newTicketType}
                    onChange={(e: any) => setNewTicketType(e.target.value)}
                  >
                    <option value="plumbing">Water / Plumbing</option>
                    <option value="light_off">Lighting / Electrical</option>
                    <option value="wifi_off">Internet / WiFi</option>
                    <option value="build">General / Structural</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border border-outline-variant text-[#5f5e5c] text-xs font-bold rounded-lg hover:bg-surface-container transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary text-on-primary text-xs font-bold rounded-lg hover:bg-black/95 transition-all cursor-pointer border-none shadow-sm"
                >
                  File Ticket
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
