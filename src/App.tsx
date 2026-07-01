/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, doc, setDoc, deleteDoc, query, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Room, Reservation, MaintenanceTicket, TeamActivity, UserRole, GuestCRM, StockItem, FinancialRecord, VisitorLog, IncidentReport, SystemNotification, InternalMessage, ServiceRequest, ServiceRequestStatus, ServiceRequestPriority } from './types';
import {
  INITIAL_ROOMS,
  INITIAL_RESERVATIONS,
  INITIAL_TICKETS,
  INITIAL_TEAM_ACTIVITIES,
} from './data';

// Enterprise seed lists
import {
  INITIAL_GUESTS,
  INITIAL_STOCK,
  INITIAL_FINANCIALS,
  INITIAL_VISITORS,
  INITIAL_INCIDENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_VIRTUAL_WALKIE
} from './data_enterprise';

// Background image asset matching hotel exterior reference
const backgroundImage = 'https://lh3.googleusercontent.com/d/1-N_2kp6Jh-qOeQtzaTwSCjbJS40SZkNR';

const brandLogo = '/logo.jpeg';

// Guest portal base URL — configure via VITE_GUEST_PORTAL_URL in .env or replace the string below
// with your deployed URL (e.g. https://your-project.vercel.app)
const GUEST_PORTAL_BASE = import.meta.env.VITE_GUEST_PORTAL_URL || window.location.origin;

function buildGuestPortalLink(roomNo: string, guestName: string, guestId: string, phone: string) {
  const base = GUEST_PORTAL_BASE.endsWith('/') ? GUEST_PORTAL_BASE.slice(0, -1) : GUEST_PORTAL_BASE;
  return `${base}/?role=Guest&room=${roomNo}&guest=${encodeURIComponent(guestName)}&guestId=${guestId}&phone=${encodeURIComponent(phone)}`;
}

// Modular Tab Views Traditional
import OverviewTab from './components/OverviewTab';
import ReservationsTab from './components/ReservationsTab';
import RoomsTab from './components/RoomsTab';
import MaintenanceTab from './components/MaintenanceTab';
import AiAgentTab from './components/AiAgentTab';
import WorkspaceTab from './components/WorkspaceTab';
import BookingModal from './components/BookingModal';
import ProfilePicModal from './components/ProfilePicModal';

// Enterprise Notification Engine
import { useNotificationSystem } from './context/NotificationContext';
import { NotificationCenter } from './components/NotificationCenter';

// Enterprise Auth Handshake
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';

// Enterprise RBAC Screens
import { 
  DirectorScreen, ManagerScreen, ReceptionistScreen, 
  MaintenanceScreen, AccountantScreen, InventoryScreen, SecurityScreen, 
  GuestPortalScreen 
} from './components/roles/UserScreens';
import AiMessageGenerator from './components/AiMessageGenerator';

// Styling utilities
import { 
  Lock, Settings, ShieldAlert, Sparkles, MessageSquare, Send, CheckSquare, 
  ChevronRight, RefreshCw, Layers, Power, HelpCircle, Bell, Trash2,
  Camera, Upload, X, Smartphone, Laptop, PhoneCall, PhoneOff, Phone, 
  Volume2, VolumeX, Moon, Sun, Home, MessageCircle, MoreHorizontal, User, Menu,
  Wifi, Battery, Shield, Users, Wrench, Coins, Package, Calendar, Play
} from 'lucide-react';

export function playNotificationSound(type: 'newItem' | 'overdue' | 'critical' | 'normal' = 'normal') {
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

export const INITIAL_SERVICE_REQUESTS: ServiceRequest[] = [];

export default function App() {
  const { user, profile, loading: authLoading, logout, updateProfilePicture } = useAuth();
  const effectiveRole = profile?.role as UserRole;

  const [rooms, setRoomsRaw] = useState<Room[]>(() => {
    const saved = localStorage.getItem('g_hotel_rooms');
    if (saved) {
      try {
        return JSON.parse(saved) as Room[];
      } catch (e) {
        return INITIAL_ROOMS;
      }
    }
    return INITIAL_ROOMS;
  });

  const [reservations, setReservationsRaw] = useState<Reservation[]>(() => {
    const saved = localStorage.getItem('g_hotel_reservations');
    return saved ? JSON.parse(saved) : INITIAL_RESERVATIONS;
  });

  const [tickets, setTicketsRaw] = useState<MaintenanceTicket[]>(() => {
    const saved = localStorage.getItem('g_hotel_tickets');
    return saved ? JSON.parse(saved) : INITIAL_TICKETS;
  });

  const [activities, setActivitiesRaw] = useState<TeamActivity[]>(() => {
    const saved = localStorage.getItem('g_hotel_activities');
    return saved ? JSON.parse(saved) : INITIAL_TEAM_ACTIVITIES;
  });

  // Enterprise RBAC Lists State
  const [guests, setGuestsRaw] = useState<GuestCRM[]>(() => {
    const saved = localStorage.getItem('th_guests');
    return saved ? JSON.parse(saved) : INITIAL_GUESTS;
  });

  const [stock, setStockRaw] = useState<StockItem[]>(() => {
    const saved = localStorage.getItem('th_stock');
    return saved ? JSON.parse(saved) : INITIAL_STOCK;
  });

  const [financials, setFinancialsRaw] = useState<FinancialRecord[]>(() => {
    const saved = localStorage.getItem('th_financials');
    return saved ? JSON.parse(saved) : INITIAL_FINANCIALS;
  });

  const [visitors, setVisitorsRaw] = useState<VisitorLog[]>(() => {
    const saved = localStorage.getItem('th_visitors');
    return saved ? JSON.parse(saved) : INITIAL_VISITORS;
  });

  const [incidents, setIncidentsRaw] = useState<IncidentReport[]>(() => {
    const saved = localStorage.getItem('th_incidents');
    return saved ? JSON.parse(saved) : INITIAL_INCIDENTS;
  });

  const {
    notifications,
    addNotification,
    dismissNotification,
    acknowledgeNotification,
    updateStatus,
    clearNotifications,
  } = useNotificationSystem();

  const allNotifications = notifications;
  // Backward compatibility mock
  const setAllNotifications = (updater: any) => {
    console.log("Legacy notification updater intercepted:", updater);
  };

  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [aiTargetGuest, setAiTargetGuest] = useState<{ guestName: string; phone: string; roomNo: string } | null>(null);

  const openAiAgent = (guest: { guestName: string; phone: string; roomNo: string } | null = null) => {
    setAiTargetGuest(guest);
    setMobileTab('ai-agent');
  };

  const [messages, setMessagesRaw] = useState<InternalMessage[]>(() => {
    const saved = localStorage.getItem('th_messages');
    return saved ? JSON.parse(saved) : INITIAL_VIRTUAL_WALKIE;
  });

  const [serviceRequests, setServiceRequestsRaw] = useState<ServiceRequest[]>(() => {
    const saved = localStorage.getItem('th_service_requests');
    if (saved) {
      try {
        return JSON.parse(saved) as ServiceRequest[];
      } catch (e) {
        return INITIAL_SERVICE_REQUESTS;
      }
    }
    return INITIAL_SERVICE_REQUESTS;
  });

  const syncDiffToFirestore = async (collectionName: string, prev: any[], next: any[]) => {
    if (!profile) return; // Only sync to cloud if logged in

    try {
      const prevMap = new Map(prev.map(item => [item.id, item]));
      const nextMap = new Map(next.map(item => [item.id, item]));

      for (const item of next) {
        if (!item.id) continue;
        const prevItem = prevMap.get(item.id);
        if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(item)) {
          await setDoc(doc(db, collectionName, item.id), item);
        }
      }

      for (const item of prev) {
        if (item.id && !nextMap.has(item.id)) {
          await deleteDoc(doc(db, collectionName, item.id));
        }
      }
    } catch (err) {
      console.error(`Error syncing diff for ${collectionName}:`, err);
    }
  };

  const setRooms = (updater: React.SetStateAction<Room[]>) => {
    setRoomsRaw((prev) => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
      syncDiffToFirestore('rooms', prev, next);
      return next;
    });
  };

  const setReservations = (updater: React.SetStateAction<Reservation[]>) => {
    setReservationsRaw((prev) => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
      syncDiffToFirestore('reservations', prev, next);
      return next;
    });
  };

  const setTickets = (updater: React.SetStateAction<MaintenanceTicket[]>) => {
    setTicketsRaw((prev) => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
      syncDiffToFirestore('maintenanceTickets', prev, next);
      return next;
    });
  };

  const setActivities = (updater: React.SetStateAction<TeamActivity[]>) => {
    setActivitiesRaw((prev) => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
      syncDiffToFirestore('activities', prev, next);
      return next;
    });
  };

  const setGuests = (updater: React.SetStateAction<GuestCRM[]>) => {
    setGuestsRaw((prev) => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
      syncDiffToFirestore('guests', prev, next);
      return next;
    });
  };

  const setStock = (updater: React.SetStateAction<StockItem[]>) => {
    setStockRaw((prev) => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
      syncDiffToFirestore('inventory', prev, next);
      return next;
    });
  };

  const setFinancials = (updater: React.SetStateAction<FinancialRecord[]>) => {
    setFinancialsRaw((prev) => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
      syncDiffToFirestore('financials', prev, next);
      return next;
    });
  };

  const setVisitors = (updater: React.SetStateAction<VisitorLog[]>) => {
    setVisitorsRaw((prev) => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
      syncDiffToFirestore('visitors', prev, next);
      return next;
    });
  };

  const setIncidents = (updater: React.SetStateAction<IncidentReport[]>) => {
    setIncidentsRaw((prev) => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
      syncDiffToFirestore('incidents', prev, next);
      return next;
    });
  };

  const setMessages = (updater: React.SetStateAction<InternalMessage[]>) => {
    setMessagesRaw((prev) => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
      syncDiffToFirestore('messages', prev, next);
      return next;
    });
  };

  const setServiceRequests = (updater: React.SetStateAction<ServiceRequest[]>) => {
    setServiceRequestsRaw((prev) => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
      syncDiffToFirestore('guestRequests', prev, next);
      return next;
    });
  };

  // Traditional Tabs vs RBAC Exclusive system toggle
  const [rbacMode, setRbacMode] = useState<boolean>(true);

  // Mobile Simulator & Frame states
  const [simulatorMode, setSimulatorMode] = useState<boolean>(true);
  const [simulatorDevice, setSimulatorDevice] = useState<'android' | 'ios'>('android');
  const [mobileTab, setMobileTab] = useState<string>('dashboard');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  
  // Interactive Simulator Features
  const [incomingCall, setIncomingCall] = useState<boolean>(false);
  const [callName, setCallName] = useState<string>('');
  const [activeCall, setActiveCall] = useState<boolean>(false);
  const [callTimer, setCallTimer] = useState<number>(0);
  const [callMuted, setCallMuted] = useState<boolean>(false);
  const [callSpeaker, setCallSpeaker] = useState<boolean>(false);
  const [simulatedNotifications, setSimulatedNotifications] = useState<{ id: string; title: string; body: string; time: string }[]>([]);
  const [latestSimBanner, setLatestSimBanner] = useState<{ title: string; body: string } | null>(null);

  // Active call counter effect
  useEffect(() => {
    let interval: any;
    if (activeCall) {
      interval = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  // Live clock state for Status Bar
  const [deviceTime, setDeviceTime] = useState<string>('09:41');
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      setDeviceTime(`${hours}:${minutes} ${ampm}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Action to trigger a simulated call inside the frame
  const triggerSimulatedCall = (callerName: string = "Director Michael") => {
    setCallName(callerName);
    setIncomingCall(true);
    playNotificationSound('normal');
  };

  // Action to trigger a simulated push notification
  const triggerSimulatedNotification = (title: string, body: string) => {
    const newNotif = {
      id: `sim-${Date.now()}`,
      title,
      body,
      time: 'Just now'
    };
    setSimulatedNotifications(prev => [newNotif, ...prev]);
    setLatestSimBanner({ title, body });
    playNotificationSound('newItem');
    
    // Auto clear banner in 4 seconds
    setTimeout(() => {
      setLatestSimBanner(prev => prev?.title === title ? null : prev);
    }, 4000);
  };

  useEffect(() => {
    if (profile?.role !== 'Director' && !rbacMode) {
      setRbacMode(true);
    }
  }, [profile?.role, rbacMode]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isProfilePicModalOpen, setIsProfilePicModalOpen] = useState(false);
  const [whatsappModalData, setWhatsappModalData] = useState<{
    guestName: string;
    phone: string;
    roomNo: string;
    link: string;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isAppLoading = loading || authLoading;

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, [authLoading]);

  // --- URL QUERY PARAMETER MOUNT AUTO-LOGIN ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get('role');
    const urlRoom = params.get('room') || params.get('roomNo');
    const urlGuestId = params.get('guestId') || params.get('id');
    const urlGuestName = params.get('guestName') || params.get('guest');
    const urlPhone = params.get('phone');

    if (urlRole && urlRole.toLowerCase() === 'guest') {
      const targetId = urlGuestId || `TH-2026-URL-${urlRoom || '402'}`;
      const targetName = urlGuestName || 'Valued Guest';
      const targetRoom = urlRoom || '402';
      const targetPhone = urlPhone || '+1 (555) 732-9011';

      setGuests(prevGuests => {
        const exists = prevGuests.find(g => 
          g.id === targetId || 
          g.fullName.toLowerCase() === targetName.toLowerCase()
        );

        if (exists) {
          const filtered = prevGuests.filter(g => g.id !== exists.id);
          return [exists, ...filtered];
        } else {
          const newG: GuestCRM = {
            id: targetId,
            fullName: targetName,
            phone: targetPhone,
            email: 'guest@tranquilhaven.com',
            passport: 'AUTO-US-1029',
            nationalId: 'NID-AUTO-REG',
            emergencyContact: 'None',
            loyaltyPoints: 150,
            spendingHistory: 450,
            checkedInRoom: targetRoom,
            historyLogs: ['Instant check-in via secure WhatsApp Portal login link']
          };
          return [newG, ...prevGuests];
        }
      });

      if (urlRoom) {
        setRooms(prevRooms => {
          return prevRooms.map(r => {
            if (r.id === urlRoom) {
              return {
                ...r,
                status: 'Occupied',
                guestName: targetName
              };
            }
            return r;
          });
        });
      }
    }
  }, []);

  // Quick Role Assistant Drawer Chatbot state
  const [assistantDrawerOpen, setAssistantDrawerOpen] = useState(false);
  const [assistantChat, setAssistantChat] = useState<{ query: string; reply: string }[]>([
    { query: 'System Handshake', reply: 'Greetings! I am the Tranquil Haven AI Butler. I parse live hotel states to generate audit guidelines instantly. Select questions below based on your active role.' }
  ]);
  const [customQueryInput, setCustomQueryInput] = useState('');

  // --- Seed Data definitions for empty databases ---
  const SEED_ROOMS: Room[] = [];
  const SEED_RESERVATIONS: Reservation[] = [];
  const SEED_TICKETS: MaintenanceTicket[] = [];
  const SEED_ACTIVITIES: TeamActivity[] = [];
  const SEED_GUEST_CRM: GuestCRM[] = [];
  const SEED_FINANCIALS: FinancialRecord[] = [];
  const SEED_INCIDENTS: IncidentReport[] = [];
  const SEED_VISITORS: VisitorLog[] = [];
  const SEED_MESSAGES: InternalMessage[] = [];
  const SEED_SERVICE_REQUESTS: ServiceRequest[] = [];

  // --- 2. DATABASE SYNC & LOCALSTORAGE BACKUP EFFECT ---
  useEffect(() => {
    if (!profile) {
      return;
    }

    const unsubscribers: (() => void)[] = [];

    const syncCollection = (
      collectionName: string, 
      setRaw: React.Dispatch<React.SetStateAction<any[]>>, 
      defaultSeed: any[]
    ) => {
      const q = query(collection(db, collectionName));
      const unsub = onSnapshot(q, async (snapshot) => {
        if (snapshot.empty && defaultSeed && defaultSeed.length > 0) {
          console.log(`Seeding empty collection [${collectionName}] on Firestore...`);
          for (const item of defaultSeed) {
            try {
              await setDoc(doc(db, collectionName, item.id), item);
            } catch (seedErr) {
              console.error(`Failed to seed item ${item.id} in ${collectionName}:`, seedErr);
            }
          }
        } else {
          const items: any[] = [];
          snapshot.forEach((docSnap) => {
            items.push(docSnap.data());
          });
          setRaw(items);
        }
      }, (error) => {
        console.error(`Subscription error on [${collectionName}]:`, error);
      });

      unsubscribers.push(unsub);
    };

    // Subscriptions with fully-featured SEED arrays!
    syncCollection('rooms', setRoomsRaw, SEED_ROOMS);
    syncCollection('reservations', setReservationsRaw, SEED_RESERVATIONS);
    syncCollection('maintenanceTickets', setTicketsRaw, SEED_TICKETS);
    syncCollection('activities', setActivitiesRaw, SEED_ACTIVITIES);
    syncCollection('guests', setGuestsRaw, SEED_GUEST_CRM);
    syncCollection('inventory', setStockRaw, INITIAL_STOCK);
    syncCollection('financials', setFinancialsRaw, SEED_FINANCIALS);
    syncCollection('visitors', setVisitorsRaw, SEED_VISITORS);
    syncCollection('incidents', setIncidentsRaw, SEED_INCIDENTS);
    syncCollection('messages', setMessagesRaw, SEED_MESSAGES);
    syncCollection('guestRequests', setServiceRequestsRaw, SEED_SERVICE_REQUESTS);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [profile]);

  // Synchronous LocalStorage Backup Caches for offline resiliency
  useEffect(() => {
    localStorage.setItem('g_hotel_rooms', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem('g_hotel_reservations', JSON.stringify(reservations));
  }, [reservations]);

  useEffect(() => {
    localStorage.setItem('g_hotel_tickets', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem('g_hotel_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('th_guests', JSON.stringify(guests));
  }, [guests]);

  useEffect(() => {
    localStorage.setItem('th_stock', JSON.stringify(stock));
  }, [stock]);

  useEffect(() => {
    localStorage.setItem('th_financials', JSON.stringify(financials));
  }, [financials]);

  useEffect(() => {
    localStorage.setItem('th_visitors', JSON.stringify(visitors));
  }, [visitors]);

  useEffect(() => {
    localStorage.setItem('th_incidents', JSON.stringify(incidents));
  }, [incidents]);

  useEffect(() => {
    localStorage.setItem('th_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('th_service_requests', JSON.stringify(serviceRequests));
  }, [serviceRequests]);

  // --- 3. LOGISTICS DISPATCH MUTATORS ---

  const handleAddMessage = (text: string) => {
    if (!effectiveRole) return;
    const fresh: InternalMessage = {
      id: `M-${Date.now()}`,
      senderName: effectiveRole === 'Guest' ? (guests[0]?.fullName || 'Guest User') : `${effectiveRole} Admin`,
      senderRole: effectiveRole,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([...messages, fresh]);

    // Insert as team actions activity
    const freshAct: TeamActivity = {
      id: `ACT-${Date.now()}`,
      staffName: fresh.senderName,
      staffAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80',
      action: `Broadcasted operational chat: "${text.slice(0, 30)}..."`,
      timeAgo: 'Just now',
      statusType: 'info'
    };
    setActivities([freshAct, ...activities]);
  };

  const overdueSoundedIdsRef = useRef<Record<string, boolean>>({});
  const notifiedGuestMsgIdsRef = useRef<Set<string>>(new Set(
    messages.filter(m => !m.senderRole && m.senderName?.startsWith('Room ')).map(m => m.id)
  ));

  // Notify staff when new guest messages arrive from the external guest portal
  useEffect(() => {
    const guestMessages = messages.filter(m =>
      !m.senderRole && m.senderName?.startsWith('Room ')
    );
    for (const msg of guestMessages) {
      if (!notifiedGuestMsgIdsRef.current.has(msg.id)) {
        notifiedGuestMsgIdsRef.current.add(msg.id);
        playNotificationSound('newItem');
        triggerSimulatedNotification(
          `New Message from ${msg.senderName}`,
          msg.text
        );
        addNotification({
          id: `N-guest-msg-${msg.id}`,
          title: `Guest Message: ${msg.senderName}`,
          message: msg.text,
          type: 'service_request',
          priority: 'MEDIUM',
          targetRoles: ['Receptionist', 'Manager', 'Director'],
          targetUsers: [],
          roomNumber: msg.senderName?.replace('Room ', ''),
          requiresAcknowledgement: false
        });
        const roomNo = msg.senderName?.replace('Room ', '');
        const srId = `SR-msg-${msg.id}`;
        setServiceRequests(prev => {
          if (prev.some(sr => sr.id === srId)) return prev;
          return [{
            id: srId,
            roomNo,
            requestType: 'Guest Message',
            details: msg.text,
            requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            requestedTimeMs: Date.now(),
            assignedStaff: 'Unassigned',
            status: 'Pending',
            priority: 'Normal',
            escalationLevel: 1
          }, ...prev];
        });
      }
    }
  }, [messages]);

  // Real-time timers for ticking & sound alarms
  useEffect(() => {
    const interval = setInterval(() => {
      setServiceRequests(prev => {
        let changed = false;
        const updated = prev.map(sr => {
          if (sr.status === 'Delivered' || sr.status === 'Closed') {
            return sr;
          }
          const diffSeconds = Math.floor((Date.now() - sr.requestedTimeMs) / 1000);
          
          let nextPriority = sr.priority;
          let nextLevel = sr.escalationLevel;
          
          // After 6 Minutes: Escalate priority
          if (diffSeconds >= 360 && sr.priority === 'Normal') {
            nextPriority = 'Attention Needed';
            nextLevel = 2; // Level 2: Manager
            changed = true;
          }
          
          // After 10 Minutes: Mark as overdue
          if (diffSeconds >= 600 && sr.priority !== 'Overdue') {
            nextPriority = 'Overdue';
            nextLevel = 3; // Level 3: Director
            changed = true;
            
            // Trigger Overdue sound and a system notification if not already triggered
            if (!overdueSoundedIdsRef.current[sr.id]) {
              overdueSoundedIdsRef.current[sr.id] = true;
              playNotificationSound('overdue');
              
              // L1, L2, L3 overdue notifications
              const notifIdPrefix = `N-sr-overdue-${sr.id}`;
              const overdueText = `Room ${sr.roomNo} request for '${sr.requestType}' is now OVERDUE (waiting over 10m).`;
              
              setAllNotifications(prevNotifs => {
                const alreadyHas = prevNotifs.some(n => n.id.startsWith(notifIdPrefix));
                if (alreadyHas) return prevNotifs;
                return [
                  {
                    id: `${notifIdPrefix}-L1`,
                    title: 'Service Request Overdue',
                    text: overdueText,
                    urgency: 'Critical',
                    level: 1,
                    timestamp: 'Just now',
                    acknowledgedBy: []
                  },
                  {
                    id: `${notifIdPrefix}-L2`,
                    title: 'Service Request Overdue',
                    text: overdueText,
                    urgency: 'Critical',
                    level: 2,
                    timestamp: 'Just now',
                    acknowledgedBy: []
                  },
                  {
                    id: `${notifIdPrefix}-L3`,
                    title: 'Service Request Overdue',
                    text: overdueText,
                    urgency: 'Critical',
                    level: 3,
                    timestamp: 'Just now',
                    acknowledgedBy: []
                  },
                  ...prevNotifs
                ];
              });
            }
          }
          
          if (diffSeconds >= 900 && sr.priority !== 'Critical') {
            nextPriority = 'Critical';
            nextLevel = 3;
            changed = true;
          }
          
          if (nextPriority !== sr.priority || nextLevel !== sr.escalationLevel) {
            changed = true;
            return {
              ...sr,
              priority: nextPriority,
              escalationLevel: nextLevel
            };
          }
          return sr;
        });
        return changed ? updated : prev;
      });
    }, 5000); // Check times every 5 seconds for immediate reactivity
    return () => clearInterval(interval);
  }, []);

  // Play sound reminder every 2 minutes if unresolved items exist
  useEffect(() => {
    const interval = setInterval(() => {
      const unresolved = serviceRequests.filter(sr => sr.status !== 'Delivered' && sr.status !== 'Closed');
      if (unresolved.length > 0) {
        const hasOverdue = unresolved.some(sr => {
          const diffSeconds = Math.floor((Date.now() - sr.requestedTimeMs) / 1000);
          return diffSeconds >= 600;
        });
        playNotificationSound(hasOverdue ? 'overdue' : 'normal');
      }
    }, 120000);
    return () => clearInterval(interval);
  }, [serviceRequests]);

  const handleUpdateRoomSubStatus = (
    roomId: string, 
    sub: string, 
    status: 'Vacant' | 'Dirty' | 'Occupied' | 'Out of Order',
    cleanPhoto?: string,
    cleanVideo?: string
  ) => {
    const isCleaned = sub === 'CLEANED';
    
    const next = rooms.map(r => {
      if (r.id === roomId) {
        return {
          ...r,
          subStatus: sub,
          status,
          ...(isCleaned ? { 
            lastCleanedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
            cleanPhoto,
            cleanVideo,
            cleanSubmittedBy: profile?.username || 'Staff Housekeeper',
            cleanSubmittedTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          } : {}),
          ...(status === 'Dirty' ? { lastCheckoutDate: r.lastCheckoutDate || '2026-06-08' } : {})
        };
      }
      return r;
    });
    setRooms(next);

    // Save as activity
    const fresh: TeamActivity = {
      id: `ACT-${Date.now()}`,
      staffName: 'Housekeeping Desk',
      staffAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
      action: `Room ${roomId} cleaning status set to ${sub} (${status})`,
      timeAgo: 'Just now',
      statusType: status === 'Vacant' ? 'success' : 'warning'
    };
    setActivities([fresh, ...activities]);

    // Real-Time Notification Logic for Cleaner workflows
    if (isCleaned) {
      const inspectionText = `Room ${roomId} has been cleaned and is ready for inspection.`;
      
      addNotification({
        id: `N-hsk-clean-${roomId}`,
        title: 'Room Cleaning Completed',
        message: inspectionText,
        type: 'housekeeping',
        priority: 'MEDIUM',
        targetRoles: ['Receptionist', 'Manager', 'Director'],
        targetUsers: [],
        roomNumber: roomId,
        requiresAcknowledgement: true
      });
    } else if (status === 'Dirty') {
      addNotification({
        id: `N-hsk-dirty-${roomId}`,
        title: 'Room Marked Dirty',
        message: `Room ${roomId} has transitioned to dirty. Immediate turnaround queue required.`,
        type: 'housekeeping',
        priority: 'LOW',
        targetRoles: ['Cleaner', 'Manager', 'Director'],
        targetUsers: [],
        roomNumber: roomId,
        requiresAcknowledgement: false
      });
    }
  };

  const handleApproveRoomInspection = (roomId: string) => {
    // 1. Update room substatus to READY / Vacant
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, subStatus: 'READY', status: 'Vacant' } : r));
    
    // 2. Mark relevant notifications containing Room {roomId} clean inspection alert as COMPLETED
    notifications.forEach(n => {
      if ((n.message.includes(`Room ${roomId}`) && n.message.includes('inspection')) || n.id.includes(`hsk-clean-${roomId}`)) {
        updateStatus(n.id, 'COMPLETED', 'Inspection Desk', effectiveRole);
      }
    });
    
    // 3. Play success tone & log activity
    playNotificationSound('newItem');
    
    const fresh: TeamActivity = {
      id: `ACT-${Date.now()}`,
      staffName: 'Inspection Desk',
      staffAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80',
      action: `Approved housekeeping inspection for Room ${roomId}. Status upgraded to READY.`,
      timeAgo: 'Just now',
      statusType: 'success'
    };
    setActivities(prevAct => [fresh, ...prevAct]);
  };

  const handlePostServiceRequest = (roomNo: string, requestType: string, details?: string) => {
    const isVip = guests.some(g => g.checkedInRoom === roomNo && g.loyaltyPoints > 2000) || roomNo === '402';
    
    const freshRequest: ServiceRequest = {
      id: `SR-${Date.now().toString().slice(-4)}`,
      roomNo,
      requestType,
      details: details || '',
      requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      requestedTimeMs: Date.now(),
      assignedStaff: 'Unassigned',
      status: 'Pending',
      priority: isVip ? 'Attention Needed' : 'Normal',
      escalationLevel: 1
    };
    
    setServiceRequests(prev => [freshRequest, ...prev]);
    
    const notifText = `${isVip ? 'VIP ' : ''}Guest in Room ${roomNo} requested ${requestType}. Details: ${details || 'None'}`;
    
    addNotification({
      id: `N-sr-${freshRequest.id}`,
      title: 'New Guest Service Request',
      message: notifText,
      type: 'service_request',
      priority: isVip ? 'HIGH' : 'MEDIUM',
      targetRoles: ['Receptionist', 'Manager', 'Director'],
      targetUsers: [],
      roomNumber: roomNo,
      requestId: freshRequest.id,
      requiresAcknowledgement: true
    });
  };

  const handleUpdateServiceRequestStatus = (id: string, nextStatus: ServiceRequestStatus, assignedStaff?: string) => {
    // 1. First update corresponding system notifications status OUTSIDE setServiceRequests state updater
    if (nextStatus === 'Delivered' || nextStatus === 'Closed') {
      // Automatic notification stop: mark all related system notifications as COMPLETED
      // This stops playAudioBeep, escalation alarms, and dashboard blinkers instantly
      notifications.forEach(n => {
        if (n.id === `N-sr-${id}` || n.requestId === id || n.id.includes(id)) {
          updateStatus(n.id, 'COMPLETED', assignedStaff || 'Staff Desk', effectiveRole);
        }
      });
      // Fallback legacy ID resolution
      updateStatus(`N-sr-${id}`, 'COMPLETED', assignedStaff || 'Staff Desk', effectiveRole);
    } else if (nextStatus === 'In Progress') {
      notifications.forEach(n => {
        if (n.id === `N-sr-${id}` || n.requestId === id || n.id.includes(id)) {
          updateStatus(n.id, 'IN_PROGRESS', assignedStaff || 'Staff Desk', effectiveRole);
        }
      });
      updateStatus(`N-sr-${id}`, 'IN_PROGRESS', assignedStaff || 'Staff Desk', effectiveRole);
    }

    // 2. Then set ServiceRequest state cleanly
    setServiceRequests(prev => prev.map(sr => {
      if (sr.id === id) {
        return {
          ...sr,
          status: nextStatus,
          assignedStaff: assignedStaff || sr.assignedStaff || 'Unassigned'
        };
      }
      return sr;
    }));
  };

  const handleDeleteServiceRequest = (id: string) => {
    setServiceRequests(prev => prev.filter(sr => sr.id !== id));
  };

  const handleAddReservation = (res: Reservation) => {
    setReservations([res, ...reservations]);
  };

  const handleRegisterGuestCRM = async (guest: GuestCRM) => {
    setGuests([guest, ...guests]);

    // Automatically compose WhatsApp Portal invitation message
    const secureLink = buildGuestPortalLink(guest.checkedInRoom || '402', guest.fullName, guest.id, guest.phone);
    const smsMessage = `Hello ${guest.fullName}, welcome to TRANQUIL HAVEN! Your checked-in room is Room ${guest.checkedInRoom || '402'}. Click the secure link to instantly launch your personalized digital guest mobile portal to request butler services, check out, or chat with us online: ${secureLink}`;

    setWhatsappModalData({
      guestName: guest.fullName,
      phone: guest.phone,
      roomNo: guest.checkedInRoom || '402',
      link: secureLink,
      message: smsMessage
    });

    openAiAgent({
      guestName: guest.fullName,
      phone: guest.phone,
      roomNo: guest.checkedInRoom || '402'
    });

    // Attempt to send WhatsApp invitation automatically via backend
    try {
      const resp = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toPhone: guest.phone, message: smsMessage })
      });

      if (resp.ok) {
        handleAddNotification({
          id: `N-whatsapp-${Date.now()}`,
          title: 'WhatsApp Invitation Sent',
          text: `Sent guest portal link to ${guest.fullName}`,
          urgency: 'Normal',
          level: 1,
          timestamp: 'Just now',
          acknowledgedBy: []
        });
      } else {
        const err = await resp.json().catch(() => ({}));
        handleAddNotification({
          id: `N-whatsapp-fail-${Date.now()}`,
          title: 'WhatsApp Send Failed',
          text: `Failed to send WhatsApp to ${guest.fullName}: ${err?.error || resp.statusText}`,
          urgency: 'Normal',
          level: 1,
          timestamp: 'Just now',
          acknowledgedBy: []
        });
      }
    } catch (e: any) {
      handleAddNotification({
        id: `N-whatsapp-fail-${Date.now()}`,
        title: 'WhatsApp Send Error',
        text: `Error sending WhatsApp to ${guest.fullName}: ${e?.message || String(e)}`,
        urgency: 'Normal',
        level: 1,
        timestamp: 'Just now',
        acknowledgedBy: []
      });
    }
  };

  const handleAddNotification = (notif: SystemNotification) => {
    addNotification({
      id: notif.id,
      title: notif.title,
      message: notif.text,
      type: 'general',
      priority: notif.urgency === 'VIP' ? 'HIGH' : notif.urgency === 'Emergency' ? 'CRITICAL' : 'LOW',
      targetRoles: ['Receptionist', 'Manager', 'Director'],
      targetUsers: [],
      requiresAcknowledgement: false
    });
  };

  const handleCheckInGuest = (roomNo: string) => {
    // Turn room occupied & track lastOccupiedDate
    setRooms(rooms.map(r => r.id === roomNo ? { ...r, status: 'Occupied', subStatus: 'CHECKED_IN', lastOccupiedDate: '2026-06-08' } : r));
    // Set reservation checked in
    const updatedReservations = reservations.map(res => res.roomNo === roomNo ? { ...res, status: 'CHECKED_IN', checkedInTime: 'Today' } : res);
    setReservations(updatedReservations);

    // Retrieve guest information
    const matchedRes = reservations.find(res => res.roomNo === roomNo);
    const guestName = matchedRes ? matchedRes.guestName : 'Guest Stay';
    const numDays = matchedRes ? matchedRes.numGuests : 2;
    const stayValue = matchedRes ? (numDays * 160 + 120) : 280;

    // AUTOMATED ENTRY TO THE ACCOUNTANT LEDGER
    const autoLedgerRecord: FinancialRecord = {
      id: `TX-${Date.now().toString().slice(-4)}`,
      type: 'Revenue',
      amount: stayValue,
      category: 'Main Room Inventory',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      description: `Auto Front Desk Payment: Checked in ${guestName} - Settle Stay Value for Room ${roomNo}`,
      status: 'Approved' // Automatically posted & approved
    };
    setFinancials(prev => [autoLedgerRecord, ...prev]);

    // Post to team activity logs
    const freshAct: TeamActivity = {
      id: `ACT-${Date.now()}`,
      staffName: 'Reception Desk',
      staffAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80',
      action: `Authorized secure keys & checked in guest into Suite ${roomNo} (Auto Accountant payment balance settled: UGX ${stayValue.toLocaleString()})`,
      timeAgo: 'Just now',
      statusType: 'success'
    };
    setActivities([freshAct, ...activities]);

    // Real-Time Notification Trigger
    handleAddNotification({
      id: `N-${Date.now()}-guest-in`,
      title: 'Guest Checked In',
      text: `Guest ${guestName} has successfully checked in to Room ${roomNo}. Keys active.`,
      urgency: 'Normal',
      level: 1,
      timestamp: 'Just now',
      acknowledgedBy: []
    });

    // Automatically compose WhatsApp Portal invitation message upon manual expectation checkin
    const matchedGuest = guests.find(g => g.fullName.toLowerCase() === guestName.toLowerCase()) || {
      id: `TH-2026-CHKIN-${roomNo}`,
      fullName: guestName,
      phone: '+1 (555) 732-9011'
    };

    const secureLink = buildGuestPortalLink(roomNo, guestName, matchedGuest.id, matchedGuest.phone);
    const smsMessage = `Hello ${guestName}, welcome to TRANQUIL HAVEN! Your keys are active for Room ${roomNo}. Get instant access to request room services, check out, or message your personal hotel butler by tapping this link: ${secureLink}`;

    setWhatsappModalData({
      guestName: guestName,
      phone: matchedGuest.phone,
      roomNo: roomNo,
      link: secureLink,
      message: smsMessage
    });
  };

  const handleCheckOutGuest = (roomNo: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    // Turn room dirty (Maintenance turnaround must clean before next occupancy) & set lastCheckoutDate and clear guestName
    setRooms(rooms.map(r => r.id === roomNo ? { ...r, status: 'Dirty', subStatus: 'DIRTY_OUTBOUND', lastCheckoutDate: todayStr, guestName: undefined } : r));
    // Set reservation completed
    setReservations(reservations.map(res => res.roomNo === roomNo ? { ...res, status: 'COMPLETED' } : res));

    // Retrieve guest details
    const matchedRes = reservations.find(res => res.roomNo === roomNo);
    const guestName = matchedRes ? matchedRes.guestName : 'Guest Stay';
    const checkoutExtras = Math.floor(Math.random() * 80) + 40; // Random guest amenities and mini-bar settled values.

    // AUTOMATED EXTRA CHARGES LEDGER ENTRY TO THE ACCOUNTANT Ledger
    const autoLedgerRecord: FinancialRecord = {
      id: `TX-${Date.now().toString().slice(-4)}-EX`,
      type: 'Revenue',
      amount: checkoutExtras,
      category: 'Bar & Dining',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      description: `Auto checkout extras cleared: Room services, mini-bar, or amenities settled by ${guestName} (Room ${roomNo})`,
      status: 'Approved'
    };
    setFinancials(prev => [autoLedgerRecord, ...prev]);

    // Post to team activities
    const freshAct: TeamActivity = {
      id: `ACT-${Date.now()}`,
      staffName: 'Reception Desk',
      staffAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80',
      action: `Checked out guest from Room ${roomNo}. Room marked Dirty for Turnaround. (Auto Checkout Extras payment balance settled: UGX ${checkoutExtras.toLocaleString()})`,
      timeAgo: 'Just now',
      statusType: 'warning'
    };
    setActivities([freshAct, ...activities]);

    // Real-Time Notification Trigger
    handleAddNotification({
      id: `N-${Date.now()}-guest-out`,
      title: 'Guest Checked Out',
      text: `Guest ${guestName} has successfully checked out from Room ${roomNo}. Invoice settled.`,
      urgency: 'Normal',
      level: 1,
      timestamp: 'Just now',
      acknowledgedBy: []
    });
  };

  const handleClearAllData = () => {
    if (!window.confirm("ARE YOU SURE? This will purge all active data: checklists, guest reservations, financial ledgers, service requests, maintenance tickets, and system notifications.")) {
      return;
    }
    
    // Reset all React operational state to original seeds
    setRooms(INITIAL_ROOMS);
    setReservations(INITIAL_RESERVATIONS);
    setTickets(INITIAL_TICKETS);
    setActivities(INITIAL_TEAM_ACTIVITIES);
    setGuests(INITIAL_GUESTS);
    setStock(INITIAL_STOCK);
    setFinancials(INITIAL_FINANCIALS);
    setVisitors(INITIAL_VISITORS);
    setIncidents(INITIAL_INCIDENTS);
    setMessages(INITIAL_VIRTUAL_WALKIE);
    setServiceRequests([]);
    
    // Reset notification context data
    clearNotifications();
    
    // Clear local storage entries to reset completely
    localStorage.removeItem('g_hotel_rooms');
    localStorage.removeItem('g_hotel_reservations');
    localStorage.removeItem('g_hotel_tickets');
    localStorage.removeItem('g_hotel_activities');
    localStorage.removeItem('th_guests');
    localStorage.removeItem('th_stock');
    localStorage.removeItem('th_financials');
    localStorage.removeItem('th_visitors');
    localStorage.removeItem('th_incidents');
    localStorage.removeItem('th_messages');
    localStorage.removeItem('th_service_requests');
    localStorage.removeItem('th_enterprise_notifications');
    localStorage.removeItem('th_notification_audit_logs');
    
    alert("System database has been reset to base initialization state.");
  };

  const handlePostMaintenanceTicket = (ticket: MaintenanceTicket) => {
    setTickets([ticket, ...tickets]);
  };

  const handleUpdateTicketStatus = (ticketId: string, status: 'ACTIVE' | 'RESOLVED', staff: string) => {
    setTickets(tickets.map(t => t.id === ticketId ? { ...t, status, assignedStaff: staff } : t));
    
    // Auto restore related room if ticket was resolved
    const tItem = tickets.find(t => t.id === ticketId);
    if (status === 'RESOLVED' && tItem?.location.startsWith('Room ')) {
      const rId = tItem.location.replace('Room ', '');
      setRooms(rooms.map(r => r.id === rId ? { ...r, status: 'Vacant', subStatus: 'READY' } : r));
    }
  };

  const handleApproveTicket = (ticketId: string) => {
    setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: 'RESOLVED' } : t));
  };

  const handleApproveFinancial = (recordId: string) => {
    setFinancials(financials.map(f => f.id === recordId ? { ...f, status: 'Approved' } : f));
  };

  const handlePostFinancial = (record: FinancialRecord) => {
    setFinancials([record, ...financials]);
  };

  const handleBulkImportFinancials = (records: FinancialRecord[]) => {
    setFinancials(prev => [...records, ...prev]);
  };

  const handleRequestRestock = (itemId: string) => {
    // Set stock to safety buffer + 30
    setStock(stock.map(s => s.id === itemId ? { ...s, stockCount: s.minLimit + 30 } : s));

    // Post corresponding expense to finances
    const it = stock.find(s => s.id === itemId);
    if (it) {
      const rec: FinancialRecord = {
        id: `TX-${Date.now().toString().slice(-4)}`,
        type: 'Expense',
        amount: Math.round((it.price !== undefined ? it.price : 0) * 30),
        category: 'Inventory Purchase',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        description: `Automated reorder replenishment: ${it.name} (+30 units)`,
        status: 'Approved'
      };
      setFinancials([rec, ...financials]);
    }
  };

  const handleAddVisitor = (vis: VisitorLog) => {
    setVisitors([vis, ...visitors]);
  };

  const handleAddIncident = (inc: IncidentReport) => {
    setIncidents([inc, ...incidents]);

    // Root notifications Levels system logic
    const level: 1 | 2 | 3 = inc.severity === 'Critical' ? 3 : inc.severity === 'Medium' ? 2 : 1;
    const alertNotif: SystemNotification = {
      id: `N-${Date.now()}`,
      title: `Security Alert: ${inc.title}`,
      text: `Urgent threat reported at ${inc.location} by security patrol logs. Level-${level} escalation active.`,
      urgency: inc.severity === 'Critical' ? 'Critical' : 'Normal',
      level,
      timestamp: 'Just now',
      acknowledgedBy: []
    };
    setAllNotifications([alertNotif, ...allNotifications]);
  };

  const handleUpdateIncidentStatus = (id: string, status: 'Investigation' | 'Resolved') => {
    setIncidents(incidents.map(inc => inc.id === id ? { ...inc, status } : inc));
  };

  // --- 4. QUICK ROLE CHATBOT COGNITIVE ENGINE ---
  const handleQueryChatbot = (question: string) => {
    let responseText = "Checking operations logs... Tranquil Haven database matches your prompt. Standard procedures active.";
    const cleanQ = question.toLowerCase();

    if (cleanQ.includes('profit') || cleanQ.includes('revenue') || cleanQ.includes('p&l')) {
      const activeRevenues = financials.filter(f => f.type === 'Revenue' && f.status === 'Approved').reduce((s, c) => s + c.amount, 0);
      const activeExpenses = financials.filter(f => f.type === 'Expense' && f.status === 'Approved').reduce((s, c) => s + c.amount, 0);
      responseText = `Director Executive Ledger: Total net profit margin is currently UGX ${(activeRevenues - activeExpenses).toLocaleString()}. Approved Revenues: UGX ${activeRevenues.toLocaleString()} | approved Expenses: UGX ${activeExpenses.toLocaleString()}. Status: Highly Solid.`;
    } else if (cleanQ.includes('rooms needing inspection') || cleanQ.includes('inspection')) {
      const dirtyRooms = rooms.filter(r => r.status === 'Dirty').map(r => r.id).join(', ');
      responseText = dirtyRooms.length > 0 
        ? `Manager Overwatch: There are ${rooms.filter(r => r.status === 'Dirty').length} dirty rooms currently requiring cleanups or inspections: Rooms ${dirtyRooms}.`
        : "Manager Overwatch: Excellent! All guest suites are thoroughly cleaned and inspected. Clean rate: 100%.";
    } else if (cleanQ.includes('next room') || cleanQ.includes('clean next')) {
      const priorityRooms = rooms.filter(r => r.status === 'Dirty');
      responseText = priorityRooms.length > 0 
        ? `Maintenance Turnaround: Priority turnaround is Room ${priorityRooms[0].id} (${priorityRooms[0].type}). It is currently flagged as '${priorityRooms[0].subStatus}' and requires cleaning.`
        : "Maintenance Turnaround: All rooms are clean. Turnaround queue is clear.";
    } else if (cleanQ.includes('find guest') || cleanQ.includes('phone')) {
      responseText = "Receptionist CRM Assist: Present a phone digits code in the CRM search terminal above (e.g. searching '555' delivers Moore or Jenkins profile logs).";
    } else if (cleanQ.includes('who is on call') || cleanQ.includes('technician')) {
      responseText = "Maintenance logs: mike T. is the primary on-call technician logged today. Secondary support is on automated remote standby.";
    } else if (cleanQ.includes('ledger balance') || cleanQ.includes('ledger')) {
      const balance = financials.filter(f => f.status === 'Approved').reduce((sum, item) => item.type === 'Revenue' ? sum + item.amount : sum - item.amount, 0);
      responseText = `Accountant Ledger balancing: Approved Double-Entry sheet is balanced. Current Net Balance is UGX ${balance.toLocaleString()} across all checked categories.`;
    } else if (cleanQ.includes('wifi') || cleanQ.includes('ssid')) {
      responseText = "Guest Mobile: Secure high-speed Wi-Fi SSID is 'Tranquil_Haven_VIP' and secure passcode is 'havenlyComfort2026'. Unlimited fiber speed verified.";
    } else if (cleanQ.includes('housekeeping alert') || cleanQ.includes('stock')) {
      const lowStockNames = stock.filter(s => s.stockCount <= s.minLimit).map(s => s.name).join(', ');
      responseText = lowStockNames.length > 0
        ? `Warehouse Logistics: Low Stock warnings active on items: ${lowStockNames}. Auto purchase-orders are queued for signing.`
        : "Warehouse Logistics: All sheets, flour, beverages, and brass lightbulbs are perfectly stocked within baseline limits.";
    } else if (cleanQ.includes('incident') || cleanQ.includes('security')) {
      const unsolved = incidents.filter(i => i.status === 'Investigation');
      responseText = unsolved.length > 0
        ? `Security Log: ${unsolved.length} incident records are currently under live Investigation. Primary focus: ${unsolved[0].title} at ${unsolved[0].location}.`
        : "Security Log: 0 active incident records flagged. All sectors secure and checked.";
    }

    setAssistantChat([...assistantChat, { query: question, reply: responseText }]);
  };

  const handleCustomQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQueryInput.trim()) return;
    handleQueryChatbot(customQueryInput);
    setCustomQueryInput('');
  };

  // Render Mobile Application Core Layout (Unified between full-screen and simulator modes)
  const renderMobileAppContent = () => {
    // If not logged in, render the login screen inside the mobile app frame!
    if (!user || !profile) {
      return (
        <div className={`w-full h-full flex flex-col ${themeMode === 'dark' ? 'bg-[#121214] text-zinc-100' : 'bg-[#fcf9f5] text-zinc-900'} relative overflow-hidden`}>
          {/* Simulated Status Bar */}
          <div className={`px-5 py-2.5 flex justify-between items-center text-[10.5px] font-sans font-bold select-none ${themeMode === 'dark' ? 'bg-[#0a0a0c] text-zinc-500' : 'bg-zinc-100 text-zinc-500'}`}>
            <span>{deviceTime}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono tracking-wider font-black">5G</span>
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-3.5 h-3.5" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <LoginScreen />
          </div>
        </div>
      );
    }

    return (
      <div className={`w-full h-full flex flex-col relative overflow-hidden ${themeMode === 'dark' ? 'bg-[#121214] text-zinc-100' : 'bg-[#fcf9f5] text-zinc-900'}`}>
        
        {/* Sim Status Bar */}
        <div className={`px-5 py-2.5 flex justify-between items-center text-[11px] font-sans font-bold select-none z-40 relative border-b ${themeMode === 'dark' ? 'bg-[#121214] text-zinc-400 border-zinc-800' : 'bg-[#fcf9f5] text-zinc-500 border-zinc-200/50'}`}>
          <div className="flex items-center gap-1">
            <span>{deviceTime}</span>
            <span className="text-[8px] bg-amber-500 text-white font-extrabold px-1 rounded uppercase tracking-wider scale-90">2026</span>
          </div>
          
          {/* iOS Dynamic Island / Notch Animation */}
          {simulatorDevice === 'ios' && simulatorMode && (
            <motion.div 
              layout
              className={`absolute left-1/2 -translate-x-1/2 top-1.5 h-6 rounded-full flex items-center justify-center text-[9px] font-bold overflow-hidden cursor-pointer ${
                incomingCall || activeCall || latestSimBanner ? 'bg-black text-white px-4 py-1.5 shadow-lg max-w-[85%]' : 'bg-black w-24 h-5.5'
              }`}
              onClick={() => {
                if (incomingCall) {
                  setIncomingCall(false);
                  setActiveCall(true);
                }
              }}
              animate={{
                width: latestSimBanner ? 240 : (incomingCall ? 180 : (activeCall ? 140 : 100)),
                height: latestSimBanner ? 38 : 22
              }}
              transition={{ type: 'spring', damping: 18, stiffness: 120 }}
            >
              {latestSimBanner ? (
                <div className="flex items-center gap-2 text-[9px] text-zinc-200 truncate max-w-full">
                  <Bell className="w-3 h-3 text-amber-500 flex-shrink-0 animate-bounce" />
                  <span className="truncate leading-tight font-sans">
                    <strong>{latestSimBanner.title}:</strong> {latestSimBanner.body}
                  </span>
                </div>
              ) : incomingCall ? (
                <div className="flex items-center gap-2 text-green-400 font-sans text-[9px] font-extrabold tracking-wide">
                  <PhoneCall className="w-3 h-3 animate-pulse" />
                  <span className="animate-pulse">Incoming Call...</span>
                </div>
              ) : activeCall ? (
                <div className="flex items-center gap-2 text-green-400 font-sans text-[9px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                  <span>{Math.floor(callTimer / 60)}:{(callTimer % 60).toString().padStart(2, '0')}</span>
                </div>
              ) : (
                <span className="text-[8px] text-zinc-650 tracking-wider">TH-MOBILE</span>
              )}
            </motion.div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-[8px] tracking-wider font-extrabold opacity-75">Tranquil Mobile</span>
            <Wifi className="w-3 h-3 opacity-85" />
            <Battery className="w-3.5 h-3.5 opacity-90" />
          </div>
        </div>

        {/* Dynamic Push Banner Toast for Android */}
        {latestSimBanner && (simulatorDevice === 'android' || !simulatorMode) && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-12 left-3 right-3 z-[999] bg-zinc-950/95 text-zinc-100 p-3 rounded-2xl shadow-2xl border border-zinc-800 flex items-start gap-3 backdrop-blur-md"
            onClick={() => setLatestSimBanner(null)}
          >
            <div className="bg-amber-500 p-1.5 rounded-lg text-white">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <h5 className="text-[11px] font-bold text-white truncate leading-tight">{latestSimBanner.title}</h5>
              <p className="text-[9.5px] text-zinc-400 font-sans mt-0.5 leading-relaxed">{latestSimBanner.body}</p>
            </div>
            <button className="text-zinc-500 hover:text-white text-[10px]">✕</button>
          </motion.div>
        )}

        {/* Simulated Incoming Ringing Call Overlay */}
        {incomingCall && (
          <div className="absolute inset-0 bg-black/95 z-[999] flex flex-col justify-between p-8 text-center text-white font-sans">
            <div className="pt-16 space-y-3">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-[#a89078] flex items-center justify-center mx-auto ring-4 ring-amber-500/30 animate-pulse">
                <User className="w-10 h-10 text-[#a89078]" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">{callName}</h3>
              <p className="text-xs text-[#a89078] font-semibold tracking-wide uppercase">Tranquil VoIP Request</p>
            </div>
            <div className="flex justify-around pb-12">
              <button 
                onClick={() => setIncomingCall(false)}
                className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors cursor-pointer shadow-lg animate-pulse"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
              <button 
                onClick={() => {
                  setIncomingCall(false);
                  setActiveCall(true);
                }}
                className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center hover:bg-green-700 transition-colors cursor-pointer shadow-lg animate-bounce"
              >
                <Phone className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Simulated Active VoIP Call Screen */}
        {activeCall && (
          <div className="absolute inset-0 bg-[#0c0c0e] z-[998] flex flex-col justify-between p-8 text-center text-white font-sans">
            <div className="pt-16 space-y-2">
              <div className="w-20 h-20 rounded-full bg-[#a89078]/20 border border-[#a89078]/40 flex items-center justify-center mx-auto">
                <User className="w-10 h-10 text-[#a89078]" />
              </div>
              <h3 className="text-lg font-bold tracking-tight">{callName}</h3>
              <p className="text-xs text-[#a89078] font-bold uppercase tracking-widest">VoIP Connection Active</p>
              <p className="text-sm font-mono text-zinc-400 mt-2">
                {Math.floor(callTimer / 60)}:{(callTimer % 60).toString().padStart(2, '0')}
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-6 max-w-xs mx-auto pb-8 text-zinc-400">
              <button 
                onClick={() => setCallMuted(!callMuted)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${callMuted ? 'bg-[#a89078]/25 text-[#a89078]' : 'hover:bg-zinc-900'}`}
              >
                <VolumeX className="w-5 h-5" />
                <span className="text-[9px] font-bold">Mute</span>
              </button>
              <button 
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-zinc-900"
                onClick={() => alert("Simulated speakerphone keypad is active")}
              >
                <Layers className="w-5 h-5" />
                <span className="text-[9px] font-bold">Keypad</span>
              </button>
              <button 
                onClick={() => setCallSpeaker(!callSpeaker)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${callSpeaker ? 'bg-green-500/20 text-green-400' : 'hover:bg-zinc-900'}`}
              >
                <Volume2 className="w-5 h-5" />
                <span className="text-[9px] font-bold">Speaker</span>
              </button>
            </div>

            <div className="pb-12">
              <button 
                onClick={() => setActiveCall(false)}
                className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors mx-auto cursor-pointer shadow-xl"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Compact Mobile App Header */}
        <header className={`px-4 py-3.5 flex justify-between items-center border-b backdrop-blur-md sticky top-0 z-30 ${themeMode === 'dark' ? 'bg-[#121214]/90 border-zinc-800' : 'bg-[#fcf9f5]/90 border-zinc-200/50'}`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-white flex items-center justify-center shadow-md border border-zinc-200">
              <img src={brandLogo} alt="Tranquil Logo" className="w-full h-full object-contain p-0.5" />
            </div>
            <div className="text-left">
              <h2 className="font-display font-black text-xs text-zinc-900 leading-none dark:text-white">Tranquil Haven</h2>
              <span className="text-[8px] font-mono font-bold text-[#a89078] uppercase tracking-wider">{effectiveRole}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick persistent notifications bell */}
            <button
              onClick={() => setNotificationCenterOpen(true)}
              className={`p-1.5 rounded-full transition-all relative ${themeMode === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}`}
            >
              <Bell className="w-3.5 h-3.5" />
              {notifications.filter(n => n.status !== 'COMPLETED' && n.status !== 'DISMISSED').length > 0 && (
                <span className="absolute top-0 right-0 bg-red-600 text-white text-[7px] w-2.5 h-2.5 rounded-full flex items-center justify-center border border-white">
                </span>
              )}
            </button>

            {/* Profile Avatar */}
            <div 
              className="w-7 h-7 rounded-full overflow-hidden border border-zinc-300 cursor-pointer hover:ring-2 hover:ring-[#a89078]" 
              onClick={() => setIsProfilePicModalOpen(true)}
            >
              <img 
                src={profile?.photoURL || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80"} 
                className="w-full h-full object-cover" 
                alt="Profile"
              />
            </div>
          </div>
        </header>

        {/* Central Scrollable App Canvas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroller">
          <AnimatePresence mode="wait">
            <motion.div
              key={mobileTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {mobileTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Render Role Screen */}
                  {effectiveRole === 'Director' && (
                    <DirectorScreen 
                      rooms={rooms} setRooms={setRooms} reservations={reservations} tickets={tickets}
                      guests={guests} stock={stock} financials={financials} allNotifications={allNotifications}
                      messages={messages} onAddMessage={handleAddMessage} onApproveFinancial={handleApproveFinancial}
                      onAddNotification={handleAddNotification} serviceRequests={serviceRequests}
                      onUpdateServiceRequestStatus={handleUpdateServiceRequestStatus}
                      onApproveRoomInspection={handleApproveRoomInspection} onDeleteServiceRequest={handleDeleteServiceRequest}
                    />
                  )}

                  {effectiveRole === 'Manager' && (
                    <ManagerScreen 
                      rooms={rooms} setRooms={setRooms} reservations={reservations} tickets={tickets}
                      stock={stock} setStock={setStock} financials={financials} onPostFinancial={handlePostFinancial}
                      allNotifications={allNotifications} messages={messages} onAddMessage={handleAddMessage}
                      onApproveTicket={handleApproveTicket} onRequestRestock={handleRequestRestock}
                      serviceRequests={serviceRequests} onUpdateServiceRequestStatus={handleUpdateServiceRequestStatus}
                      onApproveRoomInspection={handleApproveRoomInspection} onDeleteServiceRequest={handleDeleteServiceRequest}
                    />
                  )}

                  {effectiveRole === 'Receptionist' && (
                    <ReceptionistScreen 
                      rooms={rooms} setRooms={setRooms} reservations={reservations} guests={guests} messages={messages}
                      onAddMessage={handleAddMessage} onAddReservation={handleAddReservation}
                      onCheckInGuest={handleCheckInGuest} onCheckOutGuest={handleCheckOutGuest}
                      onRegisterGuestCRM={handleRegisterGuestCRM} onAddNotification={handleAddNotification}
                      onOpenAiAgent={openAiAgent}
                      serviceRequests={serviceRequests} onUpdateServiceRequestStatus={handleUpdateServiceRequestStatus}
                      onApproveRoomInspection={handleApproveRoomInspection} onDeleteServiceRequest={handleDeleteServiceRequest}
                      onPostFinancial={handlePostFinancial}
                    />
                  )}

                  {effectiveRole === 'Maintenance Officer' && (
                    <MaintenanceScreen 
                      rooms={rooms} tickets={tickets} onApproveTicket={handleApproveTicket}
                      onUpdateTicketStatus={handleUpdateTicketStatus} onUpdateRoomSubStatus={handleUpdateRoomSubStatus}
                      onPostMaintenanceTicket={handlePostMaintenanceTicket}
                    />
                  )}

                  {effectiveRole === 'Accountant' && (
                    <AccountantScreen 
                      financials={financials} onApproveFinancial={handleApproveFinancial}
                      onPostFinancial={handlePostFinancial} onBulkImportFinancials={handleBulkImportFinancials}
                    />
                  )}

                  {effectiveRole === 'Inventory Officer' && (
                    <InventoryScreen 
                      stock={stock} onRequestRestock={handleRequestRestock} onPostFinancial={handlePostFinancial}
                    />
                  )}

                  {effectiveRole === 'Security Officer' && (
                    <SecurityScreen 
                      visitors={visitors} incidents={incidents} onAddVisitor={handleAddVisitor}
                      onAddIncident={handleAddIncident} onUpdateIncidentStatus={handleUpdateIncidentStatus}
                    />
                  )}

                  {effectiveRole === 'Guest' && (
                    <GuestPortalScreen 
                      rooms={rooms} reservations={reservations} messages={messages} guests={guests}
                      allNotifications={allNotifications} onAddMessage={handleAddMessage}
                      onPostMaintenanceTicket={handlePostMaintenanceTicket} onAddNotification={handleAddNotification}
                      onPostServiceRequest={handlePostServiceRequest} serviceRequests={serviceRequests}
                    />
                  )}
                </div>
              )}

              {mobileTab === 'rooms' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500">Live Suites Inventory</h3>
                    <span className="text-[10px] bg-amber-500/10 text-amber-800 font-extrabold px-1.5 py-0.5 rounded-full">STAFF</span>
                  </div>
                  <RoomsTab rooms={rooms} setRooms={setRooms} />
                </div>
              )}

              {mobileTab === 'tickets' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500">Maintenance & Incident Records</h3>
                    <span className="text-[10px] bg-red-500/10 text-red-800 font-extrabold px-1.5 py-0.5 rounded-full">DISPATCH</span>
                  </div>
                  <MaintenanceTab rooms={rooms} tickets={tickets} setRooms={setRooms} setTickets={setTickets} />
                </div>
              )}

              {mobileTab === 'ai-agent' && (
                <div className="space-y-6">
                  <div className="bg-[#a89078]/10 border border-[#a89078]/25 p-3.5 rounded-xl text-[10.5px] text-[#554a3e] leading-relaxed font-sans text-left">
                    <strong>Tranquil AI Smart Assistant:</strong> Type queries below to examine system margins, check suites cleaning turnarounds, or generate report files.
                  </div>
                      <AiAgentTab rooms={rooms} reservations={reservations} tickets={tickets} guestForMessage={aiTargetGuest} />
                  {/* User Profile Overview */}
                  <div className={`p-4 rounded-2xl border flex items-center gap-3.5 text-left ${themeMode === 'dark' ? 'bg-zinc-900/60 border-zinc-850' : 'bg-white border-zinc-200'}`}>
                    <img 
                      src={profile?.photoURL || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80"}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#a89078]/30"
                      alt="Profile"
                    />
                    <div>
                      <h4 className="text-xs font-black text-zinc-900 dark:text-white leading-none">{profile?.fullName || 'Active Staff'}</h4>
                      <p className="text-[10px] text-zinc-500 mt-1">{profile?.email || 'staff@haven.com'}</p>
                      <span className="text-[8px] bg-black text-white px-2 py-0.5 rounded font-extrabold uppercase mt-1.5 inline-block tracking-wider scale-95 origin-left">
                        {effectiveRole}
                      </span>
                    </div>
                  </div>

                  {/* App Settings List */}
                  <div className={`rounded-2xl border divide-y overflow-hidden text-left ${themeMode === 'dark' ? 'bg-zinc-900/40 border-zinc-855 divide-zinc-850' : 'bg-white border-zinc-150 divide-zinc-100'}`}>
                    
                    {/* Toggle theme mode inside the app */}
                    <div className="p-3.5 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        {themeMode === 'dark' ? <Moon className="w-4 h-4 text-[#a89078]" /> : <Sun className="w-4 h-4 text-[#a89078]" />}
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">Dark Theme</span>
                      </div>
                      <button 
                        onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
                        className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border-none bg-[#e2dfdc] ${themeMode === 'dark' ? 'bg-amber-500' : 'bg-zinc-200'}`}
                      >
                        <div className={`bg-white w-5 h-5 rounded-full shadow-md transition-transform duration-200 ${themeMode === 'dark' ? 'translate-x-4' : ''}`} />
                      </button>
                    </div>

                    {/* Expose traditional tabs fallback for administrators */}
                    {profile?.role === 'Director' && (
                      <div className="p-3.5 flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[#a89078]" />
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">Original Dashboard Tabs</span>
                        </div>
                        <button 
                          onClick={() => setRbacMode(!rbacMode)}
                          className="text-[10px] bg-zinc-900 text-white font-black px-2.5 py-1 rounded uppercase tracking-wider cursor-pointer"
                        >
                          {rbacMode ? 'Expose' : 'Lockbox'}
                        </button>
                      </div>
                    )}

                    {/* Interactive VoIP launcher simulation */}
                    <div className="p-3.5 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-green-600" />
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">Test VoIP Reception Ring</span>
                      </div>
                      <button 
                        onClick={() => triggerSimulatedCall('Vip Suite Room 304')}
                        className="p-1 px-2.5 bg-green-500/10 text-green-700 hover:bg-green-500 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer border-none"
                      >
                        Launch
                      </button>
                    </div>

                    {/* Interactive Notification banner launcher simulation */}
                    <div className="p-3.5 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-500" />
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">Test Push Alert Banner</span>
                      </div>
                      <button 
                        onClick={() => triggerSimulatedNotification('Elevator Repair', 'Technician Lucas has checked in for service of Elevator B.')}
                        className="p-1 px-2.5 bg-amber-500/10 text-amber-800 hover:bg-amber-500 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer border-none"
                      >
                        Launch
                      </button>
                    </div>

                    {/* App Version / Workspace Info */}
                    <div className="p-3.5 text-left text-[10px] text-zinc-400 space-y-1">
                      <p><strong>React Native Core:</strong> v0.74.2 (Android Target)</p>
                      <p><strong>Device Screen Width:</strong> Fluid Mobile Canvas</p>
                      <p><strong>Database:</strong> Real-time Firestore Sync</p>
                    </div>
                  </div>

                  {/* Purge / Clear All Button */}
                  <div className="space-y-2">
                    <button
                      onClick={handleClearAllData}
                      className="w-full bg-red-50 hover:bg-red-600 hover:text-white text-red-700 border border-red-200/50 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Purge Active Registries
                    </button>
                    <button
                      onClick={() => logout()}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Power className="w-3.5 h-3.5" />
                      Log Out Securely
                    </button>
                  </div>
                </div>
              )}

              {mobileTab === 'more' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                    <div>
                      <h2 className="font-display font-black text-lg text-black uppercase tracking-wide">AI Message Generator</h2>
                      <p className="text-xs text-zinc-500 font-sans mt-0.5">Generate payment confirmation messages</p>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-black font-mono">TOOL</span>
                  </div>
                  <AiMessageGenerator />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating Add Booking trigger inside simulator home screen */}
        {mobileTab === 'dashboard' && (effectiveRole === 'Director' || effectiveRole === 'Manager' || effectiveRole === 'Receptionist') && (
          <button
            onClick={() => setShowBookingModal(true)}
            className="absolute bottom-20 right-6 bg-[#a89078] hover:bg-zinc-900 text-[#f5f0eb] w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-40 cursor-pointer ring-4 ring-white/30 border-none"
            title="Create instant booking"
          >
            <Calendar className="w-5 h-5" />
          </button>
        )}

        {/* Bottom Tab Bar (Custom Mobile App Navigation) */}
        <nav className={`px-4 pt-2 pb-5 border-t flex justify-around items-center z-40 ${themeMode === 'dark' ? 'bg-[#0a0a0c] border-zinc-800' : 'bg-[#fcf9f5]/95 border-zinc-200/60 backdrop-blur-md'}`}>
          <button 
            onClick={() => setMobileTab('dashboard')}
            className={`flex flex-col items-center gap-1 p-1 transition-all cursor-pointer border-none bg-transparent ${mobileTab === 'dashboard' ? 'text-[#a89078] scale-105' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[8.5px] font-bold uppercase tracking-wider">Home</span>
          </button>

          <button 
            onClick={() => setMobileTab('rooms')}
            className={`flex flex-col items-center gap-1 p-1 transition-all cursor-pointer border-none bg-transparent ${mobileTab === 'rooms' ? 'text-[#a89078] scale-105' : 'text-zinc-400 hover:text-zinc-650'}`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[8.5px] font-bold uppercase tracking-wider">Suites</span>
          </button>

          <button 
            onClick={() => setMobileTab('tickets')}
            className={`flex flex-col items-center gap-1 p-1 transition-all cursor-pointer border-none bg-transparent ${mobileTab === 'tickets' ? 'text-[#a89078] scale-105' : 'text-zinc-400 hover:text-zinc-650'}`}
          >
            <Wrench className="w-5 h-5" />
            <span className="text-[8.5px] font-bold uppercase tracking-wider">Tickets</span>
          </button>

          <button 
            onClick={() => setMobileTab('ai-agent')}
            className={`flex flex-col items-center gap-1 p-1 transition-all cursor-pointer border-none bg-transparent ${mobileTab === 'ai-agent' ? 'text-[#a89078] scale-105' : 'text-zinc-400 hover:text-zinc-650'}`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[8.5px] font-bold uppercase tracking-wider">AI Guard</span>
          </button>

          <button 
            onClick={() => setMobileTab('more')}
            className={`flex flex-col items-center gap-1 p-1 transition-all cursor-pointer border-none bg-transparent ${mobileTab === 'more' ? 'text-emerald-600 scale-105' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[8.5px] font-bold uppercase tracking-wider">AI Msg</span>
          </button>
        </nav>
      </div>
    );
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'reservations', label: 'Reservations', icon: 'calendar_month' },
    { id: 'rooms', label: 'Rooms', icon: 'bed' },
    { id: 'maintenance', label: 'Maintenance', icon: 'build' },
    { id: 'workspace', label: 'Workspace', icon: 'cloud' },
    { id: 'ai-agent', label: 'AI Agent', icon: 'smart_toy' },
  ];

  return (
    <>
      {profile && (
        <NotificationCenter
          isOpen={notificationCenterOpen}
          onClose={() => setNotificationCenterOpen(false)}
          currentRole={profile.role}
          currentUsername="Alex Mercer"
        />
      )}
      <AnimatePresence>
        {isAppLoading && (
          <motion.div
            key="loading-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black font-sora text-white select-none overflow-hidden"
          >
            {/* Cinematic Background */}
            <div className="absolute inset-0 z-0">
              <div 
                className="absolute inset-0 bg-cover bg-center scale-105" 
                style={{ backgroundImage: `url(${backgroundImage})`, filter: 'blur(30px) brightness(0.35)' }}
              />
              <div className="absolute inset-0 void-overlay" />
            </div>

            {/* Main Content Canvas */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full max-w-md px-6 text-center">
              {/* The Centerpiece Brand Logo */}
              <div className="flex flex-col items-center justify-center animate-fade-in">
                <div className="p-4 bg-white rounded-2xl shadow-2xl border border-white/20 mb-2 animate-breathing max-w-[210px] flex items-center justify-center">
                  <img
                    src={brandLogo}
                    alt="Tranquil Haven Logo"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-contain select-none"
                  />
                </div>
                
                {/* Premium Minimalist Loading Indicator */}
                <div className="mt-8 flex flex-col items-center gap-5">
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" />
                  </div>
                  
                  {/* Subtle Status Text */}
                  <span className="font-geist text-[10px] tracking-[0.25em] uppercase text-zinc-300 opacity-90 select-none">
                    Initializing Interface
                  </span>
                </div>
              </div>

              {/* Footnote Branding */}
              <div className="absolute bottom-10 opacity-30 w-full left-0 right-0 text-center">
                <p className="font-geist text-[9px] tracking-[0.2em] uppercase">
                  © 2026 Titanium Systems
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isAppLoading && (!user || !profile) ? (
        <LoginScreen />
      ) : (
        <div 
          className="min-h-screen pb-24 md:pb-8 flex flex-col font-sans select-none antialiased text-[#1a1a1a] bg-cover bg-center bg-no-repeat bg-fixed relative overflow-x-hidden"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        >
      {/* 2026 LUXURY HOTEL GLASS OVERLAY BACKDROP DESCRIPTION */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px] -z-10" />
      
      {/* 1. BRAND APPLICATION HEADER */}
      <header className="bg-white/60 backdrop-blur-lg border-b border-white/20 sticky top-0 z-40 shadow-xs">
        <div className="flex justify-between items-center w-full px-4 md:px-6 py-4 max-w-7xl mx-auto">
          {/* Brand Logo Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center shadow-md hover:rotate-6 transition-transform cursor-pointer border border-white/40">
              <img
                src={brandLogo}
                alt="Tranquil Haven"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain p-1"
              />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="font-display font-black text-lg md:text-xl text-black tracking-tight leading-none">
                  Tranquil Haven
                </h1>
                <span className="text-[9px] bg-neutral-900 text-white font-mono rounded px-1 font-bold">2026 EDITION</span>
              </div>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.25em] block mt-0.5">
                Hospitality Command Center
              </p>
            </div>
          </div>

          {/* Core framework / switcher buttons */}
          <div className="flex items-center gap-3">
            {/* Traditional tab vs enterprise system toggle */}
            {profile?.role === 'Director' && (
              <button
                onClick={() => {
                  setRbacMode(!rbacMode);
                  // Clear any alerts
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all hidden sm:flex items-center gap-1.5 border border-white/40 cursor-pointer bg-white/75 text-zinc-900 hover:bg-white/90 shadow-sm backdrop-blur-xs"
                title="Toggle view mode format"
              >
                <Layers className="w-3.5 h-3.5 text-[#a89078]" />
                {rbacMode ? 'Expose Traditional Tabs' : 'Enable RBAC Lockbox'}
              </button>
            )}

            {/* Global Clear Data Trigger */}
            <button
              onClick={handleClearAllData}
              className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border border-red-200/55 cursor-pointer bg-red-50 text-red-700 hover:bg-red-700 hover:text-white shadow-xs backdrop-blur-xs"
              title="Purge operations registries & database"
              id="global-clear-data-button"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Data</span>
            </button>

            {/* Persistent Notification Center Bell Trigger */}
            <button
              onClick={() => setNotificationCenterOpen(true)}
              className="bg-black text-[#f5f0eb] hover:bg-neutral-800 p-2.5 rounded-full transition-all flex items-center justify-center cursor-pointer shadow-md relative group border border-white/10"
              title="Open Persistent operations Notification Center"
            >
              <Bell className="w-4 h-4 text-[#a89078] group-hover:scale-110 transition-transform" />
              {notifications.filter(n => n.status !== 'COMPLETED' && n.status !== 'DISMISSED').length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-650 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse border border-white">
                  {notifications.filter(n => n.status !== 'COMPLETED' && n.status !== 'DISMISSED').length}
                </span>
              )}
            </button>

            {/* AI Assistant drawer button */}
            <button
              onClick={() => setAssistantDrawerOpen(true)}
              className="bg-black text-[#f5f0eb] hover:bg-neutral-800 p-2.5 rounded-full transition-all flex items-center justify-center cursor-pointer shadow-md"
              title="Speak with AI Guard Butler"
            >
              <span className="w-4 h-4 text-xs font-display font-black text-[#a89078] flex items-center justify-center leading-none select-none">T</span>
            </button>

            {/* Authenticated User Display Card with Logout Trigger */}
            <div className="flex items-center gap-2.5 border-l border-white/20 pl-3.5">
              <div className="relative group cursor-pointer" onClick={() => setIsProfilePicModalOpen(true)} title="Update Profile Picture">
                <img
                  alt="Active officer template"
                  className="w-9 h-9 rounded-full object-cover border border-neutral-300 group-hover:ring-2 group-hover:ring-[#a89078]/60 transition-all duration-200"
                  src={profile?.photoURL || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80"}
                />
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div className="hidden lg:block text-left cursor-pointer" onClick={() => setIsProfilePicModalOpen(true)} title="Update Profile Picture">
                <p className="text-xs font-bold leading-none text-black hover:text-[#a89078] transition-colors">{profile?.fullName || 'Anonymous User'}</p>
                <p className="text-[9.5px] text-[#a89078] font-bold uppercase mt-1">{effectiveRole}</p>
              </div>
              <button
                onClick={() => logout()}
                className="p-1.5 ml-1 rounded-lg text-neutral-800 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer border-none bg-transparent"
                title="Log out securely"
              >
                <Power className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 space-y-6 relative">
        
        {/* If RBAC LOCKBOX MODE IS ACTIVE -> Render role switcher + specific screen */}
        {rbacMode ? (
          <div className="space-y-6">
            
            {/* Secure Dashboard View Box */}
            <div className="bg-white/85 backdrop-blur-xl border border-white/45 p-5 md:p-6 rounded-2xl min-h-[500px] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#a89078]" />
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={effectiveRole}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {effectiveRole === 'Director' && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-100 pb-3 gap-2">
                        <div>
                          <h2 className="font-display font-black text-lg text-black uppercase tracking-wide flex items-center gap-2">
                            Director - Secure Executive Suite
                          </h2>
                          <p className="text-xs text-zinc-500 font-sans mt-0.5">Authorized root controller: Auditing profit margins, signatures & Tranquil PDF generation.</p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <button
                            onClick={handleClearAllData}
                            className="bg-red-50 text-red-700 hover:bg-red-800 hover:text-white px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all border border-red-200 cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            <span>Clear Data ⌫</span>
                          </button>
                          <span className="text-[10px] bg-zinc-900 text-white font-mono px-3 py-1 rounded font-black tracking-widest uppercase">ROOT ACCESS LEVEL-3</span>
                        </div>
                      </div>

                      <DirectorScreen 
                        rooms={rooms}
                        setRooms={setRooms}
                        reservations={reservations}
                        tickets={tickets}
                        guests={guests}
                        stock={stock}
                        financials={financials}
                        allNotifications={allNotifications}
                        messages={messages}
                        onAddMessage={handleAddMessage}
                        onApproveFinancial={handleApproveFinancial}
                        onAddNotification={handleAddNotification}
                        serviceRequests={serviceRequests}
                        onUpdateServiceRequestStatus={handleUpdateServiceRequestStatus}
                        onApproveRoomInspection={handleApproveRoomInspection}
                        onDeleteServiceRequest={handleDeleteServiceRequest}
                      />

                      {/* Embedded Tranquil Report Builder within Director credentials */}
                      <div className="border-t border-zinc-200 pt-8 mt-8">
                        <div className="bg-yellow-50/20 border border-yellow-250 p-4 rounded-xl mb-4 text-xs flex gap-2">
                          <span className="w-4 h-4 text-xs font-display font-black text-[#a89078] flex items-center justify-center leading-none flex-shrink-0 select-none">T</span>
                          <p className="text-[#645228] font-medium leading-relaxed font-sans">
                            <strong>Tranquil AI Intelligence:</strong> Securely integrated server-side with your Level-3 Director permissions. Create operational reports in Word or printable PDF using actual live variables, adhering strictly to enterprise-level hotel requirements.
                          </p>
                        </div>
                        <AiAgentTab 
                          rooms={rooms} 
                          reservations={reservations} 
                          tickets={tickets} 
                        />
                      </div>
                    </div>
                  )}

                  {effectiveRole === 'Manager' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-100 pb-3 gap-2">
                        <div>
                          <h2 className="font-display font-black text-lg text-black uppercase tracking-wide">
                            Manager - Hospitality Command Central
                          </h2>
                          <p className="text-xs text-zinc-500 font-sans mt-0.5">Operational oversight, supplies restock authorizations & AC hardware tickets.</p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <button
                            onClick={handleClearAllData}
                            className="bg-red-50 text-red-700 hover:bg-red-800 hover:text-white px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all border border-red-200 cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            <span>Clear Data ⌫</span>
                          </button>
                          <span className="text-[10px] border border-amber-300 text-amber-800 bg-amber-50 px-2 py-1 rounded font-black font-mono">LEVEL-2 OVERWATCH</span>
                        </div>
                      </div>
                      
                      <ManagerScreen 
                        rooms={rooms}
                        setRooms={setRooms}
                        reservations={reservations}
                        tickets={tickets}
                        stock={stock}
                        setStock={setStock}
                        financials={financials}
                        onPostFinancial={handlePostFinancial}
                        allNotifications={allNotifications}
                        messages={messages}
                        onAddMessage={handleAddMessage}
                        onApproveTicket={handleApproveTicket}
                        onRequestRestock={handleRequestRestock}
                        serviceRequests={serviceRequests}
                        onUpdateServiceRequestStatus={handleUpdateServiceRequestStatus}
                        onApproveRoomInspection={handleApproveRoomInspection}
                        onDeleteServiceRequest={handleDeleteServiceRequest}
                      />
                    </div>
                  )}

                  {effectiveRole === 'Receptionist' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                        <div>
                          <h2 className="font-display font-black text-lg text-black uppercase tracking-wide">
                            Receptionist - Concierge Desk Terminal
                          </h2>
                          <p className="text-xs text-zinc-500 font-sans mt-0.5">Handle walk-ins registration, settle guest checkout invoice sheets, or search member directory CRM.</p>
                        </div>
                        <span className="text-[10px] bg-zinc-100 text-zinc-650 px-2 py-1 rounded font-black font-mono">LEVEL-1 CONCIERGE</span>
                      </div>

                      <ReceptionistScreen 
                        rooms={rooms}
                        setRooms={setRooms}
                        reservations={reservations}
                        guests={guests}
                        messages={messages}
                        onAddMessage={handleAddMessage}
                        onAddReservation={handleAddReservation}
                        onCheckInGuest={handleCheckInGuest}
                        onCheckOutGuest={handleCheckOutGuest}
                        onRegisterGuestCRM={handleRegisterGuestCRM}
                        onAddNotification={handleAddNotification}
                        onOpenAiAgent={openAiAgent}
                        serviceRequests={serviceRequests}
                        onUpdateServiceRequestStatus={handleUpdateServiceRequestStatus}
                        onApproveRoomInspection={handleApproveRoomInspection}
                        onDeleteServiceRequest={handleDeleteServiceRequest}
                        onPostFinancial={handlePostFinancial}
                      />
                    </div>
                  )}

                  {effectiveRole === 'Maintenance Officer' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                        <div>
                          <h2 className="font-display font-black text-lg text-[#1a1a1a] uppercase tracking-wide">
                            Maintenance & Turnaround Console
                          </h2>
                          <p className="text-xs text-zinc-500 font-sans mt-0.5">Technician assignments, technical repair dispatches, room turnaround cleaning queues and status updates.</p>
                        </div>
                        <span className="text-[10px] bg-zinc-100 text-zinc-650 px-2.5 py-1 rounded font-bold font-mono">REPAIRS & CLEANING DIVISION</span>
                      </div>

                      <MaintenanceScreen 
                        rooms={rooms}
                        tickets={tickets}
                        onApproveTicket={handleApproveTicket}
                        onUpdateTicketStatus={handleUpdateTicketStatus}
                        onUpdateRoomSubStatus={handleUpdateRoomSubStatus}
                        onPostMaintenanceTicket={handlePostMaintenanceTicket}
                      />
                    </div>
                  )}

                  {effectiveRole === 'Accountant' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                        <div>
                          <h2 className="font-display font-black text-lg text-slate-800 uppercase tracking-wide">
                            Accountant - Double-Entry General Ledger terminal
                          </h2>
                          <p className="text-xs text-zinc-500 font-sans mt-0.5">Post expense logs, double entry checks, payroll buffers & cash reserves statistics.</p>
                        </div>
                        <span className="text-[10px] bg-zinc-100 text-zinc-650 px-2.5 py-1 rounded font-bold font-mono">FINANCE OFFICE</span>
                      </div>

                      <AccountantScreen 
                        financials={financials}
                        onApproveFinancial={handleApproveFinancial}
                        onPostFinancial={handlePostFinancial}
                        onBulkImportFinancials={handleBulkImportFinancials}
                      />
                    </div>
                  )}

                  {effectiveRole === 'Inventory Officer' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                        <div>
                          <h2 className="font-display font-black text-lg text-black uppercase tracking-wide">
                            Inventory Officer - Supply Warehouse Tracker
                          </h2>
                          <p className="text-xs text-zinc-500 font-sans mt-0.5">Linen sheets counts, organic kitchen restock logs & supply alerts thresholds.</p>
                        </div>
                        <span className="text-[10px] bg-zinc-100 text-zinc-650 px-2.5 py-1 rounded font-bold font-mono">LOGISTICS OFFICER</span>
                      </div>

                      <InventoryScreen 
                        stock={stock}
                        onRequestRestock={handleRequestRestock}
                        onPostFinancial={handlePostFinancial}
                      />
                    </div>
                  )}

                  {effectiveRole === 'Security Officer' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                        <div>
                          <h2 className="font-display font-black text-lg text-black uppercase tracking-wide">
                            Security Officer - Station 1 Checkpoint Guard
                          </h2>
                          <p className="text-xs text-zinc-500 font-sans mt-0.5">Visitor entries licenses plate checkin, incident logs under Investigation.</p>
                        </div>
                        <span className="text-[10px] bg-zinc-100 text-zinc-650 px-2.5 py-1 rounded font-bold font-mono">ESCORT UNIT</span>
                      </div>

                      <SecurityScreen 
                        visitors={visitors}
                        incidents={incidents}
                        onAddVisitor={handleAddVisitor}
                        onAddIncident={handleAddIncident}
                        onUpdateIncidentStatus={handleUpdateIncidentStatus}
                      />
                    </div>
                  )}

                  {effectiveRole === 'Guest' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                        <div>
                          <h2 className="font-display font-black text-lg text-black uppercase tracking-wide">
                            Guest Mobile Portal Viewport
                          </h2>
                          <p className="text-xs text-zinc-500 font-sans mt-0.5">QR Triggered smartphone preview: instant room service queries, checkout request, direct butler chatting.</p>
                        </div>
                        <span className="text-[10px] bg-black text-[#f5f0eb] font-mono px-2 py-1 rounded">GUEST MOBILE PREVIEW</span>
                      </div>

                      <GuestPortalScreen 
                        rooms={rooms}
                        reservations={reservations}
                        messages={messages}
                        guests={guests}
                        allNotifications={allNotifications}
                        onAddMessage={handleAddMessage}
                        onPostMaintenanceTicket={handlePostMaintenanceTicket}
                        onAddNotification={handleAddNotification}
                        onPostServiceRequest={handlePostServiceRequest}
                        serviceRequests={serviceRequests}
                      />
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* TRADITIONAL VIEW MODE ACTIVE -> Renders original 5 tabs for continuity matches */
          <div className="space-y-6">
            <div className="bg-amber-100/50 backdrop-blur-md border border-amber-500/15 p-4 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-display font-black text-xs uppercase tracking-wider text-[#a89078]">Staff Operations Overview (Exposed Tabs Template)</h4>
                <p className="text-[11px] text-zinc-650 font-sans">You are looking at the unified view format. Use "Enable RBAC Lockbox" top right to switch back to exclusive secure boards.</p>
              </div>
            </div>

            {/* Desktop Tab Selector Switchers */}
            <div className="flex items-center gap-1.5 bg-white/45 border border-white/50 p-1.5 rounded-lg max-w-md backdrop-blur-xs">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-sans text-xs font-bold tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-black text-[#f5f0eb] shadow-md'
                        : 'text-zinc-700 hover:text-black hover:bg-white/40'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative bg-white/85 backdrop-blur-xl border border-white/45 rounded-2xl p-6 min-h-[500px] shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === 'overview' && (
                    <OverviewTab
                      rooms={rooms}
                      reservations={reservations}
                      activities={activities}
                      onSwitchTab={setActiveTab}
                      onOpenQuickBooking={() => setShowBookingModal(true)}
                    />
                  )}

                  {activeTab === 'reservations' && (
                    <ReservationsTab
                      rooms={rooms}
                      reservations={reservations}
                      setRooms={setRooms}
                      setReservations={setReservations}
                      setActivities={setActivities}
                      onOpenQuickBooking={() => setShowBookingModal(true)}
                    />
                  )}

                  {activeTab === 'rooms' && (
                    <RoomsTab rooms={rooms} setRooms={setRooms} />
                  )}

                  {activeTab === 'maintenance' && (
                    <MaintenanceTab
                      rooms={rooms}
                      tickets={tickets}
                      setRooms={setRooms}
                      setTickets={setTickets}
                    />
                  )}

                  {activeTab === 'workspace' && (
                    <WorkspaceTab />
                  )}

                  {activeTab === 'ai-agent' && (
                    <AiAgentTab
                      rooms={rooms}
                      reservations={reservations}
                      tickets={tickets}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}

      </main>

      {/* 3. FLOATING AI ROLE-ASSISTANT INSTRUCTIONS WALKOVER DRAWER */}
      <AnimatePresence>
        {assistantDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setAssistantDrawerOpen(false)}
              className="fixed inset-0 bg-black z-50 transition-opacity"
            />
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 22, stiffness: 180 }}
              className="fixed right-0 top-0 h-full w-[400px] max-w-full bg-surface-container-lowest border-l border-zinc-200 z-50 p-6 flex flex-col justify-between shadow-2xl"
            >
              <div>
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#a89078] animate-spin" />
                    <span className="font-display font-black text-sm uppercase text-black tracking-wider">
                      Role-Specific Guide Butler
                    </span>
                  </div>
                  <button 
                    onClick={() => setAssistantDrawerOpen(false)}
                    className="text-zinc-400 hover:text-black font-bold text-xs uppercase cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="bg-[#fcf9f5] border border-[#a89078]/20 p-3 rounded-xl text-[10.5px] text-[#554a3e] mt-4 font-medium leading-relaxed font-sans">
                  Current simulated logged credentials represent <strong>{effectiveRole} Status</strong> operations. Present high-fidelity logs checks instantly below:
                </div>

                {/* Simulated assistant conversational records */}
                <div className="my-4 h-[300px] overflow-y-auto space-y-3 pr-2 scroller">
                  {assistantChat.map((chat, idx) => (
                    <div key={idx} className="space-y-1 text-xs">
                      <p className="font-bold text-zinc-500 font-sans block text-right">Prompt: "{chat.query}"</p>
                      <p className="p-3 bg-[#eae5de]/40 border border-zinc-200 rounded-lg text-zinc-800 leading-normal text-[11px] font-sans font-medium">
                        {chat.reply}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Preset click options depending on the Firestore profile role */}
                <div className="space-y-1.5 pb-4">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block font-sans">Quick Query Presets</span>
                  
                  {effectiveRole === 'Director' && (
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => handleQueryChatbot('Show latest gross P&L profit margins')}
                        className="text-left bg-zinc-50 hover:bg-zinc-100 p-2 rounded text-[10.5px] font-bold font-sans border border-none cursor-pointer text-zinc-800"
                      >
                        ★ What is today's net profit margin?
                      </button>
                      <button 
                        onClick={() => handleQueryChatbot('Which branch performs best today')}
                        className="text-left bg-zinc-50 hover:bg-zinc-100 p-2 rounded text-[10.5px] font-bold font-sans border border-none cursor-pointer text-zinc-800"
                      >
                        ★ Which branch performs best?
                      </button>
                    </div>
                  )}

                  {effectiveRole === 'Manager' && (
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => handleQueryChatbot('Find rooms needing inspection')}
                        className="text-left bg-zinc-50 hover:bg-zinc-100 p-2 rounded text-[10.5px] font-bold font-sans border border-none cursor-pointer text-zinc-800"
                      >
                        ★ Which rooms need inspection currently?
                      </button>
                      <button 
                        onClick={() => handleQueryChatbot('Are there low stock inventory alerts active?')}
                        className="text-left bg-zinc-50 hover:bg-zinc-100 p-2 rounded text-[10.5px] font-bold font-sans border border-none cursor-pointer text-zinc-800"
                      >
                        ★ Any logistics stockroom shortages?
                      </button>
                    </div>
                  )}

                  {effectiveRole === 'Receptionist' && (
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => handleQueryChatbot('Seek and find guest by phone')}
                        className="text-left bg-zinc-50 hover:bg-zinc-100 p-2 rounded text-[10.5px] font-bold font-sans border border-none cursor-pointer text-zinc-800"
                      >
                        ★ How to seek guests in the CRM?
                      </button>
                    </div>
                  )}

                  {effectiveRole === 'Maintenance Officer' && (
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => handleQueryChatbot('Who is on call today for technical elevator repairs')}
                        className="text-left bg-zinc-50 hover:bg-zinc-100 p-2 rounded text-[10.5px] font-bold font-sans border border-none cursor-pointer text-zinc-800"
                      >
                        ★ Who is the active technician assigned?
                      </button>
                      <button 
                        onClick={() => handleQueryChatbot('Which room should be cleaned next according to schedule prioritization')}
                        className="text-left bg-zinc-50 hover:bg-zinc-100 p-2 rounded text-[10.5px] font-bold font-sans border border-none cursor-pointer text-zinc-800"
                      >
                        ★ Which room turnaround is pending next?
                      </button>
                    </div>
                  )}

                  {effectiveRole === 'Accountant' && (
                    <button 
                      onClick={() => handleQueryChatbot('Check general ledger balanced status')}
                      className="w-full text-left bg-zinc-50 hover:bg-zinc-100 p-2 rounded text-[10.5px] font-bold font-sans border border-none cursor-pointer text-zinc-800"
                    >
                      ★ What is the overall ledger book balance?
                    </button>
                  )}

                  {effectiveRole === 'Inventory Officer' && (
                    <button 
                      onClick={() => handleQueryChatbot('Show housekeeping alert codes')}
                      className="w-full text-left bg-zinc-50 hover:bg-zinc-100 p-2 rounded text-[10.5px] font-bold font-sans border border-none cursor-pointer text-zinc-800"
                    >
                      ★ Check restock parameters
                    </button>
                  )}

                  {effectiveRole === 'Security Officer' && (
                    <button 
                      onClick={() => handleQueryChatbot('Status of security incidents and cctv feeds')}
                      className="w-full text-left bg-zinc-50 hover:bg-zinc-100 p-2 rounded text-[10.5px] font-bold font-sans border border-none cursor-pointer text-zinc-800"
                    >
                      ★ Which incidents are unresolved?
                    </button>
                  )}

                  {effectiveRole === 'Guest' && (
                    <button 
                      onClick={() => handleQueryChatbot('Give me wifi password and ssd identifier')}
                      className="w-full text-left bg-zinc-50 hover:bg-zinc-100 p-2 rounded text-[10.5px] font-bold font-sans border border-none cursor-pointer text-zinc-800"
                    >
                      ★ What is the Wi-Fi passcode?
                    </button>
                  )}
                </div>
              </div>

              {/* Custom Input */}
              <form onSubmit={handleCustomQuery} className="flex gap-2 border-t border-zinc-150 pt-3">
                <input
                  type="text"
                  placeholder="Pose specific hotel status queries..."
                  value={customQueryInput}
                  onChange={(e) => setCustomQueryInput(e.target.value)}
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#a89078]"
                />
                <button
                  type="submit"
                  className="bg-black text-[#f5f0eb] p-2 rounded-lg cursor-pointer hover:bg-zinc-800"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Booking Form Sheet Modal */}
      {showBookingModal && (
        <BookingModal
          rooms={rooms}
          onClose={() => setShowBookingModal(false)}
          setReservations={setReservations}
          setActivities={setActivities}
        />
      )}

      {/* WhatsApp Automatic Dispatch Modal */}
      {whatsappModalData && (
        <div id="whatsapp-sender-modal" className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#18181b] border border-zinc-800 text-zinc-150 w-full max-w-md rounded-2xl shadow-2xl p-5 relative space-y-4 font-sans">
            <button
              onClick={() => setWhatsappModalData(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white text-base transition-colors cursor-pointer"
            >
              ✕
            </button>
            
            <div className="flex items-center gap-3">
              <div className="bg-[#25D366]/20 p-2 rounded-full ring-2 ring-[#25D366]/40 animate-pulse">
                <MessageSquare className="w-5 h-5 text-[#25D366]" />
              </div>
              <div>
                <h3 className="font-display font-black text-xs uppercase tracking-wider text-white">
                  WhatsApp Dispatch Hub
                </h3>
                <p className="text-[9px] text-[#25D366] font-bold uppercase tracking-widest mt-0.5">
                  Automatic Invitation Formulated
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2.5 text-[11px] leading-relaxed">
              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-zinc-800">
                <div>
                  <span className="block text-zinc-500 font-bold uppercase text-[8.5px]">Guest Full Name</span>
                  <span className="font-bold text-white text-xs">{whatsappModalData.guestName}</span>
                </div>
                <div>
                  <span className="block text-zinc-500 font-bold uppercase text-[8.5px]">Selected Suite</span>
                  <span className="font-bold text-[#a89078] text-xs">Room {whatsappModalData.roomNo}</span>
                </div>
              </div>
              
              <div>
                <span className="block text-zinc-500 font-bold uppercase text-[8.5px] mb-0.5">WhatsApp Mobile Handle</span>
                <span className="font-mono text-white bg-black px-2 py-0.5 rounded border border-zinc-800 inline-block text-[10px]">
                  {whatsappModalData.phone}
                </span>
              </div>
              
              <div>
                <span className="block text-zinc-500 font-bold uppercase text-[8.5px] mb-0.5">Secure Invitation Path</span>
                <input
                  type="text"
                  readOnly
                  value={whatsappModalData.link}
                  className="w-full bg-black text-[#a89078] px-2.5 py-1 rounded border border-zinc-800 font-mono text-[9px] outline-none"
                />
              </div>

              <div>
                <span className="block text-zinc-100 font-bold uppercase text-[8.5px] mb-0.5">Composed Message Bubble</span>
                <textarea
                  readOnly
                  rows={4}
                  value={whatsappModalData.message}
                  className="w-full bg-black text-zinc-300 p-2 rounded border border-zinc-800 font-sans text-[10.5px] leading-relaxed resize-none outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(whatsappModalData.link);
                  alert("Secure guest portal link copied to clipboard successfully!");
                }}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 py-2 px-3 rounded-lg border border-zinc-800 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Copy Link
              </button>
              <a
                href={`https://api.whatsapp.com/send?phone=${whatsappModalData.phone.replace(/\D/g, '')}&text=${encodeURIComponent(whatsappModalData.message)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setWhatsappModalData(null)}
                className="flex-2 bg-[#25D366] hover:bg-[#20ba5a] text-white flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Open WhatsApp & Send
              </a>
            </div>

            <p className="text-[8px] text-zinc-500 text-center leading-none">
              ✔ Instant redirect handles sandboxed click constraint correctly.
            </p>
          </div>
        </div>
      )}

      {/* Profile Picture Settings Modal */}
      {isProfilePicModalOpen && (
        <ProfilePicModal
          currentUrl={profile?.photoURL}
          onClose={() => setIsProfilePicModalOpen(false)}
          onSave={updateProfilePicture}
        />
      )}

    </div>
    )}
    </>
  );
}
