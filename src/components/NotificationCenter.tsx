/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNotificationSystem, EnterpriseNotification } from '../context/NotificationContext';
import { UserRole } from '../types';
import { 
  Bell, X, Shield, Clock, Check, Users, ShieldAlert, AlertTriangle, 
  Trash2, FileText, CheckCircle, BarChart2, ListFilter, PlayCircle
} from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  currentUsername?: string;
}

export function NotificationCenter({ isOpen, onClose, currentRole, currentUsername = 'Alex Mercer' }: NotificationCenterProps) {
  const { 
    notifications, 
    auditLogs, 
    acknowledgeNotification, 
    dismissNotification, 
    deleteNotification,
    updateStatus, 
    analytics,
    playNotificationSound
  } = useNotificationSystem();

  const [activeTab, setActiveTab] = useState<'active' | 'in-progress' | 'overdue' | 'completed'>('active');
  const [filterType, setFilterType] = useState<'my' | 'department' | 'all'>('all');
  const [activeView, setActiveView] = useState<'notifications' | 'audit' | 'analytics'>('notifications');

  // Trigger sound test
  const handleSoundTest = () => {
    playNotificationSound('newItem');
  };

  // Helper to check if a notification belongs to the user's role
  const isTargetedToMe = (n: EnterpriseNotification): boolean => {
    if (currentRole === 'Director') return true;
    return n.targetRoles.includes(currentRole);
  };

  // Helper to check department classification
  const isDepartmentNotification = (n: EnterpriseNotification): boolean => {
    if (currentRole === 'Director' || currentRole === 'Manager') return true;
    
    // Housekeeping & Maintenance matching
    if (currentRole === 'Maintenance Officer' && (
      n.type === 'housekeeping' || 
      n.type === 'emergency' || 
      n.type === 'service_request' || 
      n.title.toLowerCase().includes('clean') || 
      n.title.toLowerCase().includes('maintenance')
    )) return true;
    
    // Receptionist matching
    if (currentRole === 'Receptionist' && (n.type === 'service_request' || n.type === 'vip' || n.type === 'general')) return true;

    // Default: check if role is in targetRoles
    return n.targetRoles.includes(currentRole);
  };

  // 1. FILTER NOTIFICATIONS BY ROLE VISIBILITY
  const getRoleFilteredNotifications = (): EnterpriseNotification[] => {
    return notifications.filter(n => {
      if (currentRole === 'Director') {
        // Director sees all
        return true;
      }
      if (currentRole === 'Manager') {
        // Manager sees all operations
        return ['housekeeping', 'service_request', 'emergency', 'vip', 'inventory', 'general', 'incident'].includes(n.type) || n.level <= 2;
      }
      if (currentRole === 'Receptionist') {
        // Receptionist sees guest requests, room status updates, booking notifications
        return n.type === 'service_request' || n.type === 'vip' || n.type === 'general' || n.title.toLowerCase().includes('booking') || n.title.toLowerCase().includes('walk-in') || n.title.toLowerCase().includes('clean');
      }
      if (currentRole === 'Maintenance Officer') {
        // Maintenance Officer sees housekeeping status, assignments, and mechanical alerts
        return n.type === 'housekeeping' || n.type === 'emergency' || n.type === 'service_request' || n.title.toLowerCase().includes('clean') || n.title.toLowerCase().includes('maintenance') || n.message.toLowerCase().includes('clean');
      }
      // Other roles see target roles
      return n.targetRoles.includes(currentRole);
    });
  };

  // 2. APPLY NOTIFICATION CENTER FILTERS (MY / DEPT / ALL)
  const getTabAndFilterFilteredNotifications = (): EnterpriseNotification[] => {
    let list = getRoleFilteredNotifications();

    // Filter by type
    if (filterType === 'my') {
      list = list.filter(isTargetedToMe);
    } else if (filterType === 'department') {
      list = list.filter(isDepartmentNotification);
    }

    // Filter by tab status
    return list.filter(n => {
      const isCompleted = n.status === 'COMPLETED';
      const isDismissed = n.status === 'DISMISSED';

      const elapsedMs = Date.now() - new Date(n.createdAt).getTime();
      const isOverdue = !isCompleted && !isDismissed && elapsedMs >= 600000; // 10 minutes

      if (activeTab === 'completed') {
        return isCompleted || isDismissed;
      }
      if (activeTab === 'overdue') {
        return isOverdue;
      }
      if (activeTab === 'in-progress') {
        return n.status === 'IN_PROGRESS' || n.status === 'ACKNOWLEDGED';
      }
      // 'active' tab
      return n.status === 'PENDING' && !isOverdue;
    });
  };

  const filteredList = getTabAndFilterFilteredNotifications();

  // Helper to calculate waiting time in minutes
  const getMinutesWaiting = (createdAtStr: string): number => {
    const elapsedMs = Date.now() - new Date(createdAtStr).getTime();
    return Math.floor(elapsedMs / 60000);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 transition-opacity" 
      />

      {/* Slide-out drawer panel */}
      <div className="fixed inset-y-0 right-0 max-w-lg w-full bg-[#fcf9f5] border-l border-[#e5dfd5] shadow-2xl z-50 flex flex-col font-sans select-none text-[#1c1c1a]">
        
        {/* HEADER PANEL */}
        <div className="p-4 bg-emerald-950 text-[#f5f0eb] flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/10 rounded-lg">
              <Bell className="w-4 h-4 text-amber-300 animate-swing" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest font-mono text-white">Tranquil Operations</h2>
              <span className="text-[9.5px] font-sans font-medium text-emerald-200 uppercase tracking-wider block mt-0.5">
                Role: {currentRole} Security Lockbox
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 transition-colors text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5 block" />
          </button>
        </div>

        {/* CONTROLLER SWITCHBAR */}
        <div className="grid grid-cols-3 border-b border-[#e5dfd5] bg-white/65 backdrop-blur-md">
          <button
            onClick={() => setActiveView('notifications')}
            className={`py-3 text-[10px] uppercase tracking-wider font-extrabold flex items-center justify-center gap-1.5 transition-all outline-none border-b-2 cursor-pointer ${
              activeView === 'notifications' 
                ? 'border-emerald-800 text-emerald-900 bg-[#fbf8f3]' 
                : 'border-transparent text-zinc-500 hover:text-black hover:bg-[#faf6f0]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Alerts
          </button>
          <button
            onClick={() => setActiveView('audit')}
            className={`py-3 text-[10px] uppercase tracking-wider font-extrabold flex items-center justify-center gap-1.5 transition-all outline-none border-b-2 cursor-pointer ${
              activeView === 'audit' 
                ? 'border-emerald-800 text-emerald-900 bg-[#fbf8f3]' 
                : 'border-transparent text-zinc-500 hover:text-black hover:bg-[#faf6f0]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Audit Logs
          </button>
          <button
            onClick={() => setActiveView('analytics')}
            className={`py-3 text-[10px] uppercase tracking-wider font-extrabold flex items-center justify-center gap-1.5 transition-all outline-none border-b-2 cursor-pointer ${
              activeView === 'analytics' 
                ? 'border-emerald-800 text-emerald-900 bg-[#fbf8f3]' 
                : 'border-transparent text-zinc-500 hover:text-black hover:bg-[#faf6f0]'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Analytics
          </button>
        </div>

        {/* MAIN PANEL CONTENT SPACE */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* VIEW: NOTIFICATIONS */}
          {activeView === 'notifications' && (
            <div className="space-y-4">
              
              {/* STATUS TAB SELECTOR */}
              <div className="flex border border-[#eae2d5] rounded-lg p-1 bg-white/60 shadow-inner">
                {(['active', 'in-progress', 'overdue', 'completed'] as const).map(tab => {
                  const count = notifications.filter(n => {
                    const isCompleted = n.status === 'COMPLETED';
                    const isDismissed = n.status === 'DISMISSED';
                    const elapsedMs = Date.now() - new Date(n.createdAt).getTime();
                    const isOverdue = !isCompleted && !isDismissed && elapsedMs >= 600000;

                    if (tab === 'completed') return isCompleted || isDismissed;
                    if (tab === 'overdue') return isOverdue;
                    if (tab === 'in-progress') return n.status === 'IN_PROGRESS' || n.status === 'ACKNOWLEDGED';
                    return n.status === 'PENDING' && !isOverdue;
                  }).length;

                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-md tracking-wider transition-all duration-150 cursor-pointer ${
                        activeTab === tab
                          ? 'bg-zinc-900 text-white shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      {tab} ({count})
                    </button>
                  );
                })}
              </div>

              {/* FILTERS SEGMENT */}
              <div className="flex justify-between items-center bg-white border border-[#eae2d5] p-2.5 rounded-xl">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <ListFilter className="w-3 h-3 text-[#a89078] block" />
                  Visibility Domain:
                </span>
                <div className="flex gap-1">
                  {(['all', 'department', 'my'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-2.5 py-1 text-[9px] font-bold rounded uppercase border transition-colors cursor-pointer ${
                        filterType === type
                          ? 'bg-emerald-800 border-emerald-950 text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-100'
                      }`}
                    >
                      {type === 'my' ? 'My' : type === 'department' ? 'Dept' : 'Hotel'}
                    </button>
                  ))}
                </div>
              </div>

              {/* LIST CONTAINER */}
              <div className="space-y-3">
                {filteredList.length === 0 ? (
                  <div className="text-center py-10 bg-white border border-dashed border-zinc-300 rounded-xl max-w-md mx-auto p-4">
                    <CheckCircle className="w-6 h-6 text-emerald-600 block mx-auto opacity-40 animate-pulse" />
                    <p className="text-[11px] font-black uppercase text-zinc-500 mt-2 tracking-widest">Awaiting Queue Intake</p>
                    <p className="text-[10px] text-zinc-400 font-sans mt-1 leading-relaxed">
                      No matching operational indicators recorded in your visibility domain. All parameters stabilized.
                    </p>
                  </div>
                ) : (
                  filteredList.map(n => {
                    const waitingMins = getMinutesWaiting(n.createdAt);
                    const isVip = n.type === 'vip';
                    const isEmergency = n.type === 'emergency';
                    const isOverdue = activeTab === 'overdue';
                    
                    // Priority style bindings
                    const badgeStyles = () => {
                      if (isEmergency || n.priority === 'CRITICAL') return 'bg-red-150 text-red-900 border-red-300';
                      if (n.priority === 'URGENT') return 'bg-orange-100 text-orange-900 border-orange-300';
                      if (isVip || n.priority === 'HIGH') return 'bg-amber-100 text-amber-900 border-amber-300';
                      return 'bg-zinc-100 text-zinc-900 border-zinc-300';
                    };

                    return (
                      <div 
                        key={n.id}
                        className={`bg-white border rounded-xl p-3.5 space-y-3 shadow-xs hover:shadow-md transition-all relative overflow-hidden ${
                          isEmergency || n.priority === 'CRITICAL' ? 'border-red-400' : 'border-[#e4ded4]'
                        }`}
                      >
                        {/* Urgent Alert Stripe */}
                        {(isEmergency || n.priority === 'CRITICAL') && (
                          <div className="absolute top-0 left-0 h-full w-1 bg-red-600" />
                        )}

                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded border ${badgeStyles()}`}>
                                {n.priority}
                              </span>
                              <span className="text-[8.5px] font-mono bg-[#eae5de] font-extrabold uppercase px-1.5 py-0.5 rounded text-zinc-800">
                                {n.type}
                              </span>
                              {n.roomNumber && (
                                <span className="text-[8.5px] font-mono bg-black text-[#f5f0eb] font-black uppercase px-1.5 py-0.5 rounded">
                                  SUITE: {n.roomNumber}
                                </span>
                              )}
                            </div>
                            <h4 className="text-[11.5px] font-bold text-zinc-950 font-display mt-1">{n.title}</h4>
                          </div>

                          <div className="text-right space-y-0.5">
                            <span className="text-[9px] font-bold text-zinc-400 font-mono block">
                              {n.id}
                            </span>
                            <span className="text-[9px] text-zinc-500 font-sans flex items-center gap-1 justify-end font-medium">
                              <Clock className="w-3 h-3 text-[#a89078]" />
                              {waitingMins === 0 ? 'Just now' : `${waitingMins}m ago`}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11.5px] font-sans text-zinc-650 leading-relaxed font-normal bg-zinc-50/50 p-2 border border-dashed border-zinc-200 rounded-lg">
                          {n.message}
                        </p>

                        {/* Interactive Status Actions Section */}
                        <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-dashed border-zinc-200">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">Status:</span>
                            <span className={`text-[9px] font-mono font-bold px-1.5 rounded uppercase ${
                              n.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                              n.status === 'DISMISSED' ? 'bg-red-100 text-red-800' :
                              n.status === 'IN_PROGRESS' || n.status === 'ACKNOWLEDGED' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {n.status}
                            </span>
                          </div>

                          <div className="flex gap-1.5">
                            {/* Acknowledge Button */}
                            {n.status === 'PENDING' && (
                              <button
                                onClick={() => acknowledgeNotification(n.id, currentUsername, currentRole)}
                                className="bg-zinc-900 text-white hover:bg-neutral-800 px-2.5 py-1 rounded text-[9.5px] font-extrabold uppercase transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3 h-3 block" />
                                Acknowledge
                              </button>
                            )}

                            {/* In Progress Switcher */}
                            {n.status === 'ACKNOWLEDGED' && (
                              <button
                                onClick={() => updateStatus(n.id, 'IN_PROGRESS', currentUsername, currentRole)}
                                className="bg-indigo-650 text-indigo-100 hover:bg-indigo-800 px-2.5 py-1 rounded text-[9.5px] font-extrabold uppercase transition-colors cursor-pointer"
                              >
                                Accept Queue Task
                              </button>
                            )}

                            {/* Complete Task Switcher */}
                            {(n.status === 'IN_PROGRESS' || n.status === 'ACKNOWLEDGED') && (
                              <button
                                onClick={() => updateStatus(n.id, 'COMPLETED', currentUsername, currentRole)}
                                className="bg-emerald-700 text-slate-100 hover:bg-emerald-800 px-2.5 py-1 rounded text-[9.5px] font-extrabold uppercase transition-colors cursor-pointer"
                              >
                                Resolved/Done
                              </button>
                            )}

                            {/* Dismiss button */}
                            {n.status !== 'COMPLETED' && n.status !== 'DISMISSED' && (
                              <button
                                onClick={() => dismissNotification(n.id, currentUsername, currentRole)}
                                className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-2.5 py-1 rounded text-[9.5px] font-extrabold uppercase transition-colors cursor-pointer hover:border-red-400 block"
                                title="Dismiss notification"
                              >
                                Dismiss
                              </button>
                            )}

                            {/* Permanently Delete button (Directors & Managers only) */}
                            {(currentRole === 'Director' || currentRole === 'Manager') && (
                              <button
                                onClick={() => {
                                  if (window.confirm("Permanently delete this operational notification from the database?")) {
                                    deleteNotification(n.id, currentUsername, currentRole);
                                  }
                                }}
                                className="bg-red-600 hover:bg-red-800 text-white px-2.5 py-1 rounded text-[9.5px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 border border-red-700 font-bold"
                                title="Delete notification"
                              >
                                <Trash2 className="w-3 h-3 text-white" />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Acknowledged Logs list */}
                        {n.acknowledgedBy && n.acknowledgedBy.length > 0 && (
                          <div className="text-[8.5px] font-mono text-indigo-800 bg-indigo-50/50 px-2 py-1 rounded leading-relaxed border border-indigo-100 mt-1">
                            ✔ Acknowledged by: {n.acknowledgedBy.join(' | ')}
                          </div>
                        )}
                        {n.dismissedBy && (
                          <div className="text-[8.5px] font-mono text-red-800 bg-red-50/50 px-2 py-1 rounded leading-relaxed border border-red-100 mt-1">
                            ✘ Dismissed by: {n.dismissedBy}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* VIEW: AUDIT LOGS */}
          {activeView === 'audit' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[#e5dfd5] pb-2">
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Enterprise System Safety Log</span>
                <span className="text-[9px] bg-zinc-900 text-white font-mono px-2 py-0.5 rounded font-bold uppercase">SECURE SHELL</span>
              </div>

              <div className="space-y-2.5">
                {auditLogs.length === 0 ? (
                  <p className="text-[10px] text-zinc-500 font-sans text-center py-6 border border-dashed rounded-xl bg-white">
                    No security or operations logs recorded yet in this session.
                  </p>
                ) : (
                  auditLogs.map(log => (
                    <div key={log.id} className="bg-white border border-[#e5dfd5] p-3 rounded-lg text-[10px] font-mono space-y-1 shadow-2xs">
                      <div className="flex justify-between items-center text-[9px] text-[#a89078] font-bold">
                        <span>{log.timestamp}</span>
                        <span>{log.id}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[#1c1c1a] font-bold">
                        <span className="text-zinc-500 uppercase">[{log.role}]</span>
                        <span className="text-zinc-900 underline">{log.user}:</span>
                        <span className="text-emerald-900 font-black uppercase">{log.action}</span>
                      </div>
                      {log.details && (
                        <p className="text-zinc-650 font-sans leading-relaxed text-[10.5px] pt-1">
                          ↳ {log.details}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VIEW: ANALYTICS */}
          {activeView === 'analytics' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[#e5dfd5] pb-2">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest font-mono">Operations KPI Scorecard</span>
                <button
                  onClick={handleSoundTest}
                  className="px-2 py-0.5 rounded border border-[#eae2d5] text-[9.5px] font-bold bg-white text-zinc-700 hover:bg-zinc-100 cursor-pointer flex items-center gap-1"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-zinc-500 block" />
                  Test Ring Sound
                </button>
              </div>

              {/* METRIC BENTO CARDS */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-[#e5dfd5] p-3 rounded-xl shadow-2xs text-center space-y-1">
                  <span className="text-[9px] text-zinc-400 uppercase tracking-widest block font-bold font-mono">Created Today</span>
                  <strong className="block text-xl font-display text-zinc-900 font-black">
                    {analytics.createdToday}
                  </strong>
                  <span className="text-[8px] text-zinc-450 block">Operational alarms</span>
                </div>
                
                <div className="bg-white border border-[#e5dfd5] p-3 rounded-xl shadow-2xs text-center space-y-1">
                  <span className="text-[9px] text-zinc-400 uppercase tracking-widest block font-bold font-mono">Resolved Today</span>
                  <strong className="block text-xl font-display text-emerald-900 font-black">
                    {analytics.resolvedToday}
                  </strong>
                  <span className="text-[8px] text-emerald-600 block">Status = COMPLETED</span>
                </div>

                <div className="bg-white border border-[#e5dfd5] p-3 rounded-xl shadow-2xs text-center space-y-1">
                  <span className="text-[9px] text-zinc-400 uppercase tracking-widest block font-bold font-mono">Avg Response</span>
                  <strong className="block text-xl font-display text-zinc-900 font-black">
                    {analytics.avgResponseTimeMin} <span className="text-[10px] font-sans">min</span>
                  </strong>
                  <span className="text-[8px] text-zinc-450 block">To Acknowledge</span>
                </div>

                <div className="bg-white border border-[#e5dfd5] p-3 rounded-xl shadow-2xs text-center space-y-1">
                  <span className="text-[9px] text-zinc-400 uppercase tracking-widest block font-bold font-mono">Avg Resolution</span>
                  <strong className="block text-xl font-display text-zinc-900 font-black">
                    {analytics.avgResolutionTimeMin} <span className="text-[10px] font-sans">min</span>
                  </strong>
                  <span className="text-[8px] text-zinc-450 block">Creation to Resolved</span>
                </div>
              </div>

              <div className="bg-white border border-[#e5dfd5] p-4 rounded-xl space-y-3 shadow-2xs">
                <h5 className="font-extrabold text-[10px] text-zinc-550 uppercase tracking-wider">Alert Distribution Overview</h5>
                
                <div className="space-y-2 text-[10.5px]">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
                    <span className="text-zinc-600 font-medium">Overdue Urgent Backlogs</span>
                    <strong className="font-mono text-red-650 font-bold">{analytics.overdueCount} Items</strong>
                  </div>
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
                    <span className="text-zinc-600 font-medium">Dominant Intake Type</span>
                    <strong className="font-mono text-zinc-800 capitalize font-bold">{analytics.mostCommonType.replace('_', ' ')}</strong>
                  </div>
                  <div className="flex justify-between items-center pb-1.5">
                    <span className="text-zinc-600 font-medium">Real-Time Subscriptions</span>
                    <strong className="font-mono text-emerald-800 font-black uppercase flex items-center gap-1 text-[9px] bg-emerald-50 px-1 rounded border border-emerald-200">
                      <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-ping"></span>
                      ACTIVE SYNC
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-zinc-900 text-[#f5f0eb] rounded-xl text-[10.5px] font-sans leading-relaxed border shadow-md relative overflow-hidden">
                <span className="font-bold text-amber-300 block uppercase font-mono text-[9px] tracking-widest">SLA Performance Comment</span>
                <p className="mt-1 opacity-90">
                  Turnaround services are currently within standard luxury limits (SLA target checklist is under 10 minutes). Keep critical pipeline alarms monitored. Address Overdue backlogs immediately.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>
    </>
  );
}
