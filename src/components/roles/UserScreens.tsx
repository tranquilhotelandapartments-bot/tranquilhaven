/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  Room, Reservation, MaintenanceTicket, TeamActivity, UserRole,
  GuestCRM, StockItem, FinancialRecord, VisitorLog, IncidentReport,
  SystemNotification, InternalMessage, WhatsAppLog, RoomStatusType,
  ServiceRequest, ServiceRequestStatus, ServiceRequestPriority
} from '../../types';
import { useNotificationSystem } from '../../context/NotificationContext';
import RoomsTab from '../RoomsTab';
import { 
  Building2, Check, Plus, Search, Trash2, AlertCircle, RefreshCw, 
  Send, CheckCircle, Clock, MapPin, Printer, Download, QrCode, 
  MessageSquare, Briefcase, Coins, FileText, Settings, Shield, 
  PlusCircle, Wrench, ShieldAlert, ChevronRight, Calendar, UserCheck, 
  CheckSquare, Package, AlertTriangle, FilePieChart, TrendingUp,
  Inbox, UserMinus, Sparkles, LogIn, Key, Wifi, Coffee, HelpCircle, UserX, Car, FileSpreadsheet, Upload
} from 'lucide-react';

// ==========================================
// --- ROOM CLEANLINESS & HEALTH ENGINE ---
// ==========================================
export function getRoomHealthStatus(room: Room): 'READY' | 'DIRTY' | 'NEEDS_INSPECTION' | 'DEEP_CLEAN_REQUIRED' {
  if (room.status === 'Dirty') {
    return 'DIRTY';
  }

  // If checkout occurred and room has not been cleaned
  if (room.lastCheckoutDate) {
    const checkoutTime = new Date(room.lastCheckoutDate).getTime();
    const cleanedTime = room.lastCleanedDate ? new Date(room.lastCleanedDate).getTime() : 0;
    if (checkoutTime > cleanedTime) {
      return 'DIRTY';
    }
  }

  // Vacancy tracking rules
  if (room.status === 'Vacant') {
    const today = new Date('2026-06-08');
    const lastUpdateStr = room.lastCheckoutDate || room.lastOccupiedDate || room.lastCleanedDate;
    if (lastUpdateStr) {
      const lastUpdate = new Date(lastUpdateStr);
      const diffTime = today.getTime() - lastUpdate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 7) {
        return 'DEEP_CLEAN_REQUIRED';
      }
      if (diffDays > 2) {
        return 'NEEDS_INSPECTION';
      }
    }
  }

  return 'READY';
}

export function getRoomCleaningPriority(room: Room): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
  const health = getRoomHealthStatus(room);
  if (room.subStatus === 'PRIORITY') return 'URGENT';
  if (health === 'DEEP_CLEAN_REQUIRED') return 'URGENT';
  if (health === 'DIRTY') return 'HIGH';
  if (health === 'NEEDS_INSPECTION') return 'MEDIUM';
  return 'LOW';
}

export function getRoomMetrics(rooms: Room[]) {
  let ready = 0;
  let dirty = 0;
  let awaitingInspection = 0;
  let deepCleanRequired = 0;
  let vacantOver2Days = 0;
  let vacantOver7Days = 0;

  const today = new Date('2026-06-08');

  rooms.forEach(room => {
    const health = getRoomHealthStatus(room);
    if (health === 'READY') ready++;
    if (health === 'DIRTY') dirty++;
    if (health === 'NEEDS_INSPECTION') awaitingInspection++;
    if (health === 'DEEP_CLEAN_REQUIRED') deepCleanRequired++;

    if (room.status === 'Vacant') {
      const refDateStr = room.lastCheckoutDate || room.lastOccupiedDate || room.lastCleanedDate;
      if (refDateStr) {
        const refDate = new Date(refDateStr);
        const diffDays = Math.floor((today.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 7) {
          vacantOver7Days++;
        }
        if (diffDays > 2) {
          vacantOver2Days++;
        }
      }
    }
  });

  return {
    ready,
    dirty,
    awaitingInspection,
    deepCleanRequired,
    vacantOver2Days,
    vacantOver7Days
  };
}

export function LiveServiceRequestsWidget({
  serviceRequests,
  onUpdateServiceRequestStatus,
  onDeleteServiceRequest
}: {
  serviceRequests: ServiceRequest[];
  onUpdateServiceRequestStatus: (id: string, next: ServiceRequestStatus, staff?: string) => void;
  onDeleteServiceRequest?: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'All' | 'Critical' | 'Overdue' | 'Pending' | 'Completed'>('All');
  const [staffInput, setStaffInput] = useState<Record<string, string>>({});

  const priorityWeight = {
    'Critical': 4,
    'Overdue': 3,
    'Attention Needed': 2,
    'Normal': 1
  };

  const statusWeight = {
    'Pending': 4,
    'Accepted': 3,
    'In Progress': 2,
    'Delivered': 1,
    'Closed': 0
  };

  const sortedRequests = [...serviceRequests].sort((a, b) => {
    const unresolvedA = a.status !== 'Delivered' && a.status !== 'Closed' ? 1 : 0;
    const unresolvedB = b.status !== 'Delivered' && b.status !== 'Closed' ? 1 : 0;
    if (unresolvedA !== unresolvedB) return unresolvedB - unresolvedA;

    const pA = priorityWeight[a.priority] || 1;
    const pB = priorityWeight[b.priority] || 1;
    if (pA !== pB) return pB - pA;

    const sA = statusWeight[a.status] || 0;
    const sB = statusWeight[b.status] || 0;
    if (sA !== sB) return sB - sA;

    return b.requestedTimeMs - a.requestedTimeMs;
  });

  const filteredRequests = sortedRequests.filter(sr => {
    if (filter === 'All') return true;
    if (filter === 'Critical') return sr.priority === 'Critical';
    if (filter === 'Overdue') return sr.priority === 'Overdue';
    if (filter === 'Pending') return sr.status === 'Pending' || sr.status === 'Accepted' || sr.status === 'In Progress';
    if (filter === 'Completed') return sr.status === 'Delivered' || sr.status === 'Closed';
    return true;
  });

  const criticalCount = serviceRequests.filter(s => s.priority === 'Critical' && s.status !== 'Delivered' && s.status !== 'Closed').length;
  const overdueCount = serviceRequests.filter(s => s.priority === 'Overdue' && s.status !== 'Delivered' && s.status !== 'Closed').length;
  const unresolvedCount = serviceRequests.filter(s => s.status !== 'Delivered' && s.status !== 'Closed').length;

  return (
    <div id="live-service-requests-board" className="bg-white/60 backdrop-blur-md border border-white/40 p-5 rounded-2xl shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-150 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-zinc-900 text-white rounded-lg">
            <Inbox className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-black text-sm uppercase text-zinc-900 tracking-wide">Live Guest Service Requests</h3>
              {onDeleteServiceRequest && serviceRequests.some(n => n.status === 'Delivered' || n.status === 'Closed') && (
                <button
                  onClick={() => {
                    const completedRequests = serviceRequests.filter(n => n.status === 'Delivered' || n.status === 'Closed');
                    completedRequests.forEach(n => {
                      onDeleteServiceRequest(n.id);
                    });
                  }}
                  className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 px-2 py-0.5 rounded transition-all cursor-pointer font-sans"
                  title="Permanently clear all completed service requests"
                >
                  Clear Fulfilled
                </button>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Real-time status tracking, automated alerts & SLA escalations.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {(['All', 'Critical', 'Overdue', 'Pending', 'Completed'] as const).map(f => {
            const isActive = filter === f;
            let theme = 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200';
            if (isActive) theme = 'bg-zinc-900 text-[#f5f0eb]';
            
            let badge = '';
            if (f === 'Critical' && criticalCount > 0) badge = ` (${criticalCount})`;
            if (f === 'Overdue' && overdueCount > 0) badge = ` (${overdueCount})`;
            if (f === 'Pending' && unresolvedCount > 0) badge = ` (${unresolvedCount})`;

            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${theme}`}
              >
                {f}{badge}
              </button>
            );
          })}
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="py-8 text-center text-zinc-400 text-xs font-sans">
          No service requests matching high-contrast operational status filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map(sr => {
            const minutesWaiting = sr.status === 'Delivered' || sr.status === 'Closed'
              ? 0
              : Math.floor((Date.now() - sr.requestedTimeMs) / 60000);

            let priorityClass = 'bg-blue-50 border-blue-250 text-blue-700';
            if (sr.priority === 'Attention Needed') priorityClass = 'bg-yellow-50 border-yellow-300 text-yellow-850';
            if (sr.priority === 'Overdue') priorityClass = 'bg-orange-50 border border-orange-350 text-orange-800 font-black animate-pulse';
            if (sr.priority === 'Critical') priorityClass = 'bg-red-50 border border-red-300 text-red-700 font-black animate-pulse';

            const isFulfilled = sr.status === 'Delivered' || sr.status === 'Closed';

            return (
              <div key={sr.id} className={`p-4 bg-[#fbfbfb] border rounded-xl space-y-3 relative hover:shadow transition-all ${
                isFulfilled ? 'border-emerald-200/50 bg-emerald-50/5 opacity-80' : 'border-zinc-200'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      isFulfilled ? 'bg-emerald-100 text-emerald-850' : 'bg-zinc-900 text-white'
                    }`}>
                      Room {sr.roomNo}
                    </span>
                    <h4 className={`font-display font-black text-xs mt-1.5 uppercase ${isFulfilled ? 'text-zinc-500 line-through' : 'text-zinc-900'}`}>
                      {sr.requestType}
                    </h4>
                    {sr.details && (
                      <p className={`text-[10px] font-sans leading-relaxed mt-1 ${isFulfilled ? 'text-zinc-400' : 'text-zinc-650'}`}>
                        "{sr.details}"
                      </p>
                    )}
                  </div>

                  <span className={`text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                    isFulfilled ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : priorityClass
                  }`}>
                    {isFulfilled ? 'Fulfilled ✓' : sr.priority}
                  </span>
                </div>

                <div className="text-[9.5px] text-zinc-500 font-sans space-y-1 pt-2 border-t border-dashed border-zinc-200">
                  <div className="flex justify-between">
                    <span>Requested: <strong className="text-zinc-700 font-mono">{sr.requestedAt}</strong></span>
                    {sr.status !== 'Delivered' && sr.status !== 'Closed' && (
                      <span>Time: <strong className="text-zinc-805 font-mono font-bold animate-pulse">{minutesWaiting}m Waiting</strong></span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span>Status: <strong className={`font-sans capitalize ${isFulfilled ? 'text-emerald-700 font-bold' : 'text-zinc-700'}`}>{sr.status}</strong></span>
                    <span>Staff: <strong className="text-zinc-700 font-sans">{sr.assignedStaff}</strong></span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  {!isFulfilled && (
                    <div className="flex gap-1.5 items-center">
                      <label className="text-[9px] text-zinc-500 uppercase font-bold flex-shrink-0">Assign:</label>
                      <select
                        value={sr.assignedStaff !== 'Unassigned' ? sr.assignedStaff : ''}
                        onChange={(e) => {
                          const val = e.target.value || 'Unassigned';
                          onUpdateServiceRequestStatus(sr.id, sr.status, val);
                        }}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5 text-[9.5px] font-medium"
                      >
                        <option value="">-- Unassigned --</option>
                        <option value="Sarah Miller">Sarah Miller (L1)</option>
                        <option value="James Chen">James Chen (Cleaner)</option>
                        <option value="Mike T.">Mike T. (Maintenance)</option>
                        <option value="Marcus Sterling">Marcus Sterling (Manager)</option>
                      </select>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 items-center">
                    {!isFulfilled ? (
                      <>
                        <button
                          onClick={() => onUpdateServiceRequestStatus(sr.id, 'Accepted', sr.assignedStaff)}
                          className={`text-[8.5px] font-bold uppercase py-0.5 px-2 rounded cursor-pointer transition ${
                            sr.status === 'Accepted' ? 'bg-[#a89078] text-[#f5f0eb]' : 'bg-zinc-150 text-zinc-700 hover:bg-zinc-200'
                          }`}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => onUpdateServiceRequestStatus(sr.id, 'In Progress', sr.assignedStaff)}
                          className={`text-[8.5px] font-bold uppercase py-0.5 px-2 rounded cursor-pointer transition ${
                            sr.status === 'In Progress' ? 'bg-amber-600 text-white font-extrabold' : 'bg-zinc-155 text-zinc-700 hover:bg-zinc-200'
                          }`}
                        >
                          Service
                        </button>
                        <button
                          onClick={() => onUpdateServiceRequestStatus(sr.id, 'Delivered', sr.assignedStaff)}
                          className="text-[8.5px] font-black uppercase py-0.5 px-2 rounded cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-sm"
                        >
                          Delivered ✓
                        </button>
                        <button
                          onClick={() => onUpdateServiceRequestStatus(sr.id, 'Closed', sr.assignedStaff)}
                          className="text-[8.5px] font-bold uppercase py-0.5 px-2 rounded cursor-pointer bg-zinc-800 hover:bg-black text-[#f5f0eb] transition ml-auto"
                        >
                          Close
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] text-emerald-805 font-bold font-sans flex items-center gap-1">
                          <CheckSquare className="w-3 h-3 text-emerald-600" /> Fulfilled Order
                        </span>
                        {onDeleteServiceRequest && (
                          <button
                            onClick={() => {
                              onDeleteServiceRequest(sr.id);
                            }}
                            className="text-red-700 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 px-2.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer font-sans ml-auto"
                            title="Permanently Delete request"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            Delete ⌫
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function HousekeepingInspectionWidget({
  rooms,
  onApproveRoomInspection
}: {
  rooms: Room[];
  onApproveRoomInspection: (id: string) => void;
}) {
  const cleanedRooms = rooms.filter(r => r.subStatus === 'CLEANED');

  if (cleanedRooms.length === 0) return null;

  return (
    <div id="housekeeping-approvals" className="bg-amber-50/20 border border-amber-300 p-5 rounded-2xl space-y-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-amber-600 animate-pulse" />
        <div>
          <h3 className="font-display font-black text-sm uppercase text-amber-900 tracking-wide">Housekeeping Completion Approvals</h3>
          <p className="text-[10px] text-amber-800 font-sans">Freshly cleaned rooms requiring front desk inspection and readiness sign-off.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cleanedRooms.map(r => (
          <div key={r.id} className="p-3.5 bg-white border border-dashed border-amber-300 rounded-xl flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block font-mono"> INSPECTION READY</span>
              <strong className="text-sm font-display font-black text-zinc-900">Room {r.id}</strong>
              <p className="text-[10px] text-zinc-500 font-sans mt-0.5">{r.type}</p>
            </div>
            
            <button
              onClick={() => onApproveRoomInspection(r.id)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-lg shadow-sm transition cursor-pointer"
            >
              Approve Readiness
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 1. DIRECTOR SCREEN
// ==========================================
interface DirectorProps {
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  reservations: Reservation[];
  tickets: MaintenanceTicket[];
  guests: GuestCRM[];
  stock: StockItem[];
  financials: FinancialRecord[];
  allNotifications: SystemNotification[];
  messages: InternalMessage[];
  onAddMessage: (text: string) => void;
  onApproveFinancial: (id: string) => void;
  onAddNotification: (n: SystemNotification) => void;
  serviceRequests: ServiceRequest[];
  onUpdateServiceRequestStatus: (id: string, next: ServiceRequestStatus, staff?: string) => void;
  onApproveRoomInspection: (roomId: string) => void;
  onDeleteServiceRequest?: (id: string) => void;
}

export function DirectorScreen({
  rooms,
  setRooms,
  reservations,
  tickets,
  guests,
  stock,
  financials,
  allNotifications,
  messages,
  onAddMessage,
  onApproveFinancial,
  onAddNotification,
  serviceRequests,
  onUpdateServiceRequestStatus,
  onApproveRoomInspection,
  onDeleteServiceRequest
}: DirectorProps) {
  const [msgInput, setMsgInput] = useState('');
  const { deleteNotification, notifications } = useNotificationSystem();
  const [drillDown, setDrillDown] = useState<'reception' | 'housekeeping' | 'maintenance' | 'inventory' | 'finance' | 'staff' | null>(null);
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [activitySearch, setActivitySearch] = useState<string>('');
  const [simulatedDashboard, setSimulatedDashboard] = useState<string | null>(null);

  const { updateUserRole, toggleUserSuspension, postAuditLog, deleteUserAccount } = useAuth();
  const [liveUsersList, setLiveUsersList] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ ...doc.data(), id: doc.id });
      });
      setLiveUsersList(list);
    }, (err) => {
      console.warn("Firestore users collection read issue:", err);
    });
    return () => unsubscribe();
  }, []);

  const [userRoles, setUserRoles] = useState<{ name: string; role: UserRole; status: string }[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('Receptionist');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('Password123!');
  const [isEmailDirty, setIsEmailDirty] = useState(false);
  const [copiedUserEmail, setCopiedUserEmail] = useState<string | null>(null);

  const [liveActivities, setLiveActivities] = useState<any[]>([]);

  // Metrics CALCULATIONS
  const totalRooms = rooms.length;
  const occupiedCount = rooms.filter(r => r.status === 'Occupied').length;
  const occupancyRate = Math.round((occupiedCount / totalRooms) * 100);

  const totalRev = financials.filter(f => f.type === 'Revenue' && f.status === 'Approved').reduce((acc, c) => acc + c.amount, 0);
  const totalExp = financials.filter(f => f.type === 'Expense' && f.status === 'Approved').reduce((acc, c) => acc + c.amount, 0);
  const profitLoss = totalRev - totalExp;

  // ADR & RevPAR (Hypothetically aligned with live occupancy)
  const adr = occupancyRate > 0 ? 1200000 : 0; // Avg Daily Room Rate in UGX
  const revPar = Math.round(adr * (occupancyRate / 100)); // Revenue per available room in UGX

  const pendingApprovals = financials.filter(f => f.status === 'Pending Approval');
  const roomMetrics = getRoomMetrics(rooms);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    onAddMessage(msgInput);
    setMsgInput('');
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    const targetEmail = (newStaffEmail.trim() || `${newStaffName.toLowerCase().replace(/[^a-z0-9]/g, '')}@haven.com`).toLowerCase();
    const targetPassword = newStaffPassword || 'Password123!';

    setUserRoles([...userRoles, { name: newStaffName, role: newStaffRole, status: 'Active' }]);
    try {
      const docRef = doc(db, 'users', `pre:${targetEmail}`);
      await setDoc(docRef, {
        uid: `pre:${targetEmail}`,
        fullName: newStaffName,
        email: targetEmail,
        role: newStaffRole,
        status: 'ACTIVE',
        preProvisionedPassword: targetPassword,
        isPreProvisioned: true,
        branchId: 'BR-LONDON-01',
        createdAt: new Date().toISOString()
      });
      await postAuditLog('STAFF_PRE_PROVISIONED', `Director pre-allocated ${newStaffName} (${targetEmail}) as role [${newStaffRole}]`);
    } catch (err: any) {
      console.warn("Roster write skipped or permissions offline:", err.message);
    }
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffPassword('Password123!');
    setIsEmailDirty(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Executive Overview Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-surface-container-lowest border border-[#f3f0ec] p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Live Occupancy Rate</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-black text-black">{occupancyRate}%</span>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +2.4%
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">Based on {occupiedCount} checked-in rooms out of {totalRooms}</p>
          </div>
          <div className="p-3 bg-neutral-100 rounded-lg text-primary">
            <BedDoubleIcon className="w-6 h-6 text-[#a89078]" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-surface-container-lowest border border-[#f3f0ec] p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Total Branch Revenue</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-black text-black">UGX {totalRev.toLocaleString()}</span>
              <span className="text-[10px] text-zinc-400 font-mono">UGX</span>
            </div>
            <p className="text-[10px] text-zinc-500">Audited cash reserves</p>
          </div>
          <div className="p-3 bg-neutral-100 rounded-lg text-primary">
            <Coins className="w-6 h-6 text-[#a89078]" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-surface-container-lowest border border-[#f3f0ec] p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Net Revenue Profit (P&L)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-black text-emerald-700">UGX {profitLoss.toLocaleString()}</span>
              <span className="text-[10px] text-[#2c7a4b] font-bold uppercase tracking-widest text-[9px] bg-emerald-50 px-1.5 rounded">STABLE</span>
            </div>
            <p className="text-[10px] text-zinc-500">Gross revenue minus UGX {totalExp.toLocaleString()} expenses</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-primary">
            <TrendingUp className="w-6 h-6 text-emerald-700" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-surface-container-lowest border border-[#f3f0ec] p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">RevPAR & ADR Benchmarks</span>
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-xs font-display font-black text-black">RevPAR: UGX {revPar.toLocaleString()}</span>
              <span className="text-xs font-display font-medium text-zinc-650">ADR: UGX {adr.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-zinc-500">Premium class calculations</p>
          </div>
          <div className="p-3 bg-neutral-100 rounded-lg text-primary">
            <FilePieChart className="w-6 h-6 text-[#a89078]" />
          </div>
        </div>
      </div>

      {/* Housekeeping Approvals alert banner */}
      <HousekeepingInspectionWidget 
        rooms={rooms}
        onApproveRoomInspection={onApproveRoomInspection}
      />

      {/* Live Guest Service Requests Console Widget */}
      <LiveServiceRequestsWidget 
        serviceRequests={serviceRequests}
        onUpdateServiceRequestStatus={onUpdateServiceRequestStatus}
        onDeleteServiceRequest={onDeleteServiceRequest}
      />

      {/* GLOBAL OPERATIONS COMMAND CENTER (DIRECTOR WIDGETS & DRILLDOWNS) */}
      <div id="director-command-center" className="bg-[#faf9f6] border border-[#f0ebe1] p-6 rounded-2xl space-y-6">
        <div className="flex justify-between items-center pb-3 border-b border-[#e6decb]">
          <div>
            <h3 className="font-display font-black text-sm uppercase text-zinc-900 tracking-wide">
              Global Operations Command Center
            </h3>
            <p className="text-[11px] text-zinc-650 font-sans mt-0.5">
              Live role console overwatch. Inspect real-time segmented departmental feeds.
            </p>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-855 px-3 py-1 rounded-full font-bold font-mono tracking-wider animate-pulse flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 block animate-ping"></span>
            ADMIN OVERWATCH ACTIVE
          </span>
        </div>

        {/* 6 Grid Widgets */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
          <button
            onClick={() => setDrillDown(drillDown === 'reception' ? null : 'reception')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              drillDown === 'reception' 
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-md scale-[1.01]' 
                : 'bg-white hover:bg-zinc-50 border-zinc-200'
            }`}
          >
            <Calendar className={`w-5 h-5 mb-2 ${drillDown === 'reception' ? 'text-amber-500' : 'text-zinc-500'}`} />
            <h4 className="font-display font-black text-[10px] uppercase tracking-wide">Reception Overview</h4>
            <span className="text-[9px] font-mono opacity-80 mt-1 block">{reservations.length} Booked</span>
          </button>

          <button
            onClick={() => setDrillDown(drillDown === 'housekeeping' ? null : 'housekeeping')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              drillDown === 'housekeeping' 
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-md scale-[1.01]' 
                : 'bg-white hover:bg-zinc-50 border-zinc-200'
            }`}
          >
            <Sparkles className={`w-5 h-5 mb-2 ${drillDown === 'housekeeping' ? 'text-amber-500' : 'text-zinc-500'}`} />
            <h4 className="font-display font-black text-[10px] uppercase tracking-wide">Housekeeping Overview</h4>
            <span className="text-[9px] font-mono opacity-80 mt-1 block">{rooms.filter(r => r.subStatus === 'CLEANED').length} Cleaned</span>
          </button>

          <button
            onClick={() => setDrillDown(drillDown === 'maintenance' ? null : 'maintenance')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              drillDown === 'maintenance' 
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-md scale-[1.01]' 
                : 'bg-white hover:bg-zinc-50 border-zinc-200'
            }`}
          >
            <Wrench className={`w-5 h-5 mb-2 ${drillDown === 'maintenance' ? 'text-amber-500' : 'text-zinc-500'}`} />
            <h4 className="font-display font-black text-[10px] uppercase tracking-wide">Maintenance Overview</h4>
            <span className="text-[9px] font-mono opacity-80 mt-1 block">{tickets.filter(t => t.status === 'ACTIVE').length} Active</span>
          </button>

          <button
            onClick={() => setDrillDown(drillDown === 'inventory' ? null : 'inventory')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              drillDown === 'inventory' 
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-md scale-[1.01]' 
                : 'bg-white hover:bg-zinc-50 border-zinc-200'
            }`}
          >
            <Package className={`w-5 h-5 mb-2 ${drillDown === 'inventory' ? 'text-amber-500' : 'text-zinc-500'}`} />
            <h4 className="font-display font-black text-[10px] uppercase tracking-wide">Inventory Overview</h4>
            <span className="text-[9px] font-mono opacity-80 mt-1 block">Supplies limits met</span>
          </button>

          <button
            onClick={() => setDrillDown(drillDown === 'finance' ? null : 'finance')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              drillDown === 'finance' 
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-md scale-[1.01]' 
                : 'bg-white hover:bg-zinc-50 border-zinc-200'
            }`}
          >
            <Coins className={`w-5 h-5 mb-2 ${drillDown === 'finance' ? 'text-amber-500' : 'text-zinc-500'}`} />
            <h4 className="font-display font-black text-[10px] uppercase tracking-wide">Finance Overview</h4>
            <span className="text-[9px] font-mono opacity-80 mt-1 block">UGX {totalRev.toLocaleString()} Rev Ledger</span>
          </button>

          <button
            onClick={() => setDrillDown(drillDown === 'staff' ? null : 'staff')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              drillDown === 'staff' 
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-md scale-[1.01]' 
                : 'bg-white hover:bg-zinc-50 border-zinc-200'
            }`}
          >
            <UserCheck className={`w-5 h-5 mb-2 ${drillDown === 'staff' ? 'text-amber-500' : 'text-zinc-500'}`} />
            <h4 className="font-display font-black text-[10px] uppercase tracking-wide">Staff Overview</h4>
            <span className="text-[9px] font-mono opacity-80 mt-1 block">{userRoles.length} Roster list</span>
          </button>
        </div>

        {/* Drilldown Sub Panels */}
        {drillDown && (
          <div className="bg-white/60 backdrop-blur-md border border-white/40 p-5 rounded-xl space-y-4 shadow-md animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-150">
              <h4 className="font-display font-black text-xs uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                <ChevronRight className="w-4 h-4 text-amber-600" />
                Segmented Drilldown: <span className="capitalize">{drillDown} Overview</span>
              </h4>
              <button 
                onClick={() => setDrillDown(null)}
                className="text-[10px] text-zinc-500 hover:text-black font-black uppercase tracking-wider cursor-pointer"
              >
                Close Drilldown X
              </button>
            </div>

            {drillDown === 'reception' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                    <h5 className="font-bold text-[10px] text-zinc-800 uppercase tracking-wider">Booked Guests</h5>
                    <div className="divide-y divide-zinc-100 max-h-48 overflow-y-auto">
                      {reservations.map((res, idx) => (
                        <div key={idx} className="py-2 flex justify-between text-[11px] items-center">
                          <span>{res.guestName} (<span className="font-bold text-zinc-800">Room {res.roomNo}</span>)</span>
                          <span className="bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase">{res.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                    <h5 className="font-bold text-[10px] text-zinc-800 uppercase tracking-wider">Checked In Guests CRM</h5>
                    <div className="divide-y divide-zinc-100 max-h-48 overflow-y-auto">
                      {guests.map((g, idx) => (
                        <div key={idx} className="py-2 flex justify-between text-[11px] items-center">
                          <span>{g.fullName} ({g.email})</span>
                          <span className="bg-amber-100 text-amber-900 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">{g.loyaltyPoints} PTS</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {drillDown === 'housekeeping' && (
              <div className="space-y-3">
                <h5 className="font-bold text-[10px] text-zinc-800 uppercase tracking-wider">Housekeeping Turnaround Status Table</h5>
                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b text-zinc-400 font-bold uppercase text-[10px]">
                        <th className="pb-1.5">Suite ID</th>
                        <th className="pb-1.5">Category</th>
                        <th className="pb-1.5">Primary Status</th>
                        <th className="pb-1.5">Inspection / Sub Status</th>
                        <th className="pb-1.5 text-right">Approve</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-zinc-700">
                      {rooms.map(r => (
                        <tr key={r.id} className="hover:bg-zinc-50">
                          <td className="py-2 font-bold text-zinc-900">Room {r.id}</td>
                          <td className="py-2">{r.type}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              r.status === 'Vacant' ? 'bg-zinc-100' : 'bg-amber-50 text-amber-805'
                            }`}>{r.status}</span>
                          </td>
                          <td className="py-2">
                            <span className="font-bold">{r.subStatus}</span>
                          </td>
                          <td className="py-2 text-right">
                            {r.subStatus === 'CLEANED' ? (
                              <button
                                onClick={() => onApproveRoomInspection(r.id)}
                                className="bg-emerald-700 text-white px-2 py-0.5 rounded text-[10px]"
                              >
                                Sign Ready
                              </button>
                            ) : (
                              <span className="text-zinc-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {drillDown === 'maintenance' && (
              <div className="space-y-3">
                <h5 className="font-bold text-[10px] text-zinc-800 uppercase tracking-wider">Hardware & Facilities Service Tickets</h5>
                <div className="divide-y divide-zinc-100 text-[11px] max-h-48 overflow-y-auto">
                  {tickets.map(t => (
                    <div key={t.id} className="py-2.5 flex justify-between items-center">
                      <div>
                        <strong className="text-zinc-900">{t.id} - {t.location}</strong>
                        <p className="text-zinc-500 mt-0.5">"{t.issue}"</p>
                      </div>
                      <span className="bg-orange-50 text-orange-850 border border-orange-200 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {drillDown === 'inventory' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="font-bold text-[10px] text-zinc-800 uppercase tracking-wider">Logistics Stock Control Tracker</h5>
                  <span className="text-[9px] font-mono bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-bold">
                    {stock.length} Items Available
                  </span>
                </div>
                {stock.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No supply items onboarded in stockrooms.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                    {stock.map(s => {
                      const isLow = s.stockCount <= s.minLimit && s.stockCount > 0;
                      const isOut = s.stockCount === 0;
                      return (
                        <div key={s.id} className={`p-3 rounded-lg border flex flex-col justify-between transition-colors ${
                          isOut ? 'bg-red-50/50 border-red-200' : isLow ? 'bg-amber-50/50 border-amber-200' : 'bg-zinc-50/40 border-zinc-150'
                        }`}>
                          <div>
                            <div className="flex justify-between items-start gap-1">
                              <span className="text-[9px] text-zinc-400 font-mono font-bold block">{s.id}</span>
                              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                isOut ? 'bg-red-100 text-red-800 animate-pulse' : isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {isOut ? 'Finished' : isLow ? 'Needs Replacement' : 'In Stock'}
                              </span>
                            </div>
                            <strong className="block text-xs text-zinc-900 mt-1">{s.name}</strong>
                            <span className="text-[9px] text-zinc-500 block">Class: {s.category}</span>
                          </div>
                          
                          <div className="mt-2.5 pt-2 border-t border-dashed border-zinc-200 flex justify-between items-center text-[10px]">
                            <div>
                              <span className="text-zinc-400 block text-[8px] uppercase">Current Stock</span>
                              <span className="font-extrabold text-zinc-800">{s.stockCount} units</span>
                            </div>
                            <div className="text-right">
                              <span className="text-zinc-400 block text-[8px] uppercase">Min Limit</span>
                              <span className="font-mono text-zinc-700 font-bold">{s.minLimit}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {drillDown === 'finance' && (
              <div className="space-y-3">
                <h5 className="font-bold text-[10px] text-zinc-800 uppercase tracking-wider">Segmented Profit and Loss Statement</h5>
                <div className="overflow-x-auto text-[11px] max-h-48 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b text-zinc-400 font-bold text-[10px]">
                        <th className="pb-1.5">Ledger ID</th>
                        <th className="pb-1.5">Action Category</th>
                        <th className="pb-1.5">Allocation Details</th>
                        <th className="pb-1.5 text-right">Amount Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-zinc-700">
                      {financials.map(f => (
                        <tr key={f.id} className="hover:bg-zinc-50">
                          <td className="py-2 font-mono font-bold">{f.id}</td>
                          <td className="py-2">{f.category}</td>
                          <td className="py-2">{f.description}</td>
                          <td className={`py-2 text-right font-bold ${
                            f.type === 'Revenue' ? 'text-emerald-700' : 'text-red-700'
                          }`}>
                            {f.type === 'Revenue' ? '+' : '-'}UGX {f.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {drillDown === 'staff' && (
              <div className="space-y-3">
                <h5 className="font-bold text-[10px] text-zinc-800 uppercase tracking-wider">Active Duty Branch Roster</h5>
                <div className="divide-y divide-zinc-100 max-h-48 overflow-y-auto">
                  {userRoles.map((ur, idx) => (
                    <div key={idx} className="py-2 flex justify-between text-[11px] items-center">
                      <span className="font-bold text-zinc-900">{ur.name}</span>
                      <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase">{ur.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* "Live Hotel Activity" Feeding Panel */}
      <div id="live-hotel-activity-sec" className="bg-white/60 backdrop-blur-md border border-white/40 p-5 rounded-2xl space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary animate-pulse" />
            <h3 className="font-display font-black text-xs uppercase text-zinc-900 tracking-wide">Live Hotel Activity</h3>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {(['all', 'Reservation', 'Check-in', 'Check-out', 'Payment', 'Housekeeping', 'Maintenance', 'Staff', 'Security'] as const).map(cat => {
              const active = activityFilter === cat.toLowerCase() || (cat === 'all' && activityFilter === 'all');
              return (
                <button
                  key={cat}
                  onClick={() => setActivityFilter(cat === 'all' ? 'all' : cat.toLowerCase())}
                  className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider cursor-pointer ${
                    active ? 'bg-black text-[#f5f0eb]' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 scroller">
          {liveActivities
            .filter(act => {
              if (activityFilter === 'all') return true;
              return act.category.toLowerCase() === activityFilter.toLowerCase();
            })
            .map(act => (
              <div key={act.id} className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${act.style}`}>
                <div className="p-1 bg-white rounded-md border shadow-xs flex-shrink-0">
                  {act.icon === 'Calendar' ? <Calendar className="w-3 h-3" /> :
                   act.icon === 'LogIn' ? <LogIn className="w-3 h-3" /> :
                   act.icon === 'UserMinus' ? <UserMinus className="w-3 h-3" /> :
                   act.icon === 'Coins' ? <Coins className="w-3 h-3" /> :
                   act.icon === 'AlertTriangle' ? <AlertTriangle className="w-3 h-3" /> :
                   act.icon === 'CheckSquare' ? <CheckSquare className="w-3 h-3" /> :
                   act.icon === 'Wrench' ? <Wrench className="w-3 h-3" /> :
                   act.icon === 'Package' ? <Package className="w-3 h-3" /> :
                   act.icon === 'UserCheck' ? <UserCheck className="w-3 h-3" /> :
                   act.icon === 'Coffee' ? <Coffee className="w-3 h-3" /> :
                   <ShieldAlert className="w-3 h-3" />}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-900">{act.type}</span>
                    <span className="text-[9px] opacity-60 font-mono font-semibold">{act.time}</span>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed text-zinc-700">{act.desc}</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Main Director Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Analytics & Approvals Desk */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Revenue Chart Simulated SVG */}
          <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#a89078]" />
                <h3 className="font-display font-black text-sm uppercase text-primary">Weekly Revenue & Profit Margin Analysis</h3>
              </div>
              <span className="text-[10px] font-mono bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded font-black">LIVE INDEX</span>
            </div>

            {/* Custom Responsive SVG Step Chart */}
            <div className="w-full h-44 flex flex-col justify-between relative">
              <div className="relative w-full h-32 bg-linear-to-b from-neutral-50/70 to-white rounded-xl border border-zinc-100 flex items-end overflow-hidden shadow-xs">
                {/* Embedded Glassmorphic Hover Card directly inspired by the premium dashboard mockup */}
                <div className="absolute top-2.5 left-[62%] sm:left-[70%] bg-white/90 backdrop-blur-md border border-indigo-100/80 rounded-lg px-2.5 py-1.5 shadow-sm flex items-center gap-1.5 z-10 text-[9px] font-sans antialiased animate-pulse">
                  <span className="w-1.5 h-1.5 bg-[#4f46e5] rounded-full animate-ping"></span>
                  <span className="font-bold text-zinc-900">UGX 62,591</span>
                  <span className="text-emerald-600 font-black font-mono flex items-center gap-0.5">
                    ▲ 45.8%
                  </span>
                </div>

                {/* SVG Area & Curve Chart */}
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <defs>
                    {/* Primary Line Linear Gradient */}
                    <linearGradient id="area-indigo-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                      <stop offset="60%" stopColor="#818cf8" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Secondary Line (Profit) Linear Gradient */}
                    <linearGradient id="area-emerald-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Grid Pattern or Dashed Lines */}
                    <linearGradient id="grid-line" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.2" />
                      <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>

                  {/* Elegant Subtle Horizontal Grid Lines */}
                  <line x1="0" y1="20" x2="100" y2="20" stroke="url(#grid-line)" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="0" y1="40" x2="100" y2="40" stroke="url(#grid-line)" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="0" y1="60" x2="100" y2="60" stroke="url(#grid-line)" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="100" y2="80" stroke="url(#grid-line)" strokeWidth="0.5" strokeDasharray="3 3" />

                  {/* Saturday Active Day Pointer Guide Line */}
                  <line x1="75" y1="0" x2="75" y2="100" stroke="#818cf8" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.8" />

                  {/* Area Fill for Profit */}
                  <path
                    d="M 0,85 C 5,82 10,75 15,75 C 20,75 25,82 30,80 C 35,78 40,65 45,65 C 50,65 55,70 60,68 C 65,66 70,48 75,42 C 80,36 85,55 90,52 C 95,49 98,46 100,45 L 100,100 L 0,100 Z"
                    fill="url(#area-emerald-gradient)"
                  />

                  {/* Area Fill for Gross Turnover (Indigo Gradient Area) */}
                  <path
                    d="M 0,70 C 5,65 10,55 15,55 C 20,55 25,65 30,62 C 35,59 40,42 45,42 C 50,42 55,50 60,48 C 65,46 70,22 75,18 C 80,14 85,34 90,32 C 95,30 98,25 100,24 L 100,100 L 0,100 Z"
                    fill="url(#area-indigo-gradient)"
                  />

                  {/* Beautiful Smooth Bezier Curves (Net Earnings Buffer) */}
                  <path
                    d="M 0,85 C 5,82 10,75 15,75 C 20,75 25,82 30,80 C 35,78 40,65 45,65 C 50,65 55,70 60,68 C 65,66 70,48 75,42 C 80,36 85,55 90,52 C 95,49 98,46 100,45"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />

                  {/* Beautiful Smooth Bezier Curves (Gross Turnover Line) */}
                  <path
                    d="M 0,70 C 5,65 10,55 15,55 C 20,55 25,65 30,62 C 35,59 40,42 45,42 C 50,42 55,50 60,48 C 65,46 70,22 75,18 C 80,14 85,34 90,32 C 95,30 98,25 100,24"
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />

                  {/* Beautiful Glowing Node Markers at vertices for Gross Turnover */}
                  <circle cx="15" cy="55" r="2" fill="#ffffff" stroke="#4f46e5" strokeWidth="1.5" />
                  <circle cx="30" cy="62" r="2" fill="#ffffff" stroke="#4f46e5" strokeWidth="1.5" />
                  <circle cx="45" cy="42" r="2" fill="#ffffff" stroke="#4f46e5" strokeWidth="1.5" />
                  <circle cx="60" cy="48" r="2" fill="#ffffff" stroke="#4f46e5" strokeWidth="1.5" />
                  
                  {/* Sat Active Node with double nesting ring */}
                  <circle cx="75" cy="18" r="4.5" fill="#4f46e5" fillOpacity="0.15" />
                  <circle cx="75" cy="18" r="2.5" fill="#ffffff" stroke="#4f46e5" strokeWidth="2" />

                  <circle cx="90" cy="32" r="2" fill="#ffffff" stroke="#4f46e5" strokeWidth="1.5" />
                </svg>

                {/* Simulated Data Ticks */}
                <div className="absolute inset-0 flex justify-between items-end p-2 text-[8px] font-mono text-zinc-400 select-none pointer-events-none">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span className="font-bold text-[#4f46e5]">Sat</span>
                  <span>Sun</span>
                </div>
              </div>
              <div className="flex gap-4 justify-center text-[10px] uppercase font-bold tracking-wider pt-2">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#4f46e5] rounded-sm block"></span> Gross Turnover</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#10b981] rounded-sm block"></span> Net Earnings Buffer</span>
              </div>
            </div>
          </div>

          {/* Approvals Desk */}
          <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm">
            <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100 flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-amber-600" />
              Director Pending Approvals Desk ({pendingApprovals.length})
            </h3>

            {pendingApprovals.length === 0 ? (
              <div className="p-8 text-center bg-zinc-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-zinc-600">All operations approved. Ledger is balanced.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.map(p => (
                  <div key={p.id} className="p-3.5 bg-amber-50/40 border border-amber-200/60 rounded-xl flex items-center justify-between gap-4 animate-fade-in">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded uppercase font-mono tracking-wider">
                          {p.category}
                        </span>
                        <span className="text-xs font-bold text-zinc-800">UGX {p.amount.toLocaleString()} allocation</span>
                      </div>
                      <p className="text-[11px] text-zinc-600 leading-normal font-sans font-medium">{p.description}</p>
                      <p className="text-[9px] font-mono text-zinc-400">Timestamp: {p.timestamp}</p>
                    </div>

                    <button
                      onClick={() => onApproveFinancial(p.id)}
                      className="bg-black hover:bg-neutral-800 text-[#f5f0eb] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 flex-shrink-0 cursor-pointer"
                    >
                      Authorize Sign
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audited Staff & Branch Listings */}
          <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm">
            <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100 flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-[#a89078]" />
              Staff Roll & Role-Permissions Table
            </h3>
            {/* Add Staff form */}
            <form onSubmit={handleAddStaff} className="flex flex-col lg:flex-row gap-3 mb-5 items-end bg-[#faf7f3] p-4 rounded-xl border border-[#ede7df] w-full">
              <div className="flex-1 w-full space-y-1">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Staff Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Emma Vance"
                  value={newStaffName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewStaffName(val);
                    if (!isEmailDirty) {
                      const slug = val.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                      setNewStaffEmail(slug ? `${slug}@haven.com` : '');
                    }
                  }}
                  className="w-full bg-white border border-zinc-200 px-3 py-1.5 rounded text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex-1 w-full space-y-1">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Login Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="E.g. emmavance@haven.com"
                  value={newStaffEmail}
                  onChange={(e) => {
                    setNewStaffEmail(e.target.value);
                    setIsEmailDirty(true);
                  }}
                  className="w-full bg-white border border-zinc-200 px-3 py-1.5 rounded text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="w-full lg:w-36 space-y-1">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Security Key/Pass</label>
                <input
                  type="text"
                  required
                  placeholder="Secret Key"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  className="w-full bg-white border border-zinc-200 px-3 py-1.5 rounded text-xs focus:ring-1 focus:ring-primary outline-none font-mono"
                />
              </div>

              <div className="w-full lg:w-44 space-y-1">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Assigned RBAC Role</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as UserRole)}
                  className="w-full bg-white border border-zinc-200 px-1.5 py-1.5 rounded text-xs outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Director">Director</option>
                  <option value="Manager">Manager</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Maintenance Officer">Maintenance (Staff)</option>
                  <option value="Accountant">Accountant (Staff)</option>
                  <option value="Inventory Officer">Inventory (Staff)</option>
                  <option value="Security Officer">Security (Staff)</option>
                  <option value="Guest">Guest</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full lg:w-auto bg-primary text-on-primary px-4 py-1.5 rounded font-black text-xs uppercase tracking-wider h-[32px] hover:bg-black transition-all cursor-pointer shadow-xs shrink-0"
              >
                Onboard
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-400">
                    <th className="pb-2">Onboarded Member</th>
                    <th className="pb-2">Assigned Role</th>
                    <th className="pb-2">Login Credentials</th>
                    <th className="pb-2">Secure Security Clearance</th>
                    <th className="pb-2 text-right">Status State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
                  {(liveUsersList.length > 0 
                    ? liveUsersList.map(u => ({ 
                        name: u.fullName || u.email, 
                        role: u.role, 
                        status: u.status || 'ACTIVE', 
                        uid: u.uid,
                        email: u.email,
                        preProvisionedPassword: u.preProvisionedPassword,
                        isPreProvisioned: u.isPreProvisioned,
                        isOnline: u.isOnline,
                        lastActive: u.lastActive
                      }))
                    : userRoles.map(ur => ({ 
                        name: ur.name, 
                        role: ur.role, 
                        status: ur.status === 'Active' ? 'ACTIVE' : 'SUSPENDED', 
                        uid: '',
                        email: `${ur.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@haven.com`,
                        preProvisionedPassword: 'Password123!',
                        isPreProvisioned: true,
                        isOnline: false,
                        lastActive: null
                      }))
                  ).map((user, i) => (
                    <tr key={i} className="hover:bg-zinc-50/52">
                      <td className="py-2.5 font-bold text-zinc-900">{user.name}</td>
                      <td className="py-2.5">
                        {user.uid && !user.uid.startsWith('pre:') ? (
                           <select
                             value={user.role}
                             onChange={(e) => updateUserRole(user.uid, e.target.value as any)}
                             className="text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                           >
                             <option value="Director">Director</option>
                             <option value="Manager">Manager</option>
                             <option value="Receptionist">Receptionist</option>
                             <option value="Maintenance Officer">Maintenance</option>
                             <option value="Accountant">Accountant</option>
                             <option value="Inventory Officer">Inventory</option>
                             <option value="Security Officer">Security</option>
                             <option value="Guest">Guest</option>
                           </select>
                        ) : (
                           <span className="text-[10px] font-bold bg-[#f5f0eb] text-zinc-800 px-2 py-0.5 rounded">
                             {user.role}
                           </span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <div className="flex flex-col pr-4">
                          <span className="text-zinc-650 font-medium font-mono text-[11px]">{user.email}</span>
                          {user.isPreProvisioned || user.preProvisionedPassword ? (
                            <span className="text-[10px] text-[#a89078] font-sans mt-0.5">
                              Password: <code className="bg-amber-50 rounded px-1 text-[10px] font-bold border border-amber-200">{user.preProvisionedPassword || 'Password123!'}</code>
                            </span>
                          ) : (
                            <span className="text-[9.5px] text-zinc-400 font-sans block mt-0.5">Registered via Auth Portal</span>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const credsText = `Email: ${user.email}\nPassword: ${user.preProvisionedPassword || 'Password123!'}\nRole: ${user.role}`;
                                navigator.clipboard.writeText(credsText);
                                setCopiedUserEmail(user.email);
                                setTimeout(() => setCopiedUserEmail(null), 2000);
                              }}
                              className="text-[9.5px] uppercase font-black text-[#a89078] hover:text-black hover:underline transition-all flex items-center gap-1 cursor-pointer"
                            >
                              {copiedUserEmail === user.email ? (
                                <span className="text-emerald-600">✓ Copied!</span>
                              ) : (
                                <span>📋 Copy Info</span>
                              )}
                            </button>

                            {user.isOnline ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[9.5px] font-bold px-1.5 py-0.5 rounded border border-emerald-200 animate-pulse">
                                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                ACTIVE (Using Account)
                              </span>
                            ) : user.lastActive ? (
                              <span className="text-[9.5px] text-zinc-500 font-sans">
                                Offline (Last seen: {new Date(user.lastActive).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
                              </span>
                            ) : (
                              <span className="text-[9.5px] text-zinc-400 font-sans">
                                Offline
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 font-mono text-[10px]">
                        {user.role === 'Director' ? 'LEVEL-3 FULL_ROOT' : user.role === 'Manager' ? 'LEVEL-2 OVERWATCH' : 'LEVEL-1 SEGMENTED'}
                      </td>
                      <td className="py-2.5 text-right font-semibold">
                        {user.uid && !user.uid.startsWith('pre:') ? (
                          <div className="flex justify-end gap-1.5 animate-fade-in">
                            <button
                              onClick={() => toggleUserSuspension(user.uid, user.status as any)}
                              className={`px-2 py-1 rounded text-[10px] uppercase font-bold cursor-pointer transition-all border ${
                                user.status === 'ACTIVE' 
                                  ? 'bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-neutral-800 hover:text-white' 
                                  : 'bg-red-50 border-red-250 text-red-700 hover:bg-[#a89078] hover:text-white animate-pulse'
                              }`}
                              title="Toggle suspension status"
                            >
                              {user.status === 'ACTIVE' ? 'Active ✓' : 'Suspended ⚡'}
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Are you absolutely sure you want to delete ${user.name}'s account and revoke access completely?`)) {
                                  await deleteUserAccount(user.uid);
                                }
                              }}
                              className="px-2 py-1 rounded text-[10px] uppercase font-bold cursor-pointer transition-all border bg-red-50 border-red-250 text-red-700 hover:bg-red-800 hover:text-white"
                              title="Delete account"
                            >
                              Delete ⌫
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2 items-center">
                            <span className="text-amber-800 font-black uppercase text-[10px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Pre-Provisioned</span>
                            {user.uid && (
                              <button
                                onClick={async () => {
                                  if (confirm(`Are you sure you want to delete this pre-provisioned roster entry?`)) {
                                    await deleteUserAccount(user.uid);
                                  }
                                }}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer border border-[#f5ccd3] bg-[#fdf2f4] text-[#a83244] hover:bg-red-800 hover:text-white transition-colors"
                                title="Delete pre-provision roster"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Side: System messaging thread & Audit Log */}
        <div className="space-y-6">
          {/* Internal Messaging Sandbox */}
          <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm flex flex-col h-[350px]">
            <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#a89078]" />
              Internal Radio Thread (Global Hub)
            </h3>

            {/* Message thread container */}
            <div className="flex-1 overflow-y-auto my-3 space-y-2.5 pr-2 scroller">
              {messages.map(m => (
                <div key={m.id} className="text-xs space-y-0.5">
                  <div className="flex justify-between font-bold text-[10px] text-zinc-500">
                    <span>{m.senderName} ({m.senderRole})</span>
                    <span className="font-mono text-[9px]">{m.timestamp}</span>
                  </div>
                  <p className="bg-[#fcf9f5] border border-zinc-100 p-2.5 rounded-lg text-zinc-800 leading-normal font-sans font-medium">
                    {m.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Input message form */}
            <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-zinc-100">
              <input
                type="text"
                placeholder="Broadcast standard operational guidelines..."
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
              />
              <button
                type="submit"
                className="bg-black text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Persistent Hierarchical System Activity Alarms  */}
          <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
              <h3 className="font-display font-black text-xs uppercase text-primary flex items-center gap-2">
                <Bell className="w-4 h-4 text-red-600 animate-pulse" />
                Director Audits Panel (Root Level-3)
              </h3>
              <div className="flex items-center gap-2">
                {notifications.some(n => n.status === 'COMPLETED' || n.status === 'DISMISSED') && (
                  <button
                    onClick={() => {
                      const completedNotifs = notifications.filter(n => n.status === 'COMPLETED' || n.status === 'DISMISSED');
                      completedNotifs.forEach(n => {
                        deleteNotification(n.id, 'Alex Mercer', 'Director');
                      });
                    }}
                    className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 px-2 py-0.5 rounded transition-all cursor-pointer font-sans"
                    title="Permanently clear all completed alerts"
                  >
                    Clear Completed
                  </button>
                )}
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 rounded-full font-mono">ROOT</span>
              </div>
            </div>

            <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-zinc-500 font-sans text-[11px] bg-zinc-50 border border-dashed rounded-lg">
                  No active operational notifications.
                </div>
              ) : (
                notifications.map(n => {
                  const isCompleted = n.status === 'COMPLETED' || n.status === 'DISMISSED';
                  return (
                    <div key={n.id} className={`p-3 border rounded-xl text-[11px] leading-relaxed relative flex flex-col justify-between gap-1.5 transition-all ${
                      isCompleted 
                        ? 'bg-emerald-50/10 border-emerald-200/30 opacity-75' 
                        : 'bg-red-50/20 border-red-200/40'
                    }`}>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          {isCompleted ? (
                            <span className="font-bold uppercase text-emerald-800 text-[9px] tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                              <CheckSquare className="w-2.5 h-2.5 text-emerald-650" /> Completed
                            </span>
                          ) : (
                            <span className="font-bold uppercase text-red-900 text-[9px] tracking-wider bg-red-50 border border-red-200 px-2 py-0.5 rounded">{n.urgency}</span>
                          )}
                          <span className="text-[9px] font-mono text-zinc-405 font-bold">{n.id}</span>
                        </div>
                        <h4 className={`font-bold font-display mb-0.5 text-[11.5px] ${isCompleted ? 'text-zinc-500 line-through' : 'text-zinc-900'}`}>{n.title}</h4>
                        <p className={`font-sans font-medium ${isCompleted ? 'text-zinc-500' : 'text-zinc-700'}`}>{n.text}</p>
                      </div>
                      <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-dashed border-zinc-150">
                        <span className="text-[9.5px] text-zinc-550 font-bold font-mono">LEVEL: {n.level}</span>
                        <button
                          onClick={() => {
                            if (isCompleted || window.confirm("Permanently delete this active notification?")) {
                              deleteNotification(n.id, 'Alex Mercer', 'Director');
                            }
                          }}
                          className={`border px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer font-sans ${
                            isCompleted
                              ? 'text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 border-emerald-200 font-bold'
                              : 'text-red-700 hover:text-white bg-red-50 hover:bg-red-600 border-red-200'
                          }`}
                          title="Permanently Delete notification"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete ⌫
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Keep system baseline audits as reference items */}
              <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg text-[11px] leading-relaxed">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold uppercase text-zinc-700 text-[10px] tracking-wider">Root Configuration Saved</span>
                  <span className="text-[9px] text-zinc-400">1h ago</span>
                </div>
                <p className="text-[#555] font-sans font-medium">Branch parameters validated. Automatic WhatsApp business token refreshed globally with TLS-1.3 constraints.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ==========================================
// 2. MANAGER SCREEN
// ==========================================
interface ManagerProps {
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  reservations: Reservation[];
  tickets: MaintenanceTicket[];
  stock: StockItem[];
  setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
  financials: FinancialRecord[];
  onPostFinancial: (record: FinancialRecord) => void;
  allNotifications: SystemNotification[];
  messages: InternalMessage[];
  onAddMessage: (text: string) => void;
  onApproveTicket: (id: string) => void;
  onRequestRestock: (id: string) => void;
  serviceRequests: ServiceRequest[];
  onUpdateServiceRequestStatus: (id: string, next: ServiceRequestStatus, staff?: string) => void;
  onApproveRoomInspection: (roomId: string) => void;
  onDeleteServiceRequest?: (id: string) => void;
}

export function ManagerScreen({
  rooms,
  setRooms,
  reservations,
  tickets,
  stock,
  setStock,
  financials,
  onPostFinancial,
  allNotifications,
  messages,
  onAddMessage,
  onApproveTicket,
  onRequestRestock,
  serviceRequests,
  onUpdateServiceRequestStatus,
  onApproveRoomInspection,
  onDeleteServiceRequest
}: ManagerProps) {
  const [msgInput, setMsgInput] = useState('');
  const { deleteNotification } = useNotificationSystem();
  const [selectedTopic, setSelectedTopic] = useState<'ops' | 'rooms' | 'housekeeping' | 'tickets' | 'inventory'>('ops');

  // Manual stock management states
  const [invAction, setInvAction] = useState<'list' | 'buy' | 'add_new'>('list');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [qtyBought, setQtyBought] = useState('');
  const [unitCost, setUnitCost] = useState('');
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'Housekeeping' | 'Kitchen' | 'Restaurant' | 'Bar' | 'Maintenance'>('Housekeeping');
  const [newItemCount, setNewItemCount] = useState('');
  const [newItemMin, setNewItemMin] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  const pendingTickets = tickets.filter(t => t.status === 'ACTIVE');
  const lowStockItems = stock.filter(s => s.stockCount <= s.minLimit);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    onAddMessage(msgInput);
    setMsgInput('');
  };

  const handleManualBuyStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockId || !qtyBought || !unitCost) {
      alert("Please fill in all purchasing form information.");
      return;
    }
    const targetItem = stock.find(s => s.id === selectedStockId);
    if (!targetItem) return;

    const addedQty = Number(qtyBought);
    const costPerUnit = Number(unitCost);

    if (isNaN(addedQty) || addedQty <= 0) {
      alert("Please input a valid quantity bought.");
      return;
    }
    if (isNaN(costPerUnit) || costPerUnit < 0) {
      alert("Please input a valid unit price/cost.");
      return;
    }

    // Update stock count
    setStock(prev => prev.map(s => s.id === selectedStockId ? { ...s, stockCount: s.stockCount + addedQty, price: costPerUnit } : s));

    // Post expense to financials
    const fLog: FinancialRecord = {
      id: `TX-${Date.now().toString().slice(-4)}`,
      type: 'Expense',
      amount: costPerUnit * addedQty,
      category: 'Inventory Purchase',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      description: `Manager purchase: ${targetItem.name} (+${addedQty} units bought)`,
      status: 'Approved'
    };
    onPostFinancial(fLog);

    alert(`Successfully registered purchase of ${addedQty} ${targetItem.name} for the hotel database!`);
    
    // Clear inputs
    setSelectedStockId('');
    setQtyBought('');
    setUnitCost('');
    setInvAction('list');
  };

  const handleManualAddNewStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemCount || !newItemMin || !newItemPrice) {
      alert("Please fill in all stock parameters to onboard.");
      return;
    }

    const countNum = Number(newItemCount);
    const minNum = Number(newItemMin);
    const priceNum = Number(newItemPrice);

    if (isNaN(countNum) || countNum < 0) {
      alert("Please enter a valid stock level count.");
      return;
    }
    if (isNaN(minNum) || minNum < 0) {
      alert("Please enter a valid threshold limit.");
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      alert("Please enter a valid unit price.");
      return;
    }

    const newId = `STK-${Date.now().toString().slice(-3)}`;
    const newItem: StockItem = {
      id: newId,
      name: newItemName.trim(),
      category: newItemCategory,
      stockCount: countNum,
      minLimit: minNum,
      price: priceNum
    };

    // Update stock array
    setStock(prev => [...prev, newItem]);

    // Post corresponding expense to finances
    if (countNum > 0) {
      const fLog: FinancialRecord = {
        id: `TX-${Date.now().toString().slice(-4)}`,
        type: 'Expense',
        amount: priceNum * countNum,
        category: 'Inventory Purchase',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        description: `Manager stock room onboarding: ${newItem.name} (${countNum} init units)`,
        status: 'Approved'
      };
      onPostFinancial(fLog);
    }

    alert(`Successfully onboarded new supply item "${newItem.name}" to inventory catalog!`);

    // Reset fields
    setNewItemName('');
    setNewItemCategory('Housekeeping');
    setNewItemCount('');
    setNewItemMin('');
    setNewItemPrice('');
    setInvAction('list');
  };

  const handleAdjustStockCount = (itemId: string, direction: 'increase' | 'decrease') => {
    setStock(prev => prev.map(s => {
      if (s.id === itemId) {
        const diff = direction === 'increase' ? 1 : -1;
        const nextCount = Math.max(0, s.stockCount + diff);
        return { ...s, stockCount: nextCount };
      }
      return s;
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quick stats ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#f3f0ec] p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Operational Tickets</span>
            <span className="text-2xl font-black font-display text-red-600">{pendingTickets.length} Pending</span>
            <p className="text-[10px] text-zinc-500 font-sans">Requires active dispatching</p>
          </div>
          <Wrench className="w-8 h-8 text-red-600" />
        </div>
        
        <div className="bg-white border border-[#f3f0ec] p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Out of Order Rooms</span>
            <span className="text-2xl font-black font-display text-amber-600">{rooms.filter(r => r.status === 'Out of Order').length} Units</span>
            <p className="text-[10px] text-zinc-500 font-sans">Awaiting technical clearance</p>
          </div>
          <ShieldAlert className="w-8 h-8 text-amber-600" />
        </div>

        <div className="bg-white border border-[#f3f0ec] p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Low Stock Alarms</span>
            <span className="text-2xl font-black font-display text-amber-600">{lowStockItems.length} Warnings</span>
            <p className="text-[10px] text-zinc-500 font-sans">Auto purchase-orders queued</p>
          </div>
          <Package className="w-8 h-8 text-amber-600" />
        </div>

        <div className="bg-white border border-[#f3f0ec] p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Pending Guest Checkins</span>
            <span className="text-2xl font-black font-display text-zinc-800">{reservations.filter(r => r.status === 'EXPECTED').length} Expected</span>
            <p className="text-[10px] text-zinc-500 font-sans">Dignitary status active</p>
          </div>
          <Calendar className="w-8 h-8 text-zinc-800" />
        </div>
      </div>

      {/* Navigation sub-tabs */}
      <div className="flex gap-2 border-b border-zinc-200 pb-2 overflow-x-auto no-scrollbar">
        {(['ops', 'rooms', 'housekeeping', 'tickets', 'inventory'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedTopic(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all whitespace-nowrap ${
              selectedTopic === tab 
                ? 'bg-black text-[#f5f0eb]' 
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
            }`}
          >
            {tab === 'ops' ? 'Operations Overview' : tab === 'rooms' ? 'Room Directory' : tab === 'housekeeping' ? 'Housekeeping Guard' : tab === 'tickets' ? 'Repairs Backlog' : 'Inventory Logs'}
          </button>
        ))}
      </div>

      {/* Real-time Service & Inspection Alerts */}
      <HousekeepingInspectionWidget rooms={rooms} onApproveRoomInspection={onApproveRoomInspection} />
      <LiveServiceRequestsWidget serviceRequests={serviceRequests} onUpdateServiceRequestStatus={onUpdateServiceRequestStatus} onDeleteServiceRequest={onDeleteServiceRequest} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {selectedTopic === 'rooms' && (
            <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
              <div className="border-b border-zinc-100 pb-2">
                <h3 className="font-display font-black text-sm uppercase text-primary">
                  Authorized Room Directory Manager
                </h3>
                <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Authorised level-two overwatch permissions to add new room structures, customize layouts, or clear stale metadata.</p>
              </div>
              <RoomsTab rooms={rooms} setRooms={setRooms} />
            </div>
          )}

          {selectedTopic === 'ops' && (
            <div className="space-y-6">
              {/* Operations Live Board */}
              <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm">
                <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100 mb-4 flex justify-between items-center">
                  <span>Room Assignment Matrix over-watch</span>
                  <span className="text-[9px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase font-mono">AUTOMATED ALLOCATION</span>
                </h3>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {rooms.map(r => (
                    <div 
                      key={r.id} 
                      className={`p-3 rounded-lg border text-center space-y-1 ${
                        r.status === 'Occupied' 
                          ? 'bg-zinc-900 text-white border-zinc-900' 
                          : r.status === 'Dirty' 
                            ? 'bg-[#fbf4f0]-50 border-amber-200' 
                            : r.status === 'Out of Order'
                              ? 'bg-red-50 border-red-200 text-red-900'
                              : 'bg-zinc-50 border-zinc-100 text-zinc-800'
                      }`}
                    >
                      <span className="text-xs font-display font-black block">No. {r.id}</span>
                      <span className="text-[8px] uppercase tracking-wider font-bold block truncate">{r.type}</span>
                      <span className={`text-[8.5px] font-mono inline-block px-1 rounded ${
                        r.status === 'Occupied' ? 'bg-amber-100 text-zinc-900' : 'bg-black/10'
                      }`}>
                        {r.subStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Approvals center for purchase orders */}
              <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm">
                <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100 mb-4">
                  Approvals Center - Supply Restock Requests
                </h3>

                {lowStockItems.length === 0 ? (
                  <div className="p-6 text-center bg-zinc-50 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-zinc-650">All branch logistics supplies are optimally pre-stocked.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100 text-xs">
                    {lowStockItems.map(item => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-zinc-850">{item.name} ({item.category})</p>
                          <p className="text-[10px] text-amber-600 font-semibold">Low Stock Alert: {item.stockCount} left (Minimum threshold: {item.minLimit})</p>
                        </div>
                        <button
                          onClick={() => onRequestRestock(item.id)}
                          className="bg-zinc-900 hover:bg-black text-[#f5f0eb] text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded cursor-pointer"
                        >
                          Approve Purchase
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTopic === 'housekeeping' && (
            <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
              <h3 className="font-display font-black text-sm uppercase text-primary pb-2 border-b border-zinc-100">
                Housekeeping Turnaround Oversight & Room Statuses
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-400">
                      <th className="pb-2">Room</th>
                      <th className="pb-2">Room Class</th>
                      <th className="pb-2">State</th>
                      <th className="pb-2">Assignment Phase</th>
                      <th className="pb-2">Operational Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
                    {rooms.map(r => (
                      <tr key={r.id}>
                        <td className="py-2.5 font-bold text-zinc-900">Room {r.id}</td>
                        <td className="py-2.5">{r.type}</td>
                        <td className="py-2.5">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                            r.status === 'Vacant' ? 'bg-zinc-100 text-zinc-700' : r.status === 'Occupied' ? 'bg-zinc-900 text-white' : 'bg-amber-100 text-amber-900'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className="font-mono text-[10px] text-[#a89078] font-bold">{r.subStatus}</span>
                        </td>
                        <td className="py-2.5 text-zinc-500 text-[10px] italic leading-normal font-medium">{r.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedTopic === 'tickets' && (
            <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
              <h3 className="font-display font-black text-sm uppercase text-primary pb-2 border-b border-zinc-100">
                Active Maintenance Dispatch Console ({tickets.filter(t => t.status === 'ACTIVE').length})
              </h3>

              <div className="space-y-2">
                {tickets.map(t => (
                  <div key={t.id} className="p-3 bg-[#fcf9f5] border border-[#f3f0ec] rounded-lg flex justify-between items-center gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-zinc-850">{t.location}</span>
                        <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 rounded-full ${
                          t.category === 'Urgent' ? 'bg-red-100 text-red-800' : 'bg-zinc-100 text-zinc-700'
                        }`}>{t.category}</span>
                      </div>
                      <p className="text-[11px] text-zinc-650 font-sans font-medium">{t.issue}</p>
                      <p className="text-[9px] font-mono text-zinc-400">Assigned Technician: {t.assignedStaff} | Flagged: {t.reportedTime}</p>
                    </div>

                    {t.status === 'ACTIVE' && (
                      <button
                        onClick={() => onApproveTicket(t.id)}
                        className="bg-zinc-100 hover:bg-emerald-50 hover:text-emerald-800 border border-zinc-200 rounded text-[10px] font-extrabold uppercase px-3 py-1 cursor-pointer"
                      >
                        Sign Complete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTopic === 'inventory' && (
            <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-5 animate-fade-in">
              <div className="border-b border-zinc-150 pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h3 className="font-display font-black text-sm uppercase text-primary">
                    Hotel Stockroom & Inventory Director-Overwatch
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                    Manually log purchases, track consumed items, monitor depleted limits, and register bought replacements.
                  </p>
                </div>
                
                {/* Control Toggles */}
                <div className="flex gap-1 bg-zinc-100 p-1 rounded-lg self-start sm:self-center">
                  {(['list', 'buy', 'add_new'] as const).map(action => (
                    <button
                      key={action}
                      onClick={() => setInvAction(action)}
                      className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                        invAction === action 
                          ? 'bg-zinc-900 text-white shadow-xs' 
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {action === 'list' ? 'Inventory Grid' : action === 'buy' ? 'Log Bought Supply' : 'Onboard New Supply'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action 1: Inventory Grid List */}
              {invAction === 'list' && (
                <div className="space-y-4">
                  {stock.length === 0 ? (
                    <div className="text-center py-8 bg-zinc-50 border border-dashed rounded-lg">
                      <p className="text-xs text-zinc-500 font-medium font-sans">No items currently stored in the hotel database inventory.</p>
                      <button
                        onClick={() => setInvAction('add_new')}
                        className="mt-3 bg-zinc-900 hover:bg-black text-[#f5f0eb] text-[9px] uppercase tracking-wider font-extrabold px-3 py-1.5 rounded cursor-pointer"
                      >
                        Add First Supply Item
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {stock.map(s => {
                        const isUnder = s.stockCount <= s.minLimit && s.stockCount > 0;
                        const isFinished = s.stockCount === 0;
                        return (
                          <div key={s.id} className={`p-4 rounded-xl border transition-all ${
                            isFinished ? 'bg-red-50/55 border-red-200' : isUnder ? 'bg-amber-50/50 border-amber-200' : 'bg-[#faf9f6]/90 border-zinc-200'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[9px] text-[#a89078] font-mono font-bold tracking-wide">{s.id}</span>
                                <h4 className="font-extrabold text-xs text-zinc-900 mt-0.5 leading-snug">{s.name}</h4>
                                <span className="text-[8.5px] bg-neutral-100 text-zinc-500 px-1.5 py-0.5 rounded inline-block mt-1 font-medium font-sans">{s.category} Category</span>
                              </div>
                              <span className={`text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded ${
                                isFinished ? 'bg-red-200 text-red-900 animate-pulse' : isUnder ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {isFinished ? 'Finished' : isUnder ? 'Needs Replacement' : 'Supplied'}
                              </span>
                            </div>

                            <div className="mt-4 pt-3 border-t border-dashed border-zinc-200 flex justify-between items-center">
                              <div>
                                <span className="text-[8px] font-mono text-zinc-400 block uppercase">Stock Level</span>
                                <span className={`text-sm font-black font-display ${isFinished ? 'text-red-700' : 'text-zinc-800'}`}>{s.stockCount} units</span>
                              </div>
                              
                              <div className="text-right">
                                <span className="text-[8px] font-mono text-zinc-400 block uppercase">Min Reserve Threshold</span>
                                <span className="text-xs font-mono font-bold text-zinc-700">{s.minLimit} units</span>
                              </div>
                            </div>

                            {/* Live Quick Count adjustments to track what's finished or replace */}
                            <div className="mt-3.5 pt-2 border-t border-dashed border-zinc-150 flex items-center justify-between">
                              <span className="text-[9px] text-zinc-400 italic leading-none font-medium font-sans">Quick adjustments</span>
                              <div className="flex items-center gap-1.5 font-sans">
                                <button
                                  type="button"
                                  onClick={() => handleAdjustStockCount(s.id, 'decrease')}
                                  disabled={s.stockCount === 0}
                                  className="w-6 h-6 bg-white hover:bg-red-50 border border-zinc-250 disabled:opacity-40 rounded flex items-center justify-center text-xs font-black cursor-pointer select-none transition-all shadow-xs"
                                  title="Consume / Decrease stock level (-1)"
                                >
                                  -
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustStockCount(s.id, 'increase')}
                                  className="w-6 h-6 bg-white hover:bg-emerald-50 border border-zinc-250 rounded flex items-center justify-center text-xs font-black cursor-pointer select-none transition-all shadow-xs"
                                  title="Add stock level (+1)"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStockId(s.id);
                                    setUnitCost((s.price !== undefined ? s.price : 0).toString());
                                    setInvAction('buy');
                                  }}
                                  className="bg-zinc-800 hover:bg-black text-[#f5f0eb] text-[8.5px] uppercase tracking-wider font-extrabold px-2 py-1 rounded cursor-pointer transition-all ml-1.5"
                                >
                                  Log bought
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Action 2: Manual Log Bought Supply (Expense Postable) */}
              {invAction === 'buy' && (
                <form onSubmit={handleManualBuyStock} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-4 animate-fade-in max-w-xl">
                  <div>
                    <h4 className="font-bold text-xs text-zinc-800 uppercase tracking-wider">Log Manual Bought Replenishment</h4>
                    <p className="text-[9.5px] text-zinc-500 font-sans mt-0.5">Records bought supply volumes, updates unit purchase price, and posts automatically to general expenses.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-700">Select Inventory Supply Item</label>
                      <select
                        value={selectedStockId}
                        onChange={(e) => {
                          const item = stock.find(st => st.id === e.target.value);
                          setSelectedStockId(e.target.value);
                          if (item) setUnitCost((item.price !== undefined ? item.price : 0).toString());
                        }}
                        className="bg-white border rounded py-2 px-2.5 outline-none font-bold text-zinc-800"
                        required
                      >
                        <option value="">-- Choose supply category item --</option>
                        {stock.map(s => (
                          <option key={s.id} value={s.id}>{s.name} (Current: {s.stockCount} units)</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-700">Quantity Bought</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 50"
                        value={qtyBought}
                        onChange={(e) => setQtyBought(e.target.value)}
                        className="bg-white border rounded py-2 px-2.5 font-semibold text-zinc-800"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1 md:col-span-2 font-mono">
                      <label className="font-bold text-zinc-700 font-sans">Cost per Unit Paid (UGX)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Unit price paid by hotel"
                        value={unitCost}
                        onChange={(e) => setUnitCost(e.target.value)}
                        className="bg-white border rounded py-2 px-2.5 font-bold text-emerald-800 font-mono"
                        required
                      />
                      <span className="text-[9.5px] text-zinc-405 font-mono block mt-0.5 font-sans font-medium">Total posting expense: UGX {((Number(qtyBought) || 0) * (Number(unitCost) || 0)).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t text-[10px] font-black uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => setInvAction('list')}
                      className="bg-white hover:bg-zinc-100 border border-zinc-250 text-zinc-750 px-3 py-2 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-zinc-900 hover:bg-black text-[#f5f0eb] px-4 py-2 rounded cursor-pointer shadow-xs"
                    >
                      Record Purchased Supply
                    </button>
                  </div>
                </form>
              )}

              {/* Action 3: Manual Onboard New Item */}
              {invAction === 'add_new' && (
                <form onSubmit={handleManualAddNewStock} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-4 animate-fade-in max-w-xl">
                  <div>
                    <h4 className="font-bold text-xs text-[#111] uppercase tracking-wider">Onboard Brand New Supply Category</h4>
                    <p className="text-[9.5px] text-zinc-500 font-sans mt-0.5">Register a brand new operational supply group to the database for future trackings.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="flex flex-col gap-1 md:col-span-2">
                      <label className="font-bold text-zinc-700">Supply Item Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Lavender Toiletries Bottled Soap"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="bg-white border rounded py-2 px-2.5 font-medium text-zinc-800"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-700">Classification Class</label>
                      <select
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value as any)}
                        className="bg-white border rounded py-2 px-2 outline-none font-bold text-zinc-800 cursor-pointer"
                        required
                      >
                        <option value="Housekeeping">Housekeeping Supplies</option>
                        <option value="Kitchen">Kitchen/Restaurant Groceries</option>
                        <option value="Restaurant">Restaurant Cutlery/Tableware</option>
                        <option value="Bar">Liquor & Bar Storage</option>
                        <option value="Maintenance">Maintenance Tools & Spare Parts</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-700">Init Stock Count (units)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 100"
                        value={newItemCount}
                        onChange={(e) => setNewItemCount(e.target.value)}
                        className="bg-white border rounded py-2 px-2.5 text-zinc-800"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-700">Minimum Safety Reserve Limit</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 20"
                        value={newItemMin}
                        onChange={(e) => setNewItemMin(e.target.value)}
                        className="bg-white border rounded py-2 px-2.5 text-zinc-805"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1 font-mono">
                      <label className="font-bold text-zinc-750 font-sans">Unit Price Estimation (UGX)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 18000"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        className="bg-white border rounded py-2 px-2.5 text-zinc-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t text-[10px] font-black uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => setInvAction('list')}
                      className="bg-white hover:bg-zinc-100 border border-zinc-250 text-zinc-700 px-3 py-2 rounded cursor-pointer"
                    >
                      Back to list
                    </button>
                    <button
                      type="submit"
                      className="bg-zinc-900 hover:bg-black text-[#f5f0eb] px-4 py-2 rounded cursor-pointer shadow-xs"
                    >
                      Onboard Supply Class
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right column: WhatsApp Log Simulation */}
        <div className="space-y-6">
          <div className="bg-[#e4ffd4]/20 border border-emerald-100 p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="font-display font-black text-xs uppercase text-emerald-900 pb-2 border-b border-emerald-100 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping block"></span>
              WhatsApp Automation Outbox Logger
            </h3>
            <p className="text-[10px] text-emerald-800 font-medium font-sans leading-normal leading-relaxed">
              Tranquil Haven auto-fires guest progress details instantly via the integrated Twilio/WhatsApp webhook API structures.
            </p>

            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
              <div className="p-3 bg-white border border-emerald-100 rounded-lg text-[10px] leading-relaxed">
                <span className="font-black text-emerald-800 block">✓ RESERVATION CONFIRMATION</span>
                <p className="text-zinc-650 font-sans mt-0.5">Booking receipt TH-2026-00001 dispatched to Julianne Moore (+1 555-349-2041).</p>
                <span className="text-[8.5px] font-mono text-zinc-400 block mt-1">Status: Delivered & Signed</span>
              </div>

              <div className="p-3 bg-white border border-emerald-100 rounded-lg text-[10px] leading-relaxed">
                <span className="font-black text-emerald-800 block">✓ ROOM READY NOTIFICATION</span>
                <p className="text-zinc-650 font-sans mt-0.5">Room 402 certified clean. Automation ping sent to vip registry instantly.</p>
                <span className="text-[8.5px] font-mono text-zinc-400 block mt-1">Status: Handshake Ok</span>
              </div>
            </div>
          </div>

          {/* Persistent global walkthrough warnings (Level 2) */}
          <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-3">
            <h3 className="font-display font-black text-xs uppercase text-zinc-700 border-b border-zinc-100 pb-2">
              Overwatch Notifications Console
            </h3>
            
            {allNotifications.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 font-sans text-xs bg-zinc-50 border border-dashed rounded-lg">
                No active operational notifications.
              </div>
            ) : (
              allNotifications.map(n => (
                <div key={n.id} className="p-3 bg-amber-50/40 border border-amber-200/50 rounded-lg text-[10.5px] space-y-2 transition-all">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex gap-1.5 items-center">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        <span className="font-black text-amber-900 uppercase text-[9px]">{n.urgency} Operational Point</span>
                      </div>
                      <span className="text-[8px] font-mono text-zinc-405 font-bold">{n.id}</span>
                    </div>
                    {n.title && <h4 className="font-bold text-zinc-900 text-xs mb-0.5">{n.title}</h4>}
                    <p className="text-zinc-700 font-sans font-medium">{n.text}</p>
                  </div>
                  <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-dashed border-amber-200/60 font-sans">
                    <span className="text-[9px] text-[#8a5c21] font-bold font-mono">LEVEL: {n.level}</span>
                    <button
                      onClick={() => {
                        if (window.confirm("Permanently delete this overwatch notification?")) {
                          deleteNotification(n.id, 'Marcus Sterling', 'Manager');
                        }
                      }}
                      className="text-red-700 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer font-sans font-bold"
                      title="Permanently Delete notification"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      Delete ⌫
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ==========================================
// 3. RECEPTIONIST SCREEN
// ==========================================
interface ReceptionistProps {
  rooms: Room[];
  reservations: Reservation[];
  guests: GuestCRM[];
  messages: InternalMessage[];
  onAddMessage: (text: string) => void;
  onAddReservation: (res: Reservation) => void;
  onCheckInGuest: (id: string) => void;
  onCheckOutGuest: (id: string) => void;
  onRegisterGuestCRM: (guest: GuestCRM) => void;
  onAddNotification: (n: SystemNotification) => void;
  serviceRequests: ServiceRequest[];
  onUpdateServiceRequestStatus: (id: string, next: ServiceRequestStatus, staff?: string) => void;
  onApproveRoomInspection: (roomId: string) => void;
  onDeleteServiceRequest?: (id: string) => void;
  onPostFinancial?: (record: FinancialRecord) => void;
}

export function ReceptionistScreen({
  rooms,
  reservations,
  guests,
  messages,
  onAddMessage,
  onAddReservation,
  onCheckInGuest,
  onCheckOutGuest,
  onRegisterGuestCRM,
  onAddNotification,
  serviceRequests,
  onUpdateServiceRequestStatus,
  onApproveRoomInspection,
  onDeleteServiceRequest,
  onPostFinancial
}: ReceptionistProps) {
  const [searchPhone, setSearchPhone] = useState('');
  const [foundGuest, setFoundGuest] = useState<GuestCRM | null>(null);

  // Walk-in parameters
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinEmail, setWalkinEmail] = useState('');
  const [walkinPassport, setWalkinPassport] = useState('');
  const [walkinNID, setWalkinNID] = useState('');
  const [walkinEmergency, setWalkinEmergency] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [walkinPrice, setWalkinPrice] = useState('350000');
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState<string | null>(null);

  // Invoice parameters
  const [activeReceipt, setActiveReceipt] = useState<{ id: string; guest: string; room: string; amount: number; time: string } | null>(null);

  // Checkout parameters
  const [selectedCheckoutRoomId, setSelectedCheckoutRoomId] = useState('');
  const [manualCheckoutRoomId, setManualCheckoutRoomId] = useState('');

  const roomsOfOccupiedStatus = rooms.filter(r => r.status === 'Occupied');
  const targetCheckoutId = selectedCheckoutRoomId || manualCheckoutRoomId.trim();
  const activeSelectionRoom = rooms.find(r => r.id === targetCheckoutId);
  const activeSelectionReservation = reservations.find(res => res.roomNo === targetCheckoutId && res.status === 'CHECKED_IN');
  const activeSelectionGuestName = activeSelectionReservation ? activeSelectionReservation.guestName : (activeSelectionRoom?.guestName || 'Active Guest');

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoomId = selectedCheckoutRoomId || manualCheckoutRoomId.trim();
    if (!finalRoomId) {
      alert('Please specify an occupied room number to checkout.');
      return;
    }

    const targetRoom = rooms.find(r => r.id === finalRoomId);
    if (!targetRoom) {
      alert(`Room ${finalRoomId} is not in the directory.`);
      return;
    }

    const matchedRes = reservations.find(res => res.roomNo === finalRoomId && res.status === 'CHECKED_IN');
    const guestName = matchedRes ? matchedRes.guestName : (targetRoom.guestName || 'Guest Stay');

    onCheckOutGuest(finalRoomId);

    // Dynamic Invoice Preview
    setActiveReceipt({
      id: `INV-OUT-${Date.now().toString().slice(-4)}`,
      guest: guestName,
      room: finalRoomId,
      amount: Math.floor(Math.random() * 80) + 40,
      time: new Date().toLocaleString()
    });

    alert(`Receipt settled. Room ${finalRoomId} has successfully transitioned to "Dirty" for turnaround clean clearance.`);

    setSelectedCheckoutRoomId('');
    setManualCheckoutRoomId('');
  };

  const availableRoomsForCheckIn = rooms.filter(r => r.status === 'Vacant' && (r.subStatus === 'CLEANED' || r.subStatus === 'READY'));

  const handleSearchByPhone = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = searchPhone.replace(/\D/g, '');
    const found = guests.find(g => g.phone.replace(/\D/g, '').includes(cleanPhone));
    setFoundGuest(found || null);
    if (!found) {
      alert(`No guest profiles found matching search prompt.`);
    }
  };

  const handleCreateWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinName.trim() || !walkinPhone.trim() || !selectedRoomId) {
      alert('Missing required fields for walk-in guest checkin credentials.');
      return;
    }

    // Generate unique serial code
    const serialSuffix = String(guests.length + 1).padStart(5, '0');
    const guestSerialId = `TH-2026-${serialSuffix}`;

    const newGuestObj: GuestCRM = {
      id: guestSerialId,
      fullName: walkinName,
      phone: walkinPhone,
      email: walkinEmail || 'guest@hospitality.example.com',
      passport: walkinPassport || 'PASSPORT-WALKIN',
      nationalId: walkinNID || 'NID-WALKIN',
      emergencyContact: walkinEmergency || 'N/A',
      loyaltyPoints: 100,
      spendingHistory: 350,
      checkedInRoom: selectedRoomId,
      historyLogs: ['Walk-in registration at front desk']
    };

    onRegisterGuestCRM(newGuestObj);

    // Create reservation slot
    const newResObj: Reservation = {
      id: `RS-NEW-${Date.now().toString().slice(-4)}`,
      guestName: walkinName,
      guestAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
      roomNo: selectedRoomId,
      roomType: rooms.find(r => r.id === selectedRoomId)?.type || 'Standard Suite',
      checkInDate: '2026-06-07',
      checkOutDate: '2026-06-09',
      dateRange: 'Jun 07 - 09',
      numGuests: 2,
      status: 'CHECKED_IN'
    };

    onAddReservation(newResObj);
    onCheckInGuest(selectedRoomId);

    const priceAmount = Number(walkinPrice) || 350000;

    // Auto Create Receipt transaction in Accountant Ledger
    if (onPostFinancial) {
      onPostFinancial({
        id: `TXN-W-${Date.now().toString().slice(-4)}`,
        type: 'Revenue',
        amount: priceAmount,
        category: 'Room Charge',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        description: `Walk-in Room Check-in - Guest: ${walkinName} (Room ${selectedRoomId})`,
        status: 'Approved'
      });
    }

    const receiptId = `INV-${Date.now().toString().slice(-4)}`;

    // Invoice simulation
    setActiveReceipt({
      id: receiptId,
      guest: walkinName,
      room: selectedRoomId,
      amount: priceAmount,
      time: new Date().toLocaleString()
    });

    // Auto dispatch Receipt WhatsApp redirect link
    const cleanPhone = walkinPhone.replace(/\D/g, '');
    const thankYouText = `Dear ${walkinName},\n\nThank you for choosing TRANQUIL HAVEN! We are absolutely delighted to welcome you to our oasis of comfort and serenity. 🌸\n\nHere is your digital check-in receipt:\n- Room: Suite ${selectedRoomId}\n- Rate: UGX ${priceAmount.toLocaleString()}\n- Receipt No: ${receiptId}\n- Check-In Time: ${new Date().toLocaleString()}\n\nWe look forward to ensuring your stay is incredibly relaxing and memorable. Please do not hesitate to contact our Concierge Desk if you need anything at all.\n\nWarmest regards,\nTRANQUIL HAVEN Front Desk Team ✨`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(thankYouText)}`;
    
    setLastWhatsAppUrl(whatsappUrl);

    // Attempt auto window redirect (user experience fallback triggers modal helper too)
    try {
      window.open(whatsappUrl, '_blank');
    } catch (err) {
      console.warn("Pop-up blocked auto redirection to WhatsApp:", err);
    }

    // Alert Level 1
    onAddNotification({
      id: `N-${Date.now()}`,
      title: 'Walk-in Guest Checked In',
      text: `Receptionist registered guest ${walkinName} (Serial ${guestSerialId}) into Room ${selectedRoomId}. Welcome details and receipt dispatched via WhatsApp.`,
      urgency: 'Normal',
      level: 1,
      timestamp: 'Just now',
      acknowledgedBy: []
    });

    // Reset Form
    setWalkinName('');
    setWalkinPhone('');
    setWalkinEmail('');
    setWalkinPassport('');
    setWalkinNID('');
    setWalkinEmergency('');
    setSelectedRoomId('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Real-time Service & Inspection Alerts */}
      <HousekeepingInspectionWidget rooms={rooms} onApproveRoomInspection={onApproveRoomInspection} />
      <LiveServiceRequestsWidget serviceRequests={serviceRequests} onUpdateServiceRequestStatus={onUpdateServiceRequestStatus} onDeleteServiceRequest={onDeleteServiceRequest} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Walk-In Form Registration Panel */}
        <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
          <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#a89078]" />
            New Walk-In Registration & Checkin
          </h3>

          <form onSubmit={handleCreateWalkIn} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block">Full Guest Name *</label>
              <input
                type="text"
                required
                value={walkinName}
                onChange={(e) => setWalkinName(e.target.value)}
                placeholder="E.g. Leonardo DiCaprio"
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Mobile Phone No *</label>
                <input
                  type="text"
                  required
                  value={walkinPhone}
                  onChange={(e) => setWalkinPhone(e.target.value)}
                  placeholder="+1 (555) 728-1029"
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block">Email Address</label>
                <input
                  type="email"
                  value={walkinEmail}
                  onChange={(e) => setWalkinEmail(e.target.value)}
                  placeholder="leo@cinema.example.com"
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block">Passport No</label>
                <input
                  type="text"
                  value={walkinPassport}
                  onChange={(e) => setWalkinPassport(e.target.value)}
                  placeholder="US1920401"
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block">National ID No</label>
                <input
                  type="text"
                  value={walkinNID}
                  onChange={(e) => setWalkinNID(e.target.value)}
                  placeholder="NID-910401"
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block">Emergency Contact Name & Phone</label>
              <input
                type="text"
                value={walkinEmergency}
                onChange={(e) => setWalkinEmergency(e.target.value)}
                placeholder="Gillian Mercer (+1 555-839-2041)"
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Room Price / Rate (UGX) *</label>
              <input
                type="number"
                required
                value={walkinPrice}
                onChange={(e) => setWalkinPrice(e.target.value)}
                placeholder="E.g. 350000"
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1.5 pt-1.5 border-t border-dashed border-zinc-200">
              <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block">Assign Clean/Ready Room</label>
              <select
                required
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 px-1.5 py-1.5 rounded-lg text-xs outline-none"
              >
                <option value="">-- Choose Vacant Certified Room --</option>
                {availableRoomsForCheckIn.map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.id} - {r.type} ({r.subStatus})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-black transition-all cursor-pointer shadow-sm"
            >
              Sign & Check-In
            </button>
          </form>
        </div>

        {/* Guest Express Checkout Terminal */}
        <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
          <h3 className="font-display font-black text-sm uppercase text-red-700 pb-3 border-b border-zinc-100 flex items-center gap-2">
            <UserMinus className="w-5 h-5 text-red-650" />
            Express Guest Checkout Terminal
          </h3>
          
          <div className="text-[11px] text-zinc-650 bg-neutral-50 p-3 rounded-lg leading-relaxed border border-dashed border-zinc-200">
            <p className="font-medium text-zinc-700">
              ⚡ <span className="font-black text-zinc-900">Standard Operating Directive:</span> Upon checking out a guest, the room status will immediately transition to <span className="bg-amber-100 text-[#a85f00] px-1 py-0.5 rounded font-black text-[10px]">Dirty</span> and dispatch a turnaround cleaning task.
            </p>
          </div>

          <form onSubmit={handleCheckoutSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Select Checked-In Guest / Room</label>
              <select
                value={selectedCheckoutRoomId}
                onChange={(e) => {
                  setSelectedCheckoutRoomId(e.target.value);
                  if (e.target.value) {
                    setManualCheckoutRoomId('');
                  }
                }}
                className="w-full bg-zinc-50 border border-zinc-200 px-1.5 py-1.5 rounded-lg text-xs outline-none"
              >
                <option value="">-- Choose Occupied Room to Settle & Vacate --</option>
                {roomsOfOccupiedStatus.length === 0 ? (
                  <option disabled>No occupied rooms currently found</option>
                ) : (
                  roomsOfOccupiedStatus.map(r => {
                    const guestData = reservations.find(res => res.roomNo === r.id && res.status === 'CHECKED_IN');
                    const dispName = guestData ? guestData.guestName : (r.guestName || 'Active Guest');
                    return (
                      <option key={r.id} value={r.id}>
                        Room {r.id} - {dispName} ({r.type})
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Or Manual Room Code Entry</label>
                <span className="text-[8px] bg-zinc-200 text-zinc-650 px-1.5 rounded font-semibold uppercase font-mono">OVERRIDE</span>
              </div>
              <input
                type="text"
                placeholder="E.g. 101, 102, 203..."
                value={manualCheckoutRoomId}
                onChange={(e) => {
                  setManualCheckoutRoomId(e.target.value);
                  if (e.target.value) {
                    setSelectedCheckoutRoomId('');
                  }
                }}
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs outline-none"
              />
            </div>

            {activeSelectionRoom && (
              <div className="p-3 bg-red-50/40 rounded-lg text-xs border border-red-100/50 animate-fade-in space-y-2">
                <div className="flex justify-between items-center text-zinc-805">
                  <span className="font-extrabold font-sans text-[11px] text-[#2c1d11]">Suite {activeSelectionRoom.id} checkout ledger</span>
                  <span className="px-2 py-0.5 rounded-full text-[8.5px] font-mono font-bold bg-[#c62828] text-white">Occupied</span>
                </div>
                <div className="space-y-1 text-zinc-650 font-sans text-[11px] leading-tight">
                  <p>Customer Profile: <span className="font-bold text-zinc-805">{activeSelectionGuestName}</span></p>
                  <p>Unit Tier: <span className="font-medium text-zinc-70s">{activeSelectionRoom.type}</span></p>
                  <p className="text-[10px] text-zinc-500 italic">Dispatched logs to accounting for post-stay audits. Balance checklist complete.</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedCheckoutRoomId && !manualCheckoutRoomId.trim()}
              className={`w-full py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 ${
                (selectedCheckoutRoomId || manualCheckoutRoomId.trim()) 
                  ? 'bg-[#c62828] text-white hover:bg-black font-extrabold' 
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200 font-bold'
              }`}
            >
              <UserMinus className="w-4 h-4" />
              Settle Balance & Release Key
            </button>
          </form>
        </div>

        {/* Guest CRM Explorer Search & Action Centre */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Find Guest Section */}
            <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
              <h3 className="font-display font-black text-xs uppercase text-zinc-700 flex items-center gap-1.5 pb-2 border-b border-zinc-100">
                <Search className="w-4 h-4 text-[#a89078]" />
                Role AI Assist: Find Guest By Phone
              </h3>

              <form onSubmit={handleSearchByPhone} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter phone digits (e.g. 555)..."
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="flex-1 bg-zinc-50 border border-zinc-200 px-3 rounded-lg text-xs outline-none"
                />
                <button
                  type="submit"
                  className="bg-black text-white p-2 rounded-lg hover:bg-zinc-800 cursor-pointer"
                >
                  Seek
                </button>
              </form>

              {foundGuest ? (
                <div className="p-3.5 bg-neutral-50 rounded-lg text-xs border border-zinc-150 animate-fade-in space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-black text-zinc-900">{foundGuest.fullName}</span>
                    <span className="text-[9px] font-mono font-bold bg-[#f5f0eb] text-zinc-700 px-2 rounded-full">
                      {foundGuest.id}
                    </span>
                  </div>
                  <div className="space-y-1 text-zinc-650 font-sans font-medium text-[11px]">
                    <p>Phone: {foundGuest.phone}</p>
                    <p>Email: {foundGuest.email}</p>
                    <p>Loyalty Points: <span className="font-bold text-amber-700">{foundGuest.loyaltyPoints} PTS</span></p>
                    <p>Total Life Spend: UGX {foundGuest.spendingHistory.toLocaleString()}</p>
                  </div>
                  <div className="border-t border-dashed border-zinc-200 pt-2 text-[10px] text-zinc-500">
                    <span className="font-bold block uppercase text-zinc-600 mb-0.5">Checked Stay logs:</span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {foundGuest.historyLogs.slice(0, 2).map((log, k) => (
                        <li key={k} className="leading-tight">{log}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2.5 border-t border-dashed border-zinc-200">
                    <a
                      href={`https://api.whatsapp.com/send?phone=${foundGuest.phone.replace(/\D/g, '')}&text=${encodeURIComponent(`Hello ${foundGuest.fullName}, welcome to TRANQUIL HAVEN! Your checked-in room is Room ${foundGuest.checkedInRoom || '402'}. Click the secure link to instantly launch your personalized digital guest mobile portal: ${window.location.origin}${window.location.pathname}?role=Guest&room=${foundGuest.checkedInRoom || '402'}&guest=${encodeURIComponent(foundGuest.fullName)}&guestId=${foundGuest.id}&phone=${encodeURIComponent(foundGuest.phone)}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-[10px] font-black uppercase tracking-wider py-2 px-3 rounded-lg cursor-pointer transition-colors shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Dispatch Port Link via WhatsApp
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-zinc-500 text-center py-4 font-medium italic">Seek guest database using CRM records lookup above.</p>
              )}
            </div>

            {/* Simulated Live Print Desk */}
            <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-3.5">
              <h3 className="font-display font-black text-xs uppercase text-zinc-700 pb-2 border-b border-zinc-100 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-[#a89078]" />
                Automated Checkout/Registration Billing Desk
              </h3>

              {activeReceipt ? (
                <div className="space-y-2">
                  <div className="p-4 bg-[#fbf9f6] border border-zinc-200 rounded-sm font-mono text-[10px] space-y-2 leading-relaxed text-zinc-700 shadow-inner">
                    <div className="text-center border-b border-zinc-300 pb-1.5 uppercase font-bold text-zinc-900">
                      <p>TRANQUIL HAVEN RECEIPT</p>
                      <p className="text-[8px] font-normal font-sans">Hospitality Command Center</p>
                    </div>
                    <div className="space-y-1 font-mono">
                      <p>SERIAL: {activeReceipt.id}</p>
                      <p>CLIENT: {activeReceipt.guest}</p>
                      <p>ROOM LOG: Suite {activeReceipt.room}</p>
                      <p>CHARGE: UGX {activeReceipt.amount.toLocaleString()}</p>
                      <p>DATE: {activeReceipt.time}</p>
                    </div>
                    <div className="border-t border-dashed border-zinc-350 pt-1.5 text-center text-[8px] uppercase">
                      <p className="font-black">Auto Dispatch Triggered ✔</p>
                      <p className="text-[7.5px] italic text-zinc-400">PDF stored in secure cloud systems</p>
                    </div>
                  </div>

                  {lastWhatsAppUrl && (
                    <a
                      href={lastWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-[10px] font-black uppercase tracking-wider py-2.5 px-3 rounded-lg cursor-pointer transition-all shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Dispatch Receipt & Thank You Note via WhatsApp
                    </a>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-lg">
                  <Printer className="w-8 h-8 mx-auto opacity-30 mb-1" />
                  <p className="text-[10px] font-serif italic">Check-in guests or log walk-ins to generate physical ledger receipts automatically.</p>
                </div>
              )}
            </div>

          </div>

          {/* Core Grid: Reservation Schedule */}
          <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm">
            <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-zinc-700" />
              Those That Have Already Booked & Room Dispatch List ({reservations.length})
            </h3>

            <div className="divide-y divide-zinc-100 text-xs">
              {reservations.map(res => (
                <div key={res.id} className="py-3 flex justify-between items-center gap-4">
                  <div className="flex gap-3 items-center">
                    <img 
                      src={res.guestAvatar} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80';
                      }} 
                      className="w-10 h-10 rounded-full border border-neutral-200 flex-shrink-0" 
                      alt=""
                    />
                    <div className="space-y-0.5">
                      <p className="font-black text-zinc-850 leading-none">{res.guestName}</p>
                      <p className="text-[10.5px] text-zinc-500 font-sans">Room {res.roomNo} ({res.roomType}) | {res.dateRange}</p>
                    </div>
                  </div>

                  {res.status === 'EXPECTED' ? (
                    <button
                      onClick={() => onCheckInGuest(res.roomNo)}
                      className="bg-black text-[#f5f0eb] hover:bg-zinc-800 text-[10px] uppercase tracking-wider font-extrabold px-3 py-1.5 rounded cursor-pointer"
                    >
                      Authorize Room Key & Checkin
                    </button>
                  ) : res.status === 'CHECKED_IN' ? (
                    <button
                      onClick={() => onCheckOutGuest(res.roomNo)}
                      className="bg-red-50 text-[#c62828] border border-red-200/50 hover:bg-red-100 text-[10px] uppercase tracking-wider font-extrabold px-3 py-1.5 rounded cursor-pointer"
                    >
                      Settle Balance & Checkout
                    </button>
                  ) : (
                    <span className="text-[10px] bg-zinc-105 text-zinc-500 px-2 py-1 rounded font-bold uppercase">Completed</span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}


// ==========================================
// 4. CLEANER SCREEN
// ==========================================
interface RoomCleanProofModalProps {
  roomId: string;
  roomType: string;
  onClose: () => void;
  onSubmit: (photo: string, video: string) => void;
}

export function RoomCleanProofModal({ roomId, roomType, onClose, onSubmit }: RoomCleanProofModalProps) {
  const [photo, setPhoto] = useState<string>('');
  const [video, setVideo] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Clean room presets
  const photoPresets = [
    { name: 'Warm Lit King Bed', url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&h=450&q=80' },
    { name: 'Immaculate Bathroom', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&h=450&q=80' },
    { name: 'Deluxe Suite Lounge', url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&h=450&q=80' }
  ];

  const videoPresets = [
    { name: 'Suite Walkthrough Tour', url: 'https://assets.mixkit.co/videos/preview/mixkit-hotel-room-with-a-king-size-bed-42223-large.mp4' },
    { name: 'Clean Bedroom Walkthrough', url: 'https://assets.mixkit.co/videos/preview/mixkit-luxury-resort-bedroom-42220-large.mp4' }
  ];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhoto(url);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideo(url);
    }
  };

  const startLiveCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setMediaStream(s);
      setIsCapturing(true);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      alert("Webcam device is blocked or unavailable in this sandbox environment. Please use the beautiful pre-populated simulation tools below!");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhoto(dataUrl);
      }
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    setIsCapturing(false);
  };

  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) {
      alert("Please take or upload at least one Clean Photo Proof to verify the turnaround.");
      return;
    }
    if (!video) {
      alert("Please upload or select a Clean Walkthrough Video proof.");
      return;
    }
    onSubmit(photo, video);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-zinc-850">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-150 flex justify-between items-center bg-zinc-50">
          <div>
            <h3 className="font-display font-black text-base text-zinc-900 flex items-center gap-1.5 uppercase tracking-tight">
              <span className="material-symbols-outlined text-emerald-700 font-black">verified_user</span>
              Post Clean Proof: Room {roomId}
            </h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{roomType}</p>
          </div>
          <button 
            type="button"
            onClick={() => { stopCamera(); onClose(); }}
            className="w-8 h-8 rounded-full hover:bg-zinc-200 flex items-center justify-center text-zinc-500 cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-grow select-none">
          
          {/* Section 1: Photo Proof */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-black uppercase tracking-widest text-zinc-700 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm font-bold">photo_camera</span>
                1. Take / Upload Clean Photo
              </label>
              {photo && (
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  Ready
                </span>
              )}
            </div>

            {/* Webcam / Preview Container */}
            {isCapturing ? (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-zinc-305 flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full font-bold text-xs shadow-md flex items-center gap-1 cursor-pointer border-none"
                  >
                    <span className="material-symbols-outlined text-sm">photo_camera</span> Capture Snapshot
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="bg-zinc-850 text-white px-3 py-2 rounded-full font-bold text-xs hover:bg-zinc-900 cursor-pointer border-none"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : photo ? (
              <div className="relative rounded-xl overflow-hidden bg-zinc-50 aspect-video border border-zinc-205">
                <img src={photo} alt="Clean preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button
                  type="button"
                  onClick={() => setPhoto('')}
                  className="absolute top-2 right-2 bg-red-650 text-white rounded-full p-1.5 hover:bg-red-700 shadow-md flex items-center justify-center cursor-pointer border-none"
                  title="Remove Photo"
                >
                  <span className="material-symbols-outlined text-sm font-bold">delete</span>
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-zinc-205 rounded-xl p-5 flex flex-col items-center justify-center bg-zinc-50 hover:bg-zinc-100/50 transition-colors">
                <span className="material-symbols-outlined text-4xl text-zinc-300 mb-2">add_a_photo</span>
                <p className="text-xs text-zinc-500 font-sans mb-3 text-center">Drag and drop or select an image file to upload.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <label className="bg-zinc-900 hover:bg-black text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-sm text-center">
                    Browse File
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                  <button
                    type="button"
                    onClick={startLiveCamera}
                    className="bg-zinc-205 hover:bg-zinc-300 text-zinc-805 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer border-none"
                  >
                    Use Device Camera
                  </button>
                </div>
              </div>
            )}

            {/* Photo Presets for Easy Demo */}
            {!photo && !isCapturing && (
              <div className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#a89078]">Demo simulation options:</p>
                <div className="grid grid-cols-3 gap-2">
                  {photoPresets.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPhoto(p.url)}
                      className="p-1.5 text-[8.5px] font-bold border border-zinc-205 rounded-lg hover:border-[#a89078] bg-zinc-50 text-left truncate cursor-pointer transition-colors block"
                    >
                      📸 {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Video Proof */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-black uppercase tracking-widest text-zinc-700 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm font-bold">videocam</span>
                2. Record / Upload Walkthrough Video
              </label>
              {video && (
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  Ready
                </span>
              )}
            </div>

            {video ? (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-zinc-205">
                <video src={video} controls className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setVideo('')}
                  className="absolute top-2 right-2 bg-red-650 text-white rounded-full p-1.5 hover:bg-red-700 shadow-md flex items-center justify-center cursor-pointer border-none z-10"
                  title="Remove Video"
                >
                  <span className="material-symbols-outlined text-sm font-bold">delete</span>
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-zinc-205 rounded-xl p-5 flex flex-col items-center justify-center bg-zinc-50 hover:bg-zinc-100/50 transition-colors">
                <span className="material-symbols-outlined text-4xl text-zinc-300 mb-2">video_file</span>
                <p className="text-xs text-zinc-500 font-sans mb-3 text-center">Drag & drop or select video walkthrough file.</p>
                <div className="flex justify-center">
                  <label className="bg-zinc-900 hover:bg-black text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-sm text-center">
                    Browse Video
                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                  </label>
                </div>
              </div>
            )}

            {/* Video Presets for Easy Demo */}
            {!video && (
              <div className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#a89078]">Demo simulation options:</p>
                <div className="grid grid-cols-2 gap-2">
                  {videoPresets.map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setVideo(v.url)}
                      className="p-1.5 text-[8.5px] font-bold border border-zinc-205 rounded-lg hover:border-[#a89078] bg-zinc-50 text-left truncate cursor-pointer transition-colors block"
                    >
                      🎥 {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black uppercase tracking-wider py-4 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer mt-4 border-none"
          >
            Publish Verified Clean Room
          </button>
        </form>
      </div>
    </div>
  );
}

interface CleanerProps {
  rooms: Room[];
  tickets: MaintenanceTicket[];
  onUpdateRoomSubStatus: (id: string, sub: string, stat: RoomStatusType, cleanPhoto?: string, cleanVideo?: string) => void;
  onPostMaintenanceTicket: (t: MaintenanceTicket) => void;
}

export function CleanerScreen({
  rooms,
  tickets,
  onUpdateRoomSubStatus,
  onPostMaintenanceTicket
}: CleanerProps) {
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [reportedIssue, setReportedIssue] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'Urgent' | 'Routine'>('Routine');
  const [verifyingRoom, setVerifyingRoom] = useState<Room | null>(null);

  const handleReportIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !reportedIssue.trim()) {
      alert('Missing details to generate maintenance tick.');
      return;
    }

    const newTicket: MaintenanceTicket = {
      id: `TCK-${Date.now().toString().slice(-4)}`,
      location: `Room ${selectedRoomId}`,
      issue: reportedIssue,
      type: 'plumbing',
      category: ticketCategory,
      status: 'ACTIVE',
      reportedTime: 'Just now',
      assignedStaff: 'Unassigned'
    };

    onPostMaintenanceTicket(newTicket);
    alert(`Maintenance dispatch triggered successfully for Room ${selectedRoomId}!`);
    setReportedIssue('');
    setSelectedRoomId('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      
      {/* Housekeeping Tasks Desk */}
      <div className="lg:col-span-2 bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
        <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100 flex items-center gap-1.5">
          <CheckSquare className="w-5 h-5 text-[#a89078]" />
          My Assigned Rooms & Cleaning Queue
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map(room => (
            <div key={room.id} className="bg-[#fcf9f5] border border-zinc-200 rounded-xl p-4 space-y-3 shadow-inner">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm font-display font-black text-zinc-900">Room {room.id}</span>
                  <p className="text-[10.5px] text-zinc-500 font-sans">{room.type}</p>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  room.status === 'Dirty' ? 'bg-amber-100 text-amber-900' : 'bg-zinc-900 text-[#f5f0eb]'
                }`}>
                  {room.status}
                </span>
              </div>

              <div className="flex gap-2">
                <span className="text-[9.5px] bg-[#eae5de] font-mono font-bold px-2 py-0.5 rounded">
                  QUEUE: {room.subStatus}
                </span>
                <span className="text-[9.5px] bg-zinc-100 text-zinc-650 px-2 py-0.5 rounded block max-w-[150px] truncate">
                  {room.notes || 'No custom remarks'}
                </span>
              </div>

              {/* Proof thumbnail badge if uploaded */}
              {(room.cleanPhoto || room.cleanVideo) && (
                <div className="bg-emerald-50/70 border border-emerald-155 p-2 rounded-lg text-[10px] space-y-1">
                  <p className="font-bold text-emerald-800 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[11px] font-black">verified</span>
                    Submitted Proof
                  </p>
                  <div className="flex items-center gap-2.5">
                    {room.cleanPhoto && (
                      <div className="relative rounded overflow-hidden bg-black aspect-video h-9 border border-zinc-200">
                        <img src={room.cleanPhoto} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    {room.cleanVideo && (
                      <div className="relative w-12 h-9 bg-black rounded flex items-center justify-center border border-zinc-200">
                        <span className="material-symbols-outlined text-[14px] text-white">videocam</span>
                      </div>
                    )}
                    <span className="text-[9px] text-zinc-550 font-medium">Submitted by {room.cleanSubmittedBy || 'Housekeeper'}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-dashed border-zinc-200">
                <button
                  onClick={() => setVerifyingRoom(room)}
                  className="bg-emerald-700 text-slate-100 px-2.5 py-1 rounded text-[9.5px] font-extrabold uppercase hover:bg-emerald-800 cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[10px] font-bold">photo_camera</span>
                  Set Clean
                </button>
                <button
                  onClick={() => onUpdateRoomSubStatus(room.id, 'IN QUEUE', 'Dirty')}
                  className="bg-amber-500 text-white px-2.5 py-1 rounded text-[9.5px] font-extrabold uppercase hover:bg-amber-650 cursor-pointer"
                >
                  Set Dirty
                </button>
                <button
                  onClick={() => onUpdateRoomSubStatus(room.id, 'STAYOVER', 'Occupied')}
                  className="bg-[#2a2a2a] text-[#f5f0eb] px-2.5 py-1 rounded text-[9.5px] font-extrabold uppercase cursor-pointer"
                >
                  Set Stayover
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Room Issue for Cleaners */}
      <div className="space-y-6">
        <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
          <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100 flex items-center gap-1.5">
            <AlertTriangle className="w-5 h-5 text-red-600 block animate-pulse" />
            Report Suite Issue Directly
          </h3>

          <form onSubmit={handleReportIssue} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Choose Room Affected</label>
              <select
                required
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 px-1.5 py-1.5 rounded-lg text-xs"
              >
                <option value="">-- Choose Room No. --</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Operational Issue Observed</label>
              <textarea
                required
                value={reportedIssue}
                onChange={(e) => setReportedIssue(e.target.value)}
                placeholder="E.g., Bathroom shower handle is leaking and spraying water over the tiled base floor."
                rows={4}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Severity Level</label>
              <select
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value as 'Urgent' | 'Routine')}
                className="w-full bg-zinc-50 border border-zinc-200 px-1.5 py-1.5 rounded-lg text-xs"
              >
                <option value="Urgent">Urgent - Needs Fix Right Away</option>
                <option value="Routine">Routine - Minor maintenance</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-black text-[#f5f0eb] py-2.5 rounded-lg text-xs uppercase font-black tracking-widest hover:bg-neutral-800 transition-all cursor-pointer"
            >
              Sign & Dispatch Ticket
            </button>
          </form>
        </div>

        {/* Lost & found */}
        <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-3">
          <h4 className="font-display font-black text-xs uppercase text-zinc-700">Lost & Found Registry Logs</h4>
          <div className="p-3 bg-zinc-50 border border-zinc-150 rounded-lg text-[10.5px] text-zinc-400 italic font-sans">
            No lost or found items registered on this shift.
          </div>
        </div>
      </div>

      {verifyingRoom && (
        <RoomCleanProofModal
          roomId={verifyingRoom.id}
          roomType={verifyingRoom.type}
          onClose={() => setVerifyingRoom(null)}
          onSubmit={(photo, video) => {
            onUpdateRoomSubStatus(verifyingRoom.id, 'CLEANED', 'Vacant', photo, video);
            setVerifyingRoom(null);
          }}
        />
      )}

    </div>
  );
}


// ==========================================
// 5. MAINTENANCE & TURNAROUND SCREEN
// ==========================================
interface MaintenanceProps {
  rooms: Room[];
  tickets: MaintenanceTicket[];
  onApproveTicket: (id: string) => void;
  onUpdateTicketStatus: (id: string, stat: 'ACTIVE' | 'RESOLVED', staff: string) => void;
  onUpdateRoomSubStatus: (id: string, sub: string, stat: RoomStatusType, cleanPhoto?: string, cleanVideo?: string) => void;
  onPostMaintenanceTicket: (t: MaintenanceTicket) => void;
}

export function MaintenanceScreen({
  rooms,
  tickets,
  onApproveTicket,
  onUpdateTicketStatus,
  onUpdateRoomSubStatus,
  onPostMaintenanceTicket
}: MaintenanceProps) {
  const [activeTab, setActiveTab] = useState<'repairs' | 'cleaning' | 'dispatch'>('repairs');
  const [techName, setTechName] = useState('Mike T.');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [reportedIssue, setReportedIssue] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'Urgent' | 'Routine'>('Routine');
  const [verifyingRoom, setVerifyingRoom] = useState<Room | null>(null);

  const handleReportIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !reportedIssue.trim()) {
      alert('Missing details to generate maintenance ticket.');
      return;
    }

    const newTicket: MaintenanceTicket = {
      id: `TCK-${Date.now().toString().slice(-4)}`,
      location: `Room ${selectedRoomId}`,
      issue: reportedIssue,
      type: 'plumbing',
      category: ticketCategory,
      status: 'ACTIVE',
      reportedTime: 'Just now',
      assignedStaff: 'Unassigned'
    };

    onPostMaintenanceTicket(newTicket);
    alert(`Maintenance dispatch triggered successfully for Room ${selectedRoomId}!`);
    setReportedIssue('');
    setSelectedRoomId('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sub menu tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        <button
          onClick={() => setActiveTab('repairs')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'repairs'
              ? 'bg-red-800 text-white shadow-sm'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          Technical Repairs ({tickets.filter(t => t.status === 'ACTIVE').length})
        </button>
        <button
          onClick={() => setActiveTab('cleaning')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'cleaning'
              ? 'bg-[#a89078] text-white shadow-sm'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          Cleaning Turnarounds ({rooms.filter(r => r.status === 'Dirty').length} Dirty Rooms)
        </button>
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'dispatch'
              ? 'bg-neutral-950 text-white shadow-sm'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Dispatch Suite Issue
        </button>
      </div>

      {activeTab === 'repairs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Active Work Orders table */}
          <div className="lg:col-span-2 bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100 flex items-center gap-1.5">
              <Wrench className="w-5 h-5 text-zinc-850" />
              General Work Orders & Technician Allocations
            </h3>

            <div className="space-y-3">
              {tickets.map((tc, idx) => (
                <div key={tc.id || `tc-${idx}`} className="p-4 bg-[#fcf9f5] border border-zinc-200 rounded-xl space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-display font-black text-zinc-900">{tc.location}</span>
                      <p className="text-[11px] text-zinc-650 font-sans leading-relaxed mt-0.5">{tc.issue}</p>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                      tc.status === 'ACTIVE' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'
                    }`}>
                      {tc.status === 'ACTIVE' ? 'Pending' : 'Resolved'}
                    </span>
                  </div>

                  {/* Assignments details */}
                  <div className="flex justify-between items-center text-[10px] text-zinc-400 border-t border-dashed border-zinc-200 pt-2 font-sans font-medium">
                    <p>Assigned Tech: <span className="font-bold text-zinc-700">{tc.assignedStaff}</span> | Code: {tc.id}</p>
                    
                    {tc.status === 'ACTIVE' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => onUpdateTicketStatus(tc.id, 'RESOLVED', techName)}
                          className="bg-emerald-800 text-white font-extrabold uppercase text-[9px] px-2.5 py-1 rounded cursor-pointer"
                        >
                          Resolve Code
                        </button>
                        <button
                          onClick={() => onUpdateTicketStatus(tc.id, 'ACTIVE', techName)}
                          className="bg-[#111] text-[#f5f0eb] font-extrabold uppercase text-[9px] px-2.5 py-1 rounded cursor-pointer animate-pulse"
                        >
                          Seize Ticket
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Asset Repairs History */}
          <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="font-display font-black text-sm uppercase text-primary pb-2 border-b border-zinc-100 flex items-center gap-1.5">
              <Clock className="w-5 h-5 text-[#a89078]" />
              Staff Profile Setting
            </h3>

            <div className="space-y-1 bg-zinc-50 p-3.5 rounded-lg border border-zinc-100">
              <label className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-widest block">Active Technician Name</label>
              <input
                type="text"
                value={techName}
                onChange={(e) => setTechName(e.target.value)}
                className="w-full bg-white border border-zinc-200 px-3 py-1.5 rounded text-xs select-none"
              />
              <p className="text-[9px] text-zinc-400 font-sans mt-1">Actions taken across tickets and turnaround queues will record these credentials.</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#a89078]">Repairs History logs</h4>
              <div className="p-3 bg-zinc-100 text-[10px] leading-relaxed rounded text-zinc-650">
                <p className="font-bold">✓ Central Elevator core wire replacement</p>
                <p className="text-[9px] font-mono text-zinc-400">Completed: May 2026 by Mike T. division repairs</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cleaning' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100 flex items-center gap-1.5">
              <CheckSquare className="w-5 h-5 text-[#a89078]" />
              Rooms Cleaning & Turnaround Queue
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room, idx) => (
                <div key={room.id || `room-${idx}`} className="bg-[#fcf9f5] border border-zinc-200 rounded-xl p-4 space-y-3 shadow-inner">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm font-display font-black text-zinc-900">Room {room.id}</span>
                      <p className="text-[10.5px] text-zinc-500 font-sans">{room.type}</p>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      room.status === 'Dirty' ? 'bg-amber-100 text-amber-900' : 'bg-zinc-900 text-[#f5f0eb]'
                    }`}>
                      {room.status}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <span className="text-[9.5px] bg-[#eae5de] font-mono font-bold px-2 py-0.5 rounded">
                      QUEUE: {room.subStatus}
                    </span>
                    <span className="text-[9.5px] bg-zinc-100 text-zinc-650 px-2 py-0.5 rounded block max-w-[150px] truncate">
                      {room.notes || 'No custom remarks'}
                    </span>
                  </div>

                  {/* Proof thumbnail badge if uploaded */}
                  {(room.cleanPhoto || room.cleanVideo) && (
                    <div className="bg-emerald-50/70 border border-emerald-155 p-2 rounded-lg text-[10px] space-y-1">
                      <p className="font-bold text-emerald-800 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[11px] font-black">verified</span>
                        Submitted Proof
                      </p>
                      <div className="flex items-center gap-2.5">
                        {room.cleanPhoto && (
                          <div className="relative rounded overflow-hidden bg-black aspect-video h-9 border border-zinc-200">
                            <img src={room.cleanPhoto} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        {room.cleanVideo && (
                          <div className="relative w-12 h-9 bg-black rounded flex items-center justify-center border border-zinc-200">
                            <span className="material-symbols-outlined text-[14px] text-white">videocam</span>
                          </div>
                        )}
                        <span className="text-[9px] text-zinc-550 font-medium">Submitted by {room.cleanSubmittedBy || 'Housekeeper'}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-dashed border-zinc-200">
                    <button
                      onClick={() => setVerifyingRoom(room)}
                      className="bg-emerald-700 text-slate-100 px-2.5 py-1 rounded text-[9.5px] font-extrabold uppercase hover:bg-emerald-800 cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[10px] font-bold">photo_camera</span>
                      Set Clean
                    </button>
                    <button
                      onClick={() => onUpdateRoomSubStatus(room.id, 'IN QUEUE', 'Dirty')}
                      className="bg-amber-500 text-white px-2.5 py-1 rounded text-[9.5px] font-extrabold uppercase hover:bg-amber-650 cursor-pointer"
                    >
                      Set Dirty
                    </button>
                    <button
                      onClick={() => onUpdateRoomSubStatus(room.id, 'STAYOVER', 'Occupied')}
                      className="bg-[#2a2a2a] text-[#f5f0eb] px-2.5 py-1 rounded text-[9.5px] font-extrabold uppercase cursor-pointer"
                    >
                      Set Stayover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dispatch' && (
        <div className="max-w-2xl bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4 animate-fade-in">
          <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100 flex items-center gap-1.5">
            <AlertTriangle className="w-5 h-5 text-red-600 block animate-pulse" />
            Report Turnaround Suite Issue Directly
          </h3>

          <form onSubmit={handleReportIssue} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-black">Choose Room Affected</label>
              <select
                required
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 px-1.5 py-1.5 rounded-lg text-xs"
              >
                <option value="">-- Choose Room No. --</option>
                {rooms.map((r, idx) => (
                  <option key={r.id || `room-opt-${idx}`} value={r.id}>
                    Room {r.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-black font-sans">Operational Issue Observed</label>
              <textarea
                required
                value={reportedIssue}
                onChange={(e) => setReportedIssue(e.target.value)}
                placeholder="E.g., Bathroom shower handle is leaking and spraying water over the tiled base floor."
                rows={4}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-black">Severity Level</label>
              <select
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value as 'Urgent' | 'Routine')}
                className="w-full bg-zinc-50 border border-zinc-200 px-1.5 py-1.5 rounded-lg text-xs"
              >
                <option value="Urgent">Urgent - Needs Fix Right Away</option>
                <option value="Routine">Routine - Minor maintenance</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-black text-[#f5f0eb] py-2.5 rounded-lg text-xs uppercase font-black tracking-widest hover:bg-neutral-800 transition-all cursor-pointer"
            >
              Sign & Dispatch Repairs Order
            </button>
          </form>
        </div>
      )}

      {verifyingRoom && (
        <RoomCleanProofModal
          roomId={verifyingRoom.id}
          roomType={verifyingRoom.type}
          onClose={() => setVerifyingRoom(null)}
          onSubmit={(photo, video) => {
            onUpdateRoomSubStatus(verifyingRoom.id, 'CLEANED', 'Vacant', photo, video);
            setVerifyingRoom(null);
          }}
        />
      )}
    </div>
  );
}


// ==========================================
// 6. ACCOUNTANT SCREEN
// ==========================================
interface AccountantProps {
  financials: FinancialRecord[];
  onApproveFinancial: (id: string) => void;
  onPostFinancial: (f: FinancialRecord) => void;
  onBulkImportFinancials?: (records: FinancialRecord[]) => void;
}

export function AccountantScreen({
  financials,
  onApproveFinancial,
  onPostFinancial,
  onBulkImportFinancials
}: AccountantProps) {
  const [newType, setNewType] = useState<'Revenue' | 'Expense'>('Revenue');
  const [newAmt, setNewAmt] = useState('');
  const [newCat, setNewCat] = useState('Amenities');
  const [newDesc, setNewDesc] = useState('');
  const [activeSection, setActiveSection] = useState<string>('all');

  // CSV Import States
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [validRecords, setValidRecords] = useState<FinancialRecord[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  const handleExportCSV = () => {
    if (!financials || financials.length === 0) {
      alert("No financial records to export.");
      return;
    }
    const headers = ["Transaction ID", "Type", "Amount (UGX)", "Category", "Date/Time", "Description", "Approval Status"];
    const rows = financials.map(f => [
      f.id,
      f.type,
      f.amount,
      f.category,
      f.timestamp,
      `"${f.description.replace(/"/g, '""')}"`,
      f.status
    ]);
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `General_Ledger_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processCSVText = (text: string) => {
    setImportErrors([]);
    setValidRecords([]);
    setImportSuccessMsg('');

    try {
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        setImportErrors(["CSV file must contain a header and at least one data row."]);
        return;
      }

      const parseLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseLine(lines[0]);
      const headerMap: { [key: string]: number } = {};
      headers.forEach((h, index) => {
        const norm = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        headerMap[norm] = index;
      });

      const getColVal = (rowCols: string[], possibleKeys: string[]): string => {
        for (const key of possibleKeys) {
          const idx = headerMap[key.toLowerCase().replace(/[^a-z0-9]/g, '')];
          if (idx !== undefined && idx < rowCols.length) {
            return rowCols[idx];
          }
        }
        return '';
      };

      const parsed: FinancialRecord[] = [];
      const errorsList: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseLine(line);
        if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;

        const rowNum = i + 1;

        const rawId = getColVal(cols, ["transactionid", "id", "txref", "ref"]);
        const rawType = getColVal(cols, ["type", "txtype"]);
        const rawAmount = getColVal(cols, ["amountugx", "amount", "allocation"]);
        const rawCategory = getColVal(cols, ["category", "allocationtype", "alloc"]);
        const rawDesc = getColVal(cols, ["description", "auditdescription", "desc"]);
        const rawStatus = getColVal(cols, ["approvalstatus", "status", "state"]);
        const rawTime = getColVal(cols, ["datetime", "timestamp", "date", "time"]);

        // Validations
        const typeClean = rawType.replace(/^["']|["']$/g, '').trim().toLowerCase();
        let finalType: 'Revenue' | 'Expense' = 'Revenue';
        if (typeClean === 'revenue' || typeClean === 'rev' || typeClean === 'credit' || typeClean === 'revenue log cash') {
          finalType = 'Revenue';
        } else if (typeClean === 'expense' || typeClean === 'exp' || typeClean === 'debit' || typeClean === 'expense allocation ledger') {
          finalType = 'Expense';
        } else {
          errorsList.push(`Row ${rowNum}: Invalid record type "${rawType}". Must parse to 'Revenue' or 'Expense' status (case-insensitive).`);
          continue;
        }

        const cleanedAmountStr = rawAmount.replace(/[^0-9.-]/g, '');
        const amtNum = parseFloat(cleanedAmountStr);
        if (isNaN(amtNum) || amtNum <= 0) {
          errorsList.push(`Row ${rowNum}: Invalid transaction amount "${rawAmount}". Must be a valid positive number.`);
          continue;
        }

        const cleanedDesc = rawDesc.replace(/^["']|["']$/g, '').trim();
        if (!cleanedDesc) {
          errorsList.push(`Row ${rowNum}: Mandatory description is completely missing or blank.`);
          continue;
        }

        const statusClean = rawStatus.replace(/^["']|["']$/g, '').trim().toLowerCase();
        let finalStatus: 'Approved' | 'Pending Approval' = 'Pending Approval';
        if (statusClean === 'approved' || statusClean === 'success' || statusClean === 'complete') {
          finalStatus = 'Approved';
        } else if (statusClean === 'pending approval' || statusClean === 'pending' || statusClean === 'unapproved' || !statusClean) {
          finalStatus = 'Pending Approval';
        }

        const cleanIdStr = rawId.replace(/^["']|["']$/g, '').trim();
        const finalId = cleanIdStr || `TX-IMP-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`;

        parsed.push({
          id: finalId,
          type: finalType,
          amount: amtNum,
          category: rawCategory.replace(/^["']|["']$/g, '').trim() || 'Imported Allocations',
          timestamp: rawTime.replace(/^["']|["']$/g, '').trim() || new Date().toISOString().replace('T', ' ').slice(0, 16),
          description: cleanedDesc,
          status: finalStatus
        });
      }

      setImportErrors(errorsList);
      setValidRecords(parsed);
    } catch (e: any) {
      setImportErrors([`Failed to parse CSV file structures: ${e.message || e}`]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setImportErrors(["Invalid file format. Please drop a valid .csv file only."]);
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          processCSVText(evt.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          processCSVText(evt.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const executeBulkImportSubmit = () => {
    if (validRecords.length === 0) return;
    if (onBulkImportFinancials) {
      onBulkImportFinancials(validRecords);
    } else {
      // Fallback
      validRecords.forEach(r => onPostFinancial(r));
    }
    setImportSuccessMsg(`Successfully imported ${validRecords.length} financial records to the system ledger!`);
    setTimeout(() => {
      setIsImporting(false);
      setImportSuccessMsg('');
      setValidRecords([]);
      setImportErrors([]);
    }, 2000);
  };

  const handlePostRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmt || !newDesc.trim()) {
      alert('Missing values to queue payroll or financial clearance logs.');
      return;
    }

    const rec: FinancialRecord = {
      id: `TX-${Date.now().toString().slice(-4)}`,
      type: newType,
      amount: Number(newAmt),
      category: newCat,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      description: newDesc,
      status: 'Pending Approval'
    };

    onPostFinancial(rec);
    alert('Financial clearance record posted. Sent to Director for validation signatures.');
    setNewAmt('');
    setNewDesc('');
  };

  const totalRev = financials.filter(f => f.type === 'Revenue' && f.status === 'Approved').reduce((acc, c) => acc + c.amount, 0);
  const totalExp = financials.filter(f => f.type === 'Expense' && f.status === 'Approved').reduce((acc, c) => acc + c.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Interactive Quick View Dropdown Selector (Mobile-First responsive focus) */}
      <div className="bg-surface-container-lowest border border-[#e6decb] p-4 rounded-xl shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-[10px] font-black uppercase text-[#a89078] tracking-[0.2em] font-display block">Work Space Focus</span>
            <h3 className="font-display font-medium text-xs text-zinc-900 uppercase">Interactive Section Jumper</h3>
          </div>
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
            className="bg-[#faf9f6]/90 border border-zinc-300 rounded-lg py-2.5 px-3 text-xs font-black uppercase text-zinc-800 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer w-full sm:w-64"
          >
            <option value="all">Show All Board Sections</option>
            <option value="ledger">Approved & Pending General Ledger Logs</option>
            <option value="post">Sign & Queue Budget Entry form</option>
            <option value="performance">Financial Performance Statistics</option>
          </select>
        </div>
      </div>

      {(activeSection === 'all' || activeSection === 'ledger' || activeSection === 'post' || activeSection === 'performance') && (
      <div className={activeSection === 'all' ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "space-y-6"}>
        
        {/* Ledger lists and financial charts */}
        {(activeSection === 'all' || activeSection === 'ledger') && (
        <div className={activeSection === 'all' ? "lg:col-span-2 bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4" : "bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4"}>
          <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100 flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Coins className="w-5 h-5 text-[#a89078]" />
              Double Entry General Ledger Lists (Approved & Pending)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsImporting(true)}
                type="button"
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
                title="Import Ledger from CSV"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={handleExportCSV}
                type="button"
                className="flex items-center gap-1.5 bg-[#faf9f6] hover:bg-[#eae8e4] border border-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
                title="Export Ledger to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-400">
                  <th className="pb-2">TX Ref</th>
                  <th className="pb-2">Audit Description</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Allocation</th>
                  <th className="pb-2 text-right">Status State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
                {financials.map(f => (
                  <tr key={f.id} className="hover:bg-zinc-50/40">
                    <td className="py-2.5 font-mono text-[10.5px] uppercase">{f.id}</td>
                    <td className="py-2.5 font-sans font-medium text-zinc-855 leading-normal max-w-xs">{f.description}</td>
                    <td className="py-2.5 font-bold">
                      <span className={`px-1.5 py-0.5 rounded uppercase text-[9px] ${
                        f.type === 'Revenue' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                      }`}>
                        {f.type}
                      </span>
                    </td>
                    <td className="py-2.5 font-black text-zinc-900 font-mono">UGX {f.amount.toLocaleString()}</td>
                    <td className="py-2.5 text-right font-bold">
                      <span className={f.status === 'Approved' ? 'text-emerald-700' : 'text-amber-600'}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Post expense or budget allocations */}
        {(activeSection === 'all' || activeSection === 'post' || activeSection === 'performance') && (
        <div className="space-y-6">
          {(activeSection === 'all' || activeSection === 'post') && (
          <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100">
              Log financial Ledger Record
            </h3>

            <form onSubmit={handlePostRecord} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Type of Record</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as 'Revenue' | 'Expense')}
                  className="w-full bg-zinc-50 border border-zinc-200 px-1.5 py-1.5 rounded-lg text-xs"
                >
                  <option value="Expense">Expense Allocation Ledger</option>
                  <option value="Revenue">Revenue Log Cash</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Ledger Category</label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 px-1.5 py-1.5 rounded-lg text-xs"
                >
                  <option value="Payroll Allocation">Staff Payroll Overtime</option>
                  <option value="Facility Maintenance">Facility Repairs Outlays</option>
                  <option value="Inventory Purchase">Supply restocks purchase</option>
                  <option value="Amenities">Amenities & guest setups</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Clearing Amount (UGX)</label>
                <input
                  type="number"
                  required
                  value={newAmt}
                  onChange={(e) => setNewAmt(e.target.value)}
                  placeholder="E.g. 500000"
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Accounting Description Notes</label>
                <input
                  type="text"
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="E.g. Procurement of additional luxury towels sheets..."
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black text-[#f5f0eb] py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-all cursor-pointer"
              >
                Sign & Queue For Director Sig
              </button>
            </form>
          </div>
          )}

          {/* Financial performance print helper */}
          {(activeSection === 'all' || activeSection === 'performance') && (
          <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-3">
            <h4 className="text-xs uppercase font-black text-zinc-700">Financial Performance Card</h4>
            <div className="p-3 bg-[#fcf9f5] border border-zinc-200 text-xs rounded space-y-1.5">
              <div className="flex justify-between font-medium">
                <span>Gross Approved Income:</span>
                <span className="font-bold text-emerald-800">UGX {totalRev.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Settled Expanses:</span>
                <span className="font-bold text-red-800">UGX {totalExp.toLocaleString()}</span>
              </div>
              <div className="border-t border-dashed border-zinc-300 pt-1.5 flex justify-between font-black text-zinc-900">
                <span>Net reserves:</span>
                <span>UGX {(totalRev - totalExp).toLocaleString()}</span>
              </div>
            </div>
          </div>
          )}
        </div>
        )}

      </div>
      )}

      {isImporting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl border border-zinc-200 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-[#fcfbf9]">
              <div>
                <h3 className="font-display font-extrabold text-sm uppercase text-primary">Import Financial Ledger CSV</h3>
                <p className="text-[10px] text-zinc-505 font-sans mt-0.5">Bulk-populate new ledger transactions with automatic data validation checks.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImporting(false);
                  setImportErrors([]);
                  setValidRecords([]);
                }}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700 hover:bg-zinc-200 transition-colors cursor-pointer border border-zinc-200"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* CSV Template Guideline */}
              <div className="bg-[#fbfcfa] border border-dashed border-zinc-200 p-3.5 rounded-lg text-[11px] text-zinc-650 space-y-1.5 text-left">
                <p className="font-black text-zinc-800 uppercase tracking-wide text-[10px]">Expected CSV Header Fields:</p>
                <code className="block bg-zinc-100 p-2 rounded text-zinc-805 font-mono text-[9px] overflow-x-auto whitespace-nowrap">
                  Transaction ID, Type, Amount (UGX), Category, Date/Time, Description, Approval Status
                </code>
                <p className="font-medium text-[10.5px]">
                  * <span className="font-bold">Type</span> must parse to "Revenue" or "Expense".<br />
                  * <span className="font-bold">Amount</span> must be a positive number (currency labels or commas are cleaned automatically).<br />
                  * <span className="font-bold">Description</span> is mandatory. Other fields default to secure system baselines if blank.
                </p>
              </div>

              {/* Drag & Drop File Upload Stage */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/40 text-emerald-800 scale-[1.01]'
                    : 'border-zinc-350 hover:bg-zinc-50/50 text-zinc-500'
                }`}
                onClick={() => document.getElementById('csv-file-input')?.click()}
              >
                <input
                  type="file"
                  id="csv-file-input"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  isDragging ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                }`}>
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h4 className="font-black text-xs uppercase tracking-wide text-zinc-800">
                  Drag & Drop CSV File here
                </h4>
                <p className="text-[10px] text-zinc-500 mt-1">or click to browse local folders</p>
              </div>

              {/* Display success messages or list of records / errors */}
              {importSuccessMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  <span>{importSuccessMsg}</span>
                </div>
              )}

              {/* Error messages reporting box */}
              {importErrors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-1.5 text-left">
                  <div className="flex items-center gap-1.5 text-red-800 font-bold text-xs uppercase">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>Validation errors found ({importErrors.length})</span>
                  </div>
                  <ul className="text-[10px] text-red-700 space-y-1 font-mono list-disc list-inside max-h-36 overflow-y-auto">
                    {importErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-red-600 italic font-sans mt-1">Please correct these rows to satisfy the ledger validation checks and re-upload.</p>
                </div>
              )}

              {/* Valid records preview list */}
              {validRecords.length > 0 && (
                <div className="space-y-2 text-left">
                  <div className="flex items-center justify-between text-xs font-black uppercase text-zinc-500 tracking-wider">
                    <span>Valid Records Pending Import ({validRecords.length})</span>
                    <span className="text-emerald-700 font-bold">Passed Schema Controls</span>
                  </div>
                  <div className="border border-zinc-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-white">
                    <table className="w-full text-left text-[11px] font-sans">
                      <thead className="bg-[#fcfbf9] text-zinc-500 border-b border-zinc-200 uppercase tracking-wider font-bold">
                        <tr>
                          <th className="p-2">TX Ref</th>
                          <th className="p-2">Desc</th>
                          <th className="p-2">Type</th>
                          <th className="p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {validRecords.map((r, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/50">
                            <td className="p-2 font-mono text-[10px] text-zinc-650">{r.id}</td>
                            <td className="p-2 text-zinc-800 max-w-xs truncate">{r.description}</td>
                            <td className="p-2 font-bold uppercase text-[9px]">
                              <span className={`px-1.5 py-0.5 rounded ${r.type === 'Revenue' ? 'bg-emerald-50 text-emerald-850' : 'bg-red-50 text-red-850'}`}>
                                {r.type}
                              </span>
                            </td>
                            <td className="p-2 text-right font-mono font-black text-zinc-900">UGX {r.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-zinc-100 bg-[#fcfbf9] flex gap-3.5 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsImporting(false);
                  setImportErrors([]);
                  setValidRecords([]);
                }}
                className="bg-zinc-100 hover:bg-zinc-205 text-zinc-700 py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={validRecords.length === 0}
                onClick={executeBulkImportSubmit}
                className={`py-2.5 px-5 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow ${
                  validRecords.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Import {validRecords.length} Records</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


// ==========================================
// 7. INVENTORY OFFICER SCREEN
// ==========================================
interface InventoryProps {
  stock: StockItem[];
  onRequestRestock: (id: string) => void;
  onPostFinancial: (f: FinancialRecord) => void;
}

export function InventoryScreen({
  stock,
  onRequestRestock,
  onPostFinancial
}: InventoryProps) {
  const [newStockName, setNewStockName] = useState('');
  const [newStockCount, setNewStockCount] = useState('');
  const [newStockMin, setNewStockMin] = useState('');
  const [stockPrice, setStockPrice] = useState('');
  const [stockCategory, setStockCategory] = useState<'Housekeeping' | 'Kitchen' | 'Restaurant' | 'Bar' | 'Maintenance'>('Housekeeping');
  const [activeSection, setActiveSection] = useState<string>('all');

  const handleRegisterInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStockName.trim() || !newStockCount || !newStockMin || !stockPrice) {
      alert('Missing input parameters.');
      return;
    }

    const priceNum = Number(stockPrice);
    const countNum = Number(newStockCount);

    const fRec: FinancialRecord = {
      id: `TX-${Date.now().toString().slice(-4)}`,
      type: 'Expense',
      amount: priceNum * countNum,
      category: 'Inventory Purchase',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      description: `Stockroom onboarding: ${newStockName} (${countNum} package)`,
      status: 'Pending Approval'
    };

    onPostFinancial(fRec);
    alert('Onboarded item logged as pending expense. Restocking triggered successfully.');
    setNewStockName('');
    setNewStockCount('');
    setNewStockMin('');
    setStockPrice('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Interactive Quick View Dropdown Selector (Mobile-First responsive focus) */}
      <div className="bg-surface-container-lowest border border-[#e6decb] p-4 rounded-xl shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-[10px] font-black uppercase text-[#a89078] tracking-[0.2em] font-display block">Work Space Focus</span>
            <h3 className="font-display font-medium text-xs text-zinc-900 uppercase">Interactive Section Jumper</h3>
          </div>
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
            className="bg-[#faf9f6]/90 border border-zinc-300 rounded-lg py-2.5 px-3 text-xs font-black uppercase text-zinc-800 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer w-full sm:w-64"
          >
            <option value="all">Show All Board Sections</option>
            <option value="stock">General Stockroom Counts & Warehouse Records</option>
            <option value="procure">Log Warehouse Supply Procurement</option>
          </select>
        </div>
      </div>

      {(activeSection === 'all' || activeSection === 'stock' || activeSection === 'procure') && (
      <div className={activeSection === 'all' ? "grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" : "space-y-6"}>
        
        {/* Stock logs tracker */}
        {(activeSection === 'all' || activeSection === 'stock') && (
        <div className={activeSection === 'all' ? "lg:col-span-2 bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4" : "bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4"}>
          <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100 flex items-center gap-1.5">
            <Package className="w-5 h-5 text-zinc-850" />
            General Stockroom Counts & Warehouse Records
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-400">
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Supply Item</th>
                  <th className="pb-2">Warehouse class</th>
                  <th className="pb-2">Stock Level</th>
                  <th className="pb-2 text-right">Reorder status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
                {stock.map(sk => {
                  const isUnder = sk.stockCount <= sk.minLimit;
                  return (
                    <tr key={sk.id} className="hover:bg-zinc-50/40">
                      <td className="py-2.5 font-mono text-zinc-400 font-bold">{sk.id}</td>
                      <td className="py-2.5 font-bold text-zinc-900">{sk.name}</td>
                      <td className="py-2.5">
                        <span className="text-[10px] bg-neutral-100 text-zinc-700 px-1.5 py-0.5 rounded font-black">
                          {sk.category}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className={isUnder ? 'text-amber-600 font-black' : 'text-zinc-800'}>
                          {sk.stockCount} left (min: {sk.minLimit})
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-black">
                        {isUnder ? (
                          <button
                            onClick={() => onRequestRestock(sk.id)}
                            className="bg-black hover:bg-neutral-800 text-[9px] uppercase tracking-wider text-[#f5f0eb] px-2.5 py-1 rounded cursor-pointer"
                          >
                            Auto Restock
                          </button>
                        ) : (
                          <span className="text-emerald-700 font-bold uppercase text-[9px] tracking-wider">OPT_SATIABLE</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Warehouse procurement requests */}
        {(activeSection === 'all' || activeSection === 'procure') && (
        <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
          <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100">
            Log Warehouse supply
          </h3>

          <form onSubmit={handleRegisterInventory} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Item Name</label>
              <input
                type="text"
                required
                value={newStockName}
                onChange={(e) => setNewStockName(e.target.value)}
                placeholder="E.g. Eco Toilet Soaps"
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Distribution Class</label>
              <select
                value={stockCategory}
                onChange={(e) => setStockCategory(e.target.value as any)}
                className="w-full bg-zinc-50 border border-zinc-200 px-1 py-1.5 rounded-lg text-xs"
              >
                <option value="Housekeeping">Housekeeping Inventory</option>
                <option value="Kitchen">Kitchen Supplies</option>
                <option value="Bar">Bar & Beverage</option>
                <option value="Maintenance">Maintenance Gaskets</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Order Qty</label>
                <input
                  type="number"
                  required
                  value={newStockCount}
                  onChange={(e) => setNewStockCount(e.target.value)}
                  placeholder="E.g. 50"
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Safety Limit</label>
                <input
                  type="number"
                  required
                  value={newStockMin}
                  onChange={(e) => setNewStockMin(e.target.value)}
                  placeholder="E.g 10"
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Unit Procurement Price (UGX)</label>
              <input
                type="number"
                required
                value={stockPrice}
                onChange={(e) => setStockPrice(e.target.value)}
                placeholder="E.g. 15000"
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black text-[#f5f0eb] py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-all cursor-pointer"
            >
              Queue Purchase Ledger
            </button>
          </form>
        </div>
        )}
      </div>
      )}

    </div>
  );
}


// ==========================================
// 8. SECURITY OFFICER SCREEN
// ==========================================
interface SecurityProps {
  visitors: VisitorLog[];
  incidents: IncidentReport[];
  onAddVisitor: (vis: VisitorLog) => void;
  onAddIncident: (inc: IncidentReport) => void;
  onUpdateIncidentStatus: (id: string, stat: 'Investigation' | 'Resolved') => void;
}

export function SecurityScreen({
  visitors,
  incidents,
  onAddVisitor,
  onAddIncident,
  onUpdateIncidentStatus
}: SecurityProps) {
  const [visitorName, setVisitorName] = useState('');
  const [hostName, setHostName] = useState('');
  const [roomVisited, setRoomVisited] = useState('');
  const [carPlate, setCarPlate] = useState('');

  const [incidentTitle, setIncidentTitle] = useState('');
  const [severity, setSeverity] = useState<'Low' | 'Medium' | 'Critical'>('Low');
  const [incidentLocation, setIncidentLocation] = useState('');
  const [activeSection, setActiveSection] = useState<string>('all');

  const handleCreateVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !hostName.trim() || !roomVisited.trim()) {
      alert('Required visitor records missing.');
      return;
    }

    const vis: VisitorLog = {
      id: `VIS-${Date.now().toString().slice(-4)}`,
      visitorName,
      hostGuestName: hostName,
      roomVisited,
      vehicleLicense: carPlate || undefined,
      checkInTime: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    onAddVisitor(vis);
    alert(`Visitor check-in logged to guard terminal successfully.`);
    setVisitorName('');
    setHostName('');
    setRoomVisited('');
    setCarPlate('');
  };

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentTitle.trim() || !incidentLocation.trim()) return;

    const inc: IncidentReport = {
      id: `INC-${Date.now().toString().slice(-4)}`,
      title: incidentTitle,
      severity,
      location: incidentLocation,
      reportedBy: 'Security Guard Guard Central Desk',
      time: 'Just now',
      status: 'Investigation'
    };

    onAddIncident(inc);
    alert(`Incident logged. Alert notifications broadcasted to executive levels.`);
    setIncidentTitle('');
    setIncidentLocation('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Interactive Quick View Dropdown Selector (Mobile-First responsive focus) */}
      <div className="bg-surface-container-lowest border border-[#e6decb] p-4 rounded-xl shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-[10px] font-black uppercase text-[#a89078] tracking-[0.2em] font-display block">Work Space Focus</span>
            <h3 className="font-display font-medium text-xs text-zinc-900 uppercase">Interactive Section Jumper</h3>
          </div>
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
            className="bg-[#faf9f6]/90 border border-zinc-300 rounded-lg py-2.5 px-3 text-xs font-black uppercase text-zinc-800 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer w-full sm:w-64"
          >
            <option value="all">Show All Board Sections</option>
            <option value="visitors">Active Visitor & Vehicle Log Tracker</option>
            <option value="incidents">Secure Incident logs & Active Investigations</option>
            <option value="report-incident">Log Incident Checkpoint Report</option>
            <option value="check-visitor">Check-In Active Visitor Passport</option>
          </select>
        </div>
      </div>

      {(activeSection === 'all' || activeSection === 'visitors' || activeSection === 'incidents' || activeSection === 'report-incident' || activeSection === 'check-visitor') && (
      <div className={activeSection === 'all' ? "grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" : "space-y-6"}>
        
        {/* Visitor tracking logs */}
        {(activeSection === 'all' || activeSection === 'visitors' || activeSection === 'incidents') && (
        <div className={activeSection === 'all' ? "lg:col-span-2 space-y-6" : "space-y-6"}>
          
          {/* Visitors Logged table */}
          {(activeSection === 'all' || activeSection === 'visitors') && (
          <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100 flex items-center gap-1.5">
              <Car className="w-5 h-5 text-zinc-850" />
              Active Visitor & Vehicle Log Tracker
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-400">
                    <th className="pb-2">Visitor</th>
                    <th className="pb-2">Host client</th>
                    <th className="pb-2">Room / Sector</th>
                    <th className="pb-2">Vehicle Plate</th>
                    <th className="pb-2 text-right">Access Stamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs text-zinc-750 font-sans font-medium">
                  {visitors.map(v => (
                    <tr key={v.id}>
                      <td className="py-2.5 font-bold text-zinc-900">{v.visitorName}</td>
                      <td className="py-2.5">{v.hostGuestName}</td>
                      <td className="py-2.5">Room {v.roomVisited}</td>
                      <td className="py-2.5 font-mono text-[10.5px] font-bold text-[#a89078]">{v.vehicleLicense || 'LOBBY_ENTRY'}</td>
                      <td className="py-2.5 text-right font-mono text-[10px] text-zinc-400">{v.checkInTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Security Incidents Table */}
          {(activeSection === 'all' || activeSection === 'incidents') && (
          <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="font-display font-black text-sm uppercase text-primary pb-3 border-b border-zinc-100 flex items-center gap-1.5">
              <ShieldAlert className="w-5 h-5 text-zinc-850" />
              Secure Incident logs & Active Investigations
            </h3>

            <div className="space-y-2.5">
              {incidents.map(inc => (
                <div key={inc.id} className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg flex justify-between items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900">{inc.title}</span>
                      <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 rounded-full ${
                        inc.severity === 'Critical' ? 'bg-red-100 text-red-800 animate-ping' : 'bg-zinc-105 text-zinc-650'
                      }`}>{inc.severity}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Location: {inc.location} | Logged: {inc.time}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold font-sans ${inc.status === 'Resolved' ? 'text-emerald-700' : 'text-amber-600'}`}>
                      {inc.status}
                    </span>
                    {inc.status === 'Investigation' && (
                      <button
                        onClick={() => onUpdateIncidentStatus(inc.id, 'Resolved')}
                        className="bg-black hover:bg-neutral-800 text-white font-bold text-[9px] uppercase px-2 py-1 rounded cursor-pointer"
                      >
                        Resolve Code
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

        </div>
        )}

        {/* Front security checkpoint checklist */}
        {(activeSection === 'all' || activeSection === 'report-incident' || activeSection === 'check-visitor') && (
        <div className="space-y-6">
          
          {/* Log Visitor check-in Form */}
          {(activeSection === 'all' || activeSection === 'report-incident') && (
          <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-3.5 animate-blur">
            <h3 className="font-display font-black text-sm uppercase text-primary pb-2 border-b border-zinc-100">
              Log Incident Checkpoint Report
            </h3>

            <form onSubmit={handleCreateIncident} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Incident Title</label>
                <input
                  type="text"
                  required
                  value={incidentTitle}
                  onChange={(e) => setIncidentTitle(e.target.value)}
                  placeholder="E.g. Unlocked entrance gate B detected"
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xsOutline focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Security Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full bg-zinc-50 border border-zinc-200 px-1.5 py-1.5 rounded-lg text-xs"
                >
                  <option value="Low">Low - Informational logs</option>
                  <option value="Medium">Medium - Requires supervisor checks</option>
                  <option value="Critical">Critical - Alerts Director instantly</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Location Area</label>
                <input
                  type="text"
                  required
                  value={incidentLocation}
                  onChange={(e) => setIncidentLocation(e.target.value)}
                  placeholder="E.g. South Terrace Deck"
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black text-[#f5f0eb] py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-all cursor-pointer"
              >
                Sign Alert Log
              </button>
            </form>
          </div>
          )}

          {/* Checkpoint Board */}
          {(activeSection === 'all' || activeSection === 'check-visitor') && (
          <div className="bg-surface-container-lowest border border-[#f3f0ec] p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="font-display font-black text-xs uppercase text-zinc-700">Check-In Active Visitor</h3>
            
            <form onSubmit={handleCreateVisitor} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Visitor name..."
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
              />
              <input
                type="text"
                required
                placeholder="Onboard Host Guest Name..."
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
              />
              <input
                type="text"
                required
                placeholder="Room No e.g. 402..."
                value={roomVisited}
                onChange={(e) => setRoomVisited(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
              />
              <input
                type="text"
                placeholder="Vehicle plate or LOBBY (optional)..."
                value={carPlate}
                onChange={(e) => setCarPlate(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
              />
              <button
                type="submit"
                className="w-full bg-primary text-on-primary py-2.5 rounded-lg text-xs uppercase font-black tracking-widest hover:bg-black transition-all cursor-pointer"
              >
                Issue Credentials QR pass
              </button>
            </form>
          </div>
          )}

        </div>
        )}

      </div>
      )}

    </div>
  );
}


// ==========================================
// 9. GUEST MOBILE PORTAL
// ==========================================
interface GuestProps {
  rooms: Room[];
  reservations: Reservation[];
  messages: InternalMessage[];
  guests: GuestCRM[];
  allNotifications: SystemNotification[];
  onAddMessage: (text: string) => void;
  onPostMaintenanceTicket: (t: MaintenanceTicket) => void;
  onAddNotification: (n: SystemNotification) => void;
  onPostServiceRequest?: (roomNo: string, requestType: string, details?: string) => void;
  serviceRequests?: ServiceRequest[];
}

export function GuestPortalScreen({
  rooms,
  reservations,
  messages,
  guests,
  allNotifications,
  onAddMessage,
  onPostMaintenanceTicket,
  onAddNotification,
  onPostServiceRequest,
  serviceRequests
}: GuestProps) {
  const fallbackGuest: GuestCRM = {
    id: 'TH-2026-TEMP',
    fullName: 'Guest User',
    phone: '+1 (555) 555-5555',
    email: 'guest@tranquilhaven.com',
    passport: 'US-AA000000',
    nationalId: 'NID-000000',
    emergencyContact: 'None',
    loyaltyPoints: 0,
    spendingHistory: 0,
    checkedInRoom: '402',
    historyLogs: []
  };

  const activeGuest = guests[0] || fallbackGuest;
  const [reqService, setReqService] = useState('');
  const [guestInboxInput, setGuestInboxInput] = useState('');
  const [ratings, setRatings] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [activeSection, setActiveSection] = useState<string>('all');

  // Auto response chatbot replies
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestInboxInput.trim()) return;

    // Post message
    onAddMessage(guestInboxInput);
    const guestQuery = guestInboxInput;
    setGuestInboxInput('');

    // Trigger auto butler bot response
    setTimeout(() => {
      let botText = "Thank you for contacting Tranquil Haven Butler Team. Your prompt has been logged, we will fulfill this in under 10 minutes.";
      if (guestQuery.toLowerCase().includes('wifi') || guestQuery.toLowerCase().includes('internet')) {
        botText = "The secure high-speed Wi-Fi access SSID is 'Tranquil_Haven_VIP' and secure passcode is 'havenlyComfort2026'.";
      } else if (guestQuery.toLowerCase().includes('towel') || guestQuery.toLowerCase().includes('linen')) {
        botText = "Linen request received. Our cleaner James Chen has been dispatched with pristine organic cotton towels pack.";
      } else if (guestQuery.toLowerCase().includes('coffee') || guestQuery.toLowerCase().includes('food')) {
        botText = "Your artisanal coffee delivery is currently being prepared by the barista. Expect room arrival shortly.";
      }
      
      onAddMessage(`Tranquil Haven Bot: ${botText}`);
    }, 1200);
  };

  const handleRequestService = (service: string) => {
    const ticket: MaintenanceTicket = {
      id: `TCK-${Date.now().toString().slice(-4)}`,
      location: `Room ${activeGuest.checkedInRoom || '402'}`,
      issue: `Guest Requested Service: ${service}`,
      type: 'cleaning_services',
      category: 'Routine',
      status: 'ACTIVE',
      reportedTime: 'Just now',
      assignedStaff: 'Unassigned'
    };

    onPostMaintenanceTicket(ticket);

    onAddNotification({
      id: `N-${Date.now()}`,
      title: 'Guest Service Request',
      text: `${activeGuest.fullName} in suite ${activeGuest.checkedInRoom || '402'} requested '${service}'. Housekeeping queue updated.`,
      urgency: 'Normal',
      level: 1,
      timestamp: 'Just now',
      acknowledgedBy: []
    });

    alert(`Standard request dispatched: ${service}. Staff notified!`);
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;
    alert(`Thank you for your rating of ${ratings} stars! Sincere comments log saved.`);
    setFeedbackText('');
  };

  return (
    <div className="max-w-md mx-auto bg-surface-container-lowest border border-[#eae8e4] p-5 rounded-[40px] shadow-2xl relative animate-fade-in my-4">
      {/* Phone camera notch design accent */}
      <div className="w-32 h-5 bg-black rounded-full mx-auto mb-4 relative flex items-center justify-center">
        <span className="w-1.5 h-1.5 bg-zinc-800 rounded-full block mr-10" />
      </div>

      <div className="space-y-5">
        
        {/* Header Branding */}
        <div className="text-center pb-3 border-b border-[#f4f1ee]">
          <span className="text-[9px] font-black uppercase text-[#a89078] tracking-[0.3em] block">Tranquil Haven Mobile Portal</span>
          <h3 className="font-display font-black text-xl text-black">Guest Digital Ledger</h3>
          <p className="text-[10px] text-zinc-400 font-mono">Welcome back, {activeGuest.fullName}</p>
        </div>

        {/* Interactive Quick View Dropdown Selector (Mobile-First responsive focus) */}
        <div className="bg-[#faf9f6]/80 border border-[#e6decb] p-3 rounded-2xl shadow-xs space-y-1.5">
          <span className="text-[8px] font-black uppercase text-[#a89078] tracking-[0.2em] font-display block text-center">Service Navigator</span>
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
            className="bg-white border border-zinc-200 rounded-lg py-2 px-2.5 text-xs font-black uppercase text-zinc-850 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer w-full text-center"
          >
            <option value="all">Show All Amenities</option>
            <option value="profile">Room & Stay profile information</option>
            <option value="amenities">Request Guest Service Amenities</option>
            <option value="butler-chat">Direct Butler Live Thread</option>
            <option value="feedback">Settle Departure Feedback</option>
          </select>
        </div>

        {/* Room & Stay Profile Information */}
        {(activeSection === 'all' || activeSection === 'profile') && (
        <div className="bg-[#f5f0eb] border border-black/10 rounded-2xl p-4 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black uppercase text-zinc-700 tracking-wider font-display">Assigned Quarters</span>
            <span className="text-sm font-display font-black tracking-widest text-[#a89078]">SUITE {activeGuest.checkedInRoom || '402'}</span>
          </div>
          <div className="text-xs space-y-1 text-zinc-700 font-sans font-medium">
            <p>Reservation Status: <span className="font-bold text-emerald-800">Checked In</span></p>
            <p>Loyalty tier: <span className="text-amber-800 font-bold">Elite Black Label ({activeGuest.loyaltyPoints} PTS)</span></p>
            <p>Access SSID: <span className="font-mono bg-white px-1.5 rounded border border-zinc-200">Tranquil_Haven_VIP</span></p>
          </div>
        </div>
        )}

        {/* Request Service Form */}
        {(activeSection === 'all' || activeSection === 'amenities') && (
        <div id="guest-service-request-box" className="bg-[#fbfcfa] border border-zinc-200 rounded-2xl p-4.5 space-y-3 shadow-xs">
          <span className="text-[10px] font-black uppercase text-zinc-700 tracking-wider font-display block">
            Request Guest Service Amenities
          </span>
          <div className="space-y-2.5">
            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 uppercase font-black">Amenity Type</label>
              <select
                value={reqService}
                onChange={(e) => setReqService(e.target.value)}
                className="w-full bg-white border border-zinc-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold font-sans outline-none focus:ring-1 focus:ring-zinc-400"
              >
                <option value="">-- Choose Amenity --</option>
                <option value="Tea">Tea</option>
                <option value="Coffee">Coffee</option>
                <option value="Food">Food (Room Service Order)</option>
                <option value="Water">Water (Still/Sparkling)</option>
                <option value="Laundry">Laundry Service</option>
                <option value="Extra Towels">Extra Towels Pack</option>
                <option value="Room Cleaning">Room Cleaning Turnaround</option>
                <option value="Airport Pickup">Airport Pickup Dispatch</option>
                <option value="Maintenance Assistance">Maintenance Technical Assistance</option>
                <option value="Custom Requests">Custom Request (Describe below)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 uppercase font-black block">Special Directions / Custom request details</label>
              <input
                type="text"
                id="guest-request-details"
                placeholder="E.g. Extra sugar, hot milk, or custom details..."
                className="w-full bg-white border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
              />
            </div>

            <button
              onClick={() => {
                const selectElement = reqService;
                if (!selectElement) {
                  alert('Please choose an amenity from the dropdown.');
                  return;
                }
                const detailsInput = (document.getElementById('guest-request-details') as HTMLInputElement)?.value || '';
                
                if (onPostServiceRequest) {
                  onPostServiceRequest(activeGuest.checkedInRoom || '402', selectElement, detailsInput);
                } else {
                  handleRequestService(`${selectElement} (${detailsInput})`);
                }
                
                setReqService('');
                if (document.getElementById('guest-request-details')) {
                  (document.getElementById('guest-request-details') as HTMLInputElement).value = '';
                }
                alert('Service request dispatched to hotel desk! Fulfilling in under 10 minutes.');
              }}
              className="w-full bg-black hover:bg-zinc-800 text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition cursor-pointer"
            >
              Request Service Button
            </button>
          </div>
        </div>
        )}

        {/* Mobile Chat Interface */}
        {(activeSection === 'all' || activeSection === 'butler-chat') && (
        <div className="border border-[#f4f1ee] rounded-2.5xl p-3 bg-zinc-50 flex flex-col h-[200px]">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Direct Butler Live Thread</span>
          
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 my-1.5 text-[10px]">
            {messages.slice(-4).map((m, t) => (
              <div key={t} className={`flex flex-col ${m.senderName === activeGuest.fullName ? 'items-end' : 'items-start'}`}>
                <span className="text-[7.5px] text-zinc-400 font-bold">{m.senderName}</span>
                <p className={`p-2 rounded-lg max-w-[80%] font-sans font-medium leading-relaxed ${
                  m.senderName === activeGuest.fullName ? 'bg-black text-[#f5f0eb] rounded-tr-none' : 'bg-neutral-150 text-zinc-800 rounded-tl-none'
                }`}>
                  {m.text}
                </p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChat} className="flex gap-1">
            <input
              type="text"
              placeholder="Ask the desk butler..."
              value={guestInboxInput}
              onChange={(e) => setGuestInboxInput(e.target.value)}
              className="flex-1 bg-white border border-zinc-200 rounded-lg px-2.5 text-[10.5px] outline-none"
            />
            <button
              type="submit"
              className="bg-black text-white p-1 rounded-lg cursor-pointer"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
        )}

        {/* Departure Feedback Card */}
        {(activeSection === 'all' || activeSection === 'feedback') && (
        <div className="bg-[#fcf9f6] border border-zinc-200 rounded-2xl p-4.5 space-y-3">
          <span className="text-[9.5px] font-extrabold uppercase text-zinc-700 tracking-wider font-display block">Settle Feedback</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(st => (
              <button
                key={st}
                onClick={() => setRatings(st)}
                className={`text-sm cursor-pointer transition-all ${ratings >= st ? 'text-amber-500' : 'text-zinc-350'}`}
              >
                ★
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Your comments..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="flex-1 bg-white border border-zinc-200 px-3 py-1 text-xs rounded"
            />
            <button
              onClick={handleSendFeedback}
              className="bg-black hover:bg-neutral-800 text-[#f5f0eb] border-none text-[10px] uppercase font-black tracking-wide px-3 rounded cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
        )}

      </div>
    </div>
  );
}

// Simple Helper components to avoid React typescript compilation errors
function BedDoubleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 4v16" />
      <path d="M2 8h20" />
      <path d="M2 17h20" />
      <path d="M22 4v16" />
      <path d="M12 8v9" />
      <path d="M6 12h12" />
    </svg>
  );
}

function BedIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 4v16" />
      <path d="M22 4v16" />
      <path d="M2 8h20" />
      <path d="M2 17h20" />
    </svg>
  );
}

function Bell({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
