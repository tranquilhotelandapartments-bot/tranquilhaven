/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Room, Reservation, TeamActivity } from '../types';
import { REVENUE_STATS } from '../data';
import { useNotificationSystem } from '../context/NotificationContext';

interface OverviewTabProps {
  rooms: Room[];
  reservations: Reservation[];
  activities: TeamActivity[];
  onSwitchTab: (tabId: string) => void;
  onOpenQuickBooking: () => void;
}

export default function OverviewTab({
  rooms,
  reservations,
  activities,
  onSwitchTab,
  onOpenQuickBooking,
}: OverviewTabProps) {
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Dynamic live stats calculation reflecting state changes
  const liveOccupiedCount = rooms.filter((r) => r.status === 'Occupied').length;
  // Offset to match mockup of 42/54 rooms
  const totalOccupiedCount = liveOccupiedCount + 38;
  const occupancyPercentage = Math.round((totalOccupiedCount / 54) * 100);

  const liveExpectArrivals = reservations.filter((r) => r.status === 'EXPECTED').length;
  // Offset to match mockup of 12 arrivals expected
  const expectedArrivals = liveExpectArrivals + 10;

  // Render recent rooms under tracking
  const roomsToTrack = rooms.filter((r) => ['102', '204', '315'].includes(r.id));

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-on-surface">Overview</h2>
        <p className="text-on-surface-variant font-sans text-sm mt-0.5">
          Welcome back, Alex. Here is what's happening today.
        </p>
      </div>

      {/* Dashboard Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 - Occupancy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-surface-container-lowest p-5 rounded-lg card-shadow border border-[#f4f1ee]"
          id="metric-occupancy"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-default bg-black/5 flex items-center justify-center">
              <span className="material-symbols-outlined text-black">bed</span>
            </div>
            <span className="text-[#2e7d32] bg-[#e8f5e9] px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
              +2.4%
            </span>
          </div>
          <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-1">
            Occupancy
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-extrabold text-primary">{occupancyPercentage}%</span>
            <span className="text-on-surface-variant text-xs font-sans">
              {totalOccupiedCount}/54 Rooms
            </span>
          </div>
        </motion.div>

        {/* Metric 2 - Arrivals */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-surface-container-lowest p-5 rounded-lg card-shadow border border-[#f4f1ee]"
          id="metric-arrivals"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-default bg-black/5 flex items-center justify-center">
              <span className="material-symbols-outlined text-black">login</span>
            </div>
          </div>
          <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-1">
            Total Arrivals
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-extrabold text-primary">{expectedArrivals}</span>
            <span className="text-on-surface-variant text-xs font-sans">Expected today</span>
          </div>
        </motion.div>

        {/* Metric 3 - Departures */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-surface-container-lowest p-5 rounded-lg card-shadow border border-[#f4f1ee]"
          id="metric-departures"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-default bg-black/5 flex items-center justify-center">
              <span className="material-symbols-outlined text-black">logout</span>
            </div>
          </div>
          <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-1">
            Total Departures
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-extrabold text-primary">08</span>
            <span className="text-on-surface-variant text-xs font-sans">Confirmed so far</span>
          </div>
        </motion.div>

        {/* Metric 4 - Daily RevPAR */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-surface-container-lowest p-5 rounded-lg card-shadow border border-[#f4f1ee]"
          id="metric-revpar"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-default bg-black/5 flex items-center justify-center">
              <span className="material-symbols-outlined text-black">payments</span>
            </div>
          </div>
          <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-1">
            Daily RevPAR
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-extrabold text-primary">UGX 800,000</span>
            <span className="text-on-surface-variant text-xs font-sans font-medium">Avg. per room</span>
          </div>
        </motion.div>
      </div>

      {/* Grid Layout: Graph & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Revenue Overview Chart Area */}
        <div className="lg:col-span-8 bg-surface-container-lowest p-5 rounded-lg card-shadow border border-[#f4f1ee] min-h-[340px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-display text-lg font-bold text-primary">Revenue Overview</h3>
              <p className="text-xs text-on-surface-variant">Last 7 days performance</p>
            </div>
            <div className="flex gap-2">
              <span className="bg-surface-container-low px-3 py-1.5 rounded-default text-xs font-semibold border border-outline-variant">
                This Week
              </span>
            </div>
          </div>

          <div className="flex-1 w-full flex items-end justify-between px-2 pt-6 pb-2 min-h-[180px] relative">
            {REVENUE_STATS.map((stat, i) => {
              const maxVal = Math.max(...REVENUE_STATS.map((s) => s.value));
              const heightPct = Math.round((stat.value / maxVal) * 100);
              const isFriday = stat.day === 'Fri';

              return (
                <div
                  key={stat.day}
                  className="flex flex-col items-center w-[11%] relative group"
                  onMouseEnter={() => setHoveredBarIndex(i)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  {/* Custom Tooltip on Hover */}
                  <div
                    className={`absolute -top-12 z-20 bg-primary text-on-primary text-[10px] uppercase tracking-wider font-bold px-2.5 py-1.5 rounded-md transition-all duration-200 pointer-events-none shadow-lg ${
                      hoveredBarIndex === i ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-90'
                    }`}
                  >
                    UGX {stat.value.toLocaleString()}
                  </div>

                  {/* Graph Bar with Rising Animation */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.05 }}
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-default cursor-pointer transition-colors duration-200 ${
                      isFriday ? 'bg-primary' : 'bg-surface-container hover:bg-surface-container-highest'
                    }`}
                  />

                  {/* Day Label */}
                  <span className="text-[10px] text-outline font-bold uppercase tracking-wider mt-3">
                    {stat.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="lg:col-span-4 bg-surface-container-lowest p-5 rounded-lg card-shadow border border-[#f4f1ee]">
          <h3 className="font-display text-lg font-bold text-primary mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3">
            
            {/* Action 1: New Booking */}
            <button
              onClick={onOpenQuickBooking}
              className="w-full flex items-center justify-between p-4 bg-primary text-on-primary rounded-lg hover:bg-black/90 transition-all active:scale-[0.98] cursor-pointer group"
              id="action-new-booking"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xl">add_circle</span>
                <span className="font-sans font-medium text-sm">New Booking</span>
              </div>
              <span className="material-symbols-outlined text-on-primary/50 group-hover:translate-x-1 transition-transform">
                chevron_right
              </span>
            </button>

            {/* Action 2: Check-in Guest */}
            <button
              onClick={() => onSwitchTab('reservations')}
              className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E1DE] text-primary rounded-lg hover:bg-surface-container-low transition-all active:scale-[0.98] cursor-pointer group"
              id="action-checkin-guest"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xl">how_to_reg</span>
                <span className="font-sans font-medium text-sm">Check-in Guest</span>
              </div>
              <span className="material-symbols-outlined text-outline group-hover:translate-x-1 transition-transform">
                chevron_right
              </span>
            </button>

            {/* Action 3: Order Service (Triggers custom alert for high fidelity demo) */}
            <button
              onClick={() => alert("Room Service Suite activated. Ready to take staff service requests.")}
              className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E1DE] text-primary rounded-lg hover:bg-surface-container-low transition-all active:scale-[0.98] cursor-pointer group"
              id="action-order-service"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xl">room_service</span>
                <span className="font-sans font-medium text-sm">Order Service</span>
              </div>
              <span className="material-symbols-outlined text-outline group-hover:translate-x-1 transition-transform">
                chevron_right
              </span>
            </button>

            {/* Action 4: Housekeeping */}
            <button
              onClick={() => onSwitchTab('rooms')}
              className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E1DE] text-primary rounded-lg hover:bg-surface-container-low transition-all active:scale-[0.98] cursor-pointer group"
              id="action-housekeeping"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xl">cleaning_services</span>
                <span className="font-sans font-medium text-sm">Housekeeping</span>
              </div>
              <span className="material-symbols-outlined text-outline group-hover:translate-x-1 transition-transform">
                chevron_right
              </span>
            </button>

          </div>
        </div>
      </div>

      {/* Grid Layout: Room Status & Team Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-8">
        
        {/* Room Status List */}
        <div className="bg-surface-container-lowest p-5 rounded-lg card-shadow border border-[#f4f1ee]">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-display text-lg font-bold text-primary">Room Status Overview</h3>
            <button
              onClick={() => onSwitchTab('rooms')}
              className="text-xs font-semibold text-outline hover:text-primary transition-colors cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {roomsToTrack.map((room) => {
              const badgeColors = {
                'Vacant': 'bg-green-100 text-green-800',
                'Dirty': 'bg-amber-100 text-amber-800',
                'Occupied': 'bg-blue-100 text-blue-800',
                'Out of Order': 'bg-red-100 text-red-800',
              };

              return (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-3.5 rounded-lg hover:bg-surface-container-low transition-all duration-150 border border-transparent hover:border-[#f4f1ee] group cursor-pointer"
                  onClick={() => onSwitchTab('rooms')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-surface rounded-default flex items-center justify-center border border-surface-container-highest group-hover:bg-white transition-colors">
                      <span className="font-display font-black text-sm text-primary">{room.id}</span>
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm text-on-surface">{room.type}</p>
                      <p className="text-xs text-on-surface-variant font-sans">
                        {room.status === 'Occupied' ? `Guest: ${room.guestName || 'Undisclosed'}` : room.subStatus}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeColors[room.status]}`}>
                      {room.status === 'Out of Order' ? 'OOO' : room.status}
                    </span>
                    <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-highest">
                      <span className="material-symbols-outlined text-outline text-lg">more_vert</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Activity Logs */}
        <div className="bg-surface-container-lowest p-5 rounded-lg card-shadow border border-[#f4f1ee]">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-display text-lg font-bold text-primary">Team Activity</h3>
            <button
              onClick={() => alert("All activity log history loaded.")}
              className="text-xs font-semibold text-outline hover:text-primary transition-colors cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-4">
            {activities.map((act) => (
              <div key={act.id} className="flex gap-4">
                <div className="relative flex-shrink-0">
                  <img
                    alt={act.staffName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full border border-surface-container-highest object-cover"
                    src={act.staffAvatar}
                  />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    act.statusType === 'success' ? 'bg-green-500' : 'bg-orange-400'
                  }`} />
                </div>
                <div>
                  <p className="text-xs text-on-surface font-sans">
                    <span className="font-bold">{act.staffName}</span> {act.action}
                  </p>
                  <p className="text-[10px] text-outline font-bold uppercase tracking-wider mt-1">
                    {act.timeAgo}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. ACTIVE NOTIFICATIONS LIVE DASHBOARD WIDGET */}
      <ActiveNotificationsWidget />

    </div>
  );
}

// Extracted Internal Widget for Active Notifications
function ActiveNotificationsWidget() {
  const { notifications } = useNotificationSystem();

  const getMinutesWaiting = (createdAtStr: string): number => {
    const elapsedMs = Date.now() - new Date(createdAtStr).getTime();
    return Math.max(0, Math.floor(elapsedMs / 60000));
  };

  const getSortedActiveNotifications = () => {
    const active = notifications.filter(n => n.status !== 'COMPLETED' && n.status !== 'DISMISSED');
    
    return [...active].sort((a, b) => {
      const elapsedA = Date.now() - new Date(a.createdAt).getTime();
      const elapsedB = Date.now() - new Date(b.createdAt).getTime();
      const isOverdueA = elapsedA >= 600000;
      const isOverdueB = elapsedB >= 600000;

      const score = (n: any, isO: boolean) => {
        if (n.priority === 'CRITICAL' || n.type === 'emergency') return 5;
        if (n.priority === 'URGENT') return 4;
        if (isO) return 3;
        if (n.status === 'PENDING') return 2;
        return 1;
      };

      return score(b, isOverdueB) - score(a, isOverdueA);
    });
  };

  const sortedActive = getSortedActiveNotifications();

  return (
    <div className="bg-surface-container-lowest p-5 rounded-lg card-shadow border border-[#f4f1ee] mt-6 w-full">
      <div className="flex justify-between items-center mb-5 border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
          </span>
          <h3 className="font-display text-base font-black uppercase tracking-wider text-primary">Active Operations Monitor (Live Notifications)</h3>
        </div>
        <span className="text-[10px] bg-zinc-900 text-white font-mono px-2.5 py-1 rounded font-black tracking-widest uppercase">
          LIVE TELEMETRY
        </span>
      </div>

      {sortedActive.length === 0 ? (
        <div className="text-center py-10 bg-zinc-50/10 border border-dashed rounded-xl p-4">
          <p className="text-[11px] font-bold text-zinc-505 uppercase tracking-widest">Pipeline Clear</p>
          <p className="text-[10.5px] text-zinc-400 font-sans mt-1">No active urgent tasks, guest alerts or housekeeping queues pending escalation.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 font-black font-mono text-[9.5px] uppercase tracking-wider bg-zinc-50/50">
                <th className="py-2.5 px-3">Room</th>
                <th className="py-2.5 px-3">Request Type</th>
                <th className="py-2.5 px-3 text-center">Priority</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Assigned User</th>
                <th className="py-2.5 px-3 text-right">Waiting Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sortedActive.map((n) => {
                const waitMins = getMinutesWaiting(n.createdAt);
                const isOverdue = waitMins >= 10;
                
                const priorityBadgeCol = () => {
                  if (n.priority === 'CRITICAL' || n.type === 'emergency') return 'bg-red-50 text-red-700 border-red-200 font-bold';
                  if (n.priority === 'URGENT') return 'bg-orange-50 text-orange-700 border-orange-250';
                  if (n.priority === 'HIGH' || n.type === 'vip') return 'bg-amber-50 text-amber-700 border-amber-250';
                  return 'bg-zinc-100 text-zinc-650';
                };

                const statusBadgeCol = () => {
                  if (n.status === 'PENDING') return 'text-amber-800 bg-amber-50 border border-amber-200';
                  if (n.status === 'ACKNOWLEDGED') return 'text-indigo-800 bg-indigo-50 border border-indigo-200';
                  if (n.status === 'IN_PROGRESS') return 'text-blue-800 bg-blue-50 border border-blue-200';
                  return 'bg-zinc-100 text-zinc-650';
                };

                return (
                  <tr key={n.id} className="hover:bg-zinc-50/20 transition-colors text-[11px] font-sans">
                    <td className="py-3 px-3 font-mono font-bold">
                      {n.roomNumber ? `Suite ${n.roomNumber}` : 'General'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-zinc-900">
                      <div className="space-y-0.5">
                        <span>{n.title}</span>
                        <span className="block text-[9.5px] font-normal text-zinc-500 leading-snug">{n.message}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono border ${priorityBadgeCol()}`}>
                        {n.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${statusBadgeCol()}`}>
                        {n.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-zinc-600 font-medium font-sans">
                      {n.type === 'housekeeping' ? 'Cleaner Assigned' : 'Operations Desk'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-xs text-zinc-805">
                      <span className={isOverdue ? 'text-red-600 animate-pulse' : 'text-zinc-600'}>
                        {waitMins} min{waitMins !== 1 ? 's' : ''} {isOverdue && '⚠️'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
