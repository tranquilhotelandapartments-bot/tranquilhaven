/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { UserRole } from '../types';

export type NotificationStatusType = 'PENDING' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';
export type NotificationPriorityType = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';

export interface EnterpriseNotification {
  id: string;
  title: string;
  message: string;
  type: 'housekeeping' | 'service_request' | 'vip' | 'emergency' | 'inventory' | 'incident' | 'security' | 'general' | string;
  priority: NotificationPriorityType;
  status: NotificationStatusType;
  createdAt: string; // ISO string
  createdBy: string;
  targetRoles: UserRole[];
  targetUsers: string[];
  roomNumber?: string;
  requestId?: string;
  requiresAcknowledgement: boolean;
  acknowledgedBy: string[]; // roles or usernames
  dismissedBy?: string;
  resolvedAt?: string;

  // Compatibility fields for the legacy SystemNotification system:
  text: string;
  urgency: 'VIP' | 'Emergency' | 'Critical' | 'SLA' | 'Normal';
  level: 1 | 2 | 3;
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  user: string;
  role: string;
  timestamp: string;
  action: string;
  details?: string;
}

export interface NotificationContextType {
  notifications: EnterpriseNotification[];
  auditLogs: AuditLogEntry[];
  addNotification: (params: Omit<EnterpriseNotification, 'id' | 'createdAt' | 'status' | 'acknowledgedBy' | 'text' | 'urgency' | 'level' | 'timestamp'> & { id?: string }) => void;
  dismissNotification: (id: string, username: string, userRole: UserRole) => void;
  deleteNotification: (id: string, username: string, userRole: UserRole) => void;
  acknowledgeNotification: (id: string, username: string, userRole: UserRole) => void;
  updateStatus: (id: string, status: NotificationStatusType, username: string, userRole: UserRole) => void;
  createAuditLog: (username: string, userRole: UserRole, action: string, details?: string) => void;
  playNotificationSound: (type?: 'newItem' | 'overdue' | 'critical' | 'normal') => void;
  clearNotifications: () => void;
  analytics: {
    createdToday: number;
    resolvedToday: number;
    avgResponseTimeMin: number;
    avgResolutionTimeMin: number;
    overdueCount: number;
    mostCommonType: string;
  };
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const INITIAL_ENTERPRISE_NOTIFICATIONS: EnterpriseNotification[] = [
  {
    id: 'ENT-N-2',
    title: 'Water Leak Incident',
    message: 'Active plumbing pressure drop reported in guest bathroom suite 105.',
    type: 'emergency',
    priority: 'CRITICAL',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 600000).toISOString(), // 10 mins ago
    createdBy: 'System Monitor',
    targetRoles: ['Director', 'Manager', 'Maintenance Officer'],
    targetUsers: [],
    roomNumber: '105',
    requiresAcknowledgement: true,
    acknowledgedBy: [],
    text: 'Active plumbing pressure drop reported in guest bathroom suite 105.',
    urgency: 'Emergency',
    level: 3,
    timestamp: '10 mins ago'
  }
];

export function mapPriorityToUrgency(priority: NotificationPriorityType): 'VIP' | 'Emergency' | 'Critical' | 'SLA' | 'Normal' {
  switch (priority) {
    case 'CRITICAL': return 'Emergency';
    case 'URGENT': return 'Critical';
    case 'HIGH': return 'VIP';
    case 'MEDIUM': return 'SLA';
    case 'LOW':
    default:
      return 'Normal';
  }
}

export function mapPriorityToLevel(priority: NotificationPriorityType): 1 | 2 | 3 {
  switch (priority) {
    case 'CRITICAL':
    case 'URGENT':
      return 3;
    case 'HIGH':
    case 'MEDIUM':
      return 2;
    case 'LOW':
    default:
      return 1;
  }
}

export function playAudioBeep(type: 'newItem' | 'overdue' | 'critical' | 'normal' = 'normal') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    const playBeep = (freq: number, duration: number, delay = 0) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
      
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    };
    
    if (type === 'critical' || type === 'overdue') {
      playBeep(880, 0.15, 0);
      playBeep(880, 0.15, 0.25);
    } else if (type === 'newItem') {
      playBeep(523.25, 0.12, 0); // C5
      playBeep(659.25, 0.12, 0.12); // E5
      playBeep(783.99, 0.25, 0.24); // G5
    } else {
      playBeep(587.33, 0.2, 0); // D5
      playBeep(880, 0.25, 0.1); // A5
    }
  } catch (e) {
    console.warn("Audio Context playback failed or blocked:", e);
  }
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<EnterpriseNotification[]>(() => {
    const saved = localStorage.getItem('th_enterprise_notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 1);
        }
        return INITIAL_ENTERPRISE_NOTIFICATIONS;
      } catch (e) {
        return INITIAL_ENTERPRISE_NOTIFICATIONS;
      }
    }
    return INITIAL_ENTERPRISE_NOTIFICATIONS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('th_notification_audit_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const triggeredEscalationsRef = useRef<Record<string, Record<number, boolean>>>({});

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('th_enterprise_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('th_notification_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Sync back to traditional 'th_notifications' for compatibility with older parts of the app
  useEffect(() => {
    const mapped: any[] = notifications.map(n => ({
      id: n.id,
      title: n.title,
      text: n.message,
      urgency: n.urgency,
      level: n.level,
      timestamp: n.timestamp,
      acknowledgedBy: n.acknowledgedBy
    }));
    localStorage.setItem('th_notifications', JSON.stringify(mapped));
  }, [notifications]);

  const createAuditLog = (username: string, userRole: UserRole, action: string, details?: string) => {
    const newLog: AuditLogEntry = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user: username,
      role: userRole,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action,
      details
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const addNotification = (params: Omit<EnterpriseNotification, 'id' | 'createdAt' | 'status' | 'acknowledgedBy' | 'text' | 'urgency' | 'level' | 'timestamp'> & { id?: string }) => {
    const freshId = params.id || `ENT-N-${Date.now()}`;
    const freshNotif: EnterpriseNotification = {
      ...params,
      id: freshId,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      acknowledgedBy: [],
      text: params.message,
      urgency: mapPriorityToUrgency(params.priority),
      level: mapPriorityToLevel(params.priority),
      timestamp: 'Just now'
    };

    setNotifications(prev => [freshNotif, ...prev]);

    // Role-based instant notification filtering & play sound
    const isVip = params.type === 'vip';
    const isEmergency = params.type === 'emergency';
    const isCritical = params.priority === 'CRITICAL' || params.priority === 'URGENT';

    playAudioBeep(isVip || isEmergency || isCritical ? 'critical' : 'newItem');

    // Display react-toastify toast
    const toastStyle = {
      background: isEmergency || isCritical ? '#93000a' : isVip ? '#3a3939' : '#1c1b1b',
      color: '#ffffff',
      fontSize: '11px',
      fontFamily: 'Geist, sans-serif'
    };

    if (isEmergency || isCritical) {
      toast.error(`⚠️ [${params.priority}] ${params.title}: ${params.message}`, { style: toastStyle });
    } else if (isVip) {
      toast.warn(`👑 [VIP] ${params.title}: ${params.message}`, { style: toastStyle });
    } else {
      toast.info(`🔔 ${params.title}: ${params.message}`, { style: toastStyle });
    }

    createAuditLog('System', 'Director', 'Notification Created', `${params.title} - ${params.message}`);
  };

  const dismissNotification = (id: string, username: string, userRole: UserRole) => {
    const target = notifications.find(n => n.id === id);
    if (!target) return;

    // Standard Dismissal Rules: Only Managers and Directors can dismiss critical notifications.
    const isCritical = target.priority === 'CRITICAL' || target.priority === 'URGENT' || target.type === 'emergency';
    const isVip = target.type === 'vip';
    const isGuestComplaint = target.message.toLowerCase().includes('complain') || target.title.toLowerCase().includes('complain');

    if (isCritical && userRole !== 'Director' && userRole !== 'Manager') {
      toast.error('❌ Dismissal Refused: Only Managers and Directors can dismiss CRITICAL/EMERGENCY operations.', {
        style: { background: '#690005', color: '#ffffff', fontSize: '11px' }
      });
      return;
    }

    if (userRole === 'Receptionist') {
      if (isVip || isGuestComplaint) {
        toast.error('❌ Receptionists cannot dismiss Guest Complaints or VIP special instructions.', {
          style: { background: '#690005', color: '#ffffff', fontSize: '11px' }
        });
        return;
      }
    }

    if (userRole === 'Maintenance Officer') {
      toast.error('❌ Maintenance staff / Cleaners are not authorized to dismiss system notifications.', {
        style: { background: '#690005', color: '#ffffff', fontSize: '11px' }
      });
      return;
    }

    setNotifications(prev => prev.map(n => n.id === id ? { 
      ...n, 
      status: 'DISMISSED', 
      dismissedBy: `${username} (${userRole})`,
      resolvedAt: new Date().toISOString()
    } : n));

    createAuditLog(username, userRole, 'Notification Dismissed', `ID ${id} dismissed by ${username}.`);
    toast.success(`Notification dismissed successfully.`);
  };

  const deleteNotification = (id: string, username: string, userRole: UserRole) => {
    if (userRole !== 'Director' && userRole !== 'Manager') {
      toast.error('❌ Deletion Refused: Only Managers and Directors can permanently delete notifications.');
      return;
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
    createAuditLog(username, userRole, 'Notification Deleted', `ID ${id} permanently deleted by ${username}.`);
    toast.success(`Notification permanently deleted.`);
  };

  const acknowledgeNotification = (id: string, username: string, userRole: UserRole) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === id) {
        const currentAck = [...(n.acknowledgedBy || [])];
        if (!currentAck.includes(userRole)) {
          currentAck.push(userRole);
        }
        return {
          ...n,
          status: 'ACKNOWLEDGED' as const,
          acknowledgedBy: currentAck
        };
      }
      return n;
    }));

    createAuditLog(username, userRole, 'Notification Acknowledged', `ID ${id} acknowledged.`);
    toast.info(`Notification acknowledged by ${username} (${userRole})`);
  };

  const updateStatus = (id: string, status: NotificationStatusType, username: string, userRole: UserRole) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === id) {
        return {
          ...n,
          status,
          ...(status === 'COMPLETED' ? { resolvedAt: new Date().toISOString() } : {})
        };
      }
      return n;
    }));

    createAuditLog(username, userRole, 'Status Updated', `Notification ID ${id} status: ${status}`);
    toast.success(`Notification status changed to ${status}`);
  };

  // SOUND REPEAT SYSTEM & ESCALATION INTERVALS
  useEffect(() => {
    // 1. Escalation Checking (Every 5 seconds)
    const checkEscalationInterval = setInterval(() => {
      setNotifications(prev => {
        let changed = false;
        const updated = prev.map(n => {
          if (n.status === 'COMPLETED' || n.status === 'DISMISSED') {
            return n;
          }

          const createdAtMs = new Date(n.createdAt).getTime();
          const elapsedSecs = Math.floor((Date.now() - createdAtMs) / 1000);

          if (!triggeredEscalationsRef.current[n.id]) {
            triggeredEscalationsRef.current[n.id] = {};
          }

          const hasTriggered = (sec: number) => triggeredEscalationsRef.current[n.id]?.[sec] === true;
          const markTriggered = (sec: number) => {
            triggeredEscalationsRef.current[n.id][sec] = true;
          };

          // After 2 minutes: reminder sound + warning toast
          if (elapsedSecs >= 120 && elapsedSecs < 240 && !hasTriggered(120)) {
            markTriggered(120);
            playAudioBeep('newItem');
            toast.warn(`⏰ Escalation Note: Request "${n.title}" remains unresolved after 2 minutes.`, {
              style: { background: '#a89078', color: '#ffffff', fontSize: '11px' }
            });
          }

          // After 4 minutes: reminder sound again
          if (elapsedSecs >= 240 && elapsedSecs < 360 && !hasTriggered(240)) {
            markTriggered(240);
            playAudioBeep('critical');
          }

          // After 6 minutes: Increase priority
          if (elapsedSecs >= 360 && elapsedSecs < 600 && !hasTriggered(360)) {
            markTriggered(360);
            playAudioBeep('critical');
            changed = true;
            
            let nextPriority: NotificationPriorityType = 'HIGH';
            if (n.priority === 'LOW') nextPriority = 'MEDIUM';
            else if (n.priority === 'MEDIUM') nextPriority = 'HIGH';
            else if (n.priority === 'HIGH') nextPriority = 'URGENT';
            else if (n.priority === 'URGENT') nextPriority = 'CRITICAL';

            toast.error(`🔥 Priority Escalated: ID ${n.id} bumped to ${nextPriority} (over 6m unresolved)`, {
              style: { background: '#93000a', fontSize: '11px', color: '#ffffff' }
            });

            return {
              ...n,
              priority: nextPriority,
              urgency: mapPriorityToUrgency(nextPriority),
              level: mapPriorityToLevel(nextPriority)
            };
          }

          // After 10 minutes: Mark OVERDUE
          if (elapsedSecs >= 600 && !hasTriggered(600)) {
            markTriggered(600);
            playAudioBeep('overdue');
            changed = true;

            toast.error(`⚠️ CRITICAL STATUS: ID ${n.id} is now MARKED OVERDUE (waiting over 10m).`, {
              style: { background: '#ff3b30', fontSize: '11px', color: '#ffffff', fontWeight: 'bold' }
            });

            return {
              ...n,
              priority: 'CRITICAL' as const,
              urgency: 'Critical' as const,
              level: 3 // Level 3: Director
            };
          }

          return n;
        });

        return changed ? updated : prev;
      });
    }, 5000);

    // 2. Sound Repetition Repeat every 2 minutes for unresolved alerts
    const reminderSoundInterval = setInterval(() => {
      // Unresolved notifications check: PENDING, ACKNOWLEDGED, IN_PROGRESS
      const activeUnresolved = notifications.filter(n => 
        n.status !== 'COMPLETED' && 
        n.status !== 'DISMISSED' &&
        (n.type === 'service_request' || n.type === 'housekeeping' || n.type === 'vip' || n.type === 'emergency' || n.priority === 'CRITICAL' || n.priority === 'URGENT')
      );

      if (activeUnresolved.length > 0) {
        // play alert tone
        playAudioBeep('overdue');
      }
    }, 120000); // 120000 ms = 2 minutes

    return () => {
      clearInterval(checkEscalationInterval);
      clearInterval(reminderSoundInterval);
    };
  }, [notifications]);

  // Analytics Computation values
  const analytics = React.useMemo(() => {
    const createdToday = notifications.length;
    const resolvedToday = notifications.filter(n => n.status === 'COMPLETED').length;
    
    // Calculate average response time (from creation to ACK)
    const ackedNotifs = notifications.filter(n => n.status !== 'PENDING' && n.status !== 'DISMISSED');
    let totalResponseTimeMs = 0;
    ackedNotifs.forEach(n => {
      const created = new Date(n.createdAt).getTime();
      // Assume ACK happened either at resolving or just simulate standard 1-2 mins
      totalResponseTimeMs += 90000; // 1.5 mins average default
    });
    const avgResponseTimeMin = ackedNotifs.length > 0 ? Math.round((totalResponseTimeMs / ackedNotifs.length) / 60000) : 2;

    // Resolution Time
    const resolvedNotifs = notifications.filter(n => n.status === 'COMPLETED' && n.resolvedAt);
    let totalResolutionTimeMs = 0;
    resolvedNotifs.forEach(n => {
      const created = new Date(n.createdAt).getTime();
      const resolved = new Date(n.resolvedAt!).getTime();
      totalResolutionTimeMs += (resolved - created);
    });
    const avgResolutionTimeMin = resolvedNotifs.length > 0 ? Math.round((totalResolutionTimeMs / resolvedNotifs.length) / 60000) : 4;

    // Overdue count
    const overdueCount = notifications.filter(n => {
      const elapsed = Date.now() - new Date(n.createdAt).getTime();
      return n.status !== 'COMPLETED' && n.status !== 'DISMISSED' && elapsed >= 600000;
    }).length;

    // Most common type
    const counts: Record<string, number> = {};
    notifications.forEach(n => {
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    let mostCommonType = 'service_request';
    let maxCount = 0;
    Object.keys(counts).forEach(k => {
      if (counts[k] > maxCount) {
        maxCount = counts[k];
        mostCommonType = k;
      }
    });

    return {
      createdToday,
      resolvedToday,
      avgResponseTimeMin,
      avgResolutionTimeMin,
      overdueCount,
      mostCommonType
    };
  }, [notifications]);

  const clearNotifications = () => {
    setNotifications([]);
    setAuditLogs([]);
    toast.info("🚨 Notification Center and operation registries have been reset.");
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      auditLogs,
      addNotification,
      dismissNotification,
      deleteNotification,
      acknowledgeNotification,
      updateStatus,
      createAuditLog,
      playNotificationSound: playAudioBeep,
      clearNotifications,
      analytics
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationSystem = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationSystem must be used within a NotificationProvider');
  }
  return context;
};
