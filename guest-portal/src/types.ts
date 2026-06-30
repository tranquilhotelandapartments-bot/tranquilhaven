export type UserRole = 'Guest';

export interface GuestCRM {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  passport: string;
  nationalId: string;
  emergencyContact: string;
  loyaltyPoints: number;
  spendingHistory: number;
  checkedInRoom?: string;
  historyLogs: string[];
}

export interface InternalMessage {
  id: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
}

export interface MaintenanceTicket {
  id: string;
  location: string;
  issue: string;
  type: string;
  category: string;
  status: 'ACTIVE' | 'RESOLVED';
  reportedTime: string;
  assignedStaff: string;
}

export interface ServiceRequest {
  id: string;
  roomNo: string;
  requestType: string;
  details?: string;
  requestedAt: string;
  requestedTimeMs: number;
  assignedStaff: string;
  status: 'Pending' | 'Accepted' | 'In Progress' | 'Delivered' | 'Closed';
  priority: 'Normal' | 'Attention Needed' | 'Overdue' | 'Critical';
  escalationLevel: 1 | 2 | 3;
  minutesWaiting?: number;
}

export interface SystemNotification {
  id: string;
  title: string;
  text: string;
  urgency: 'VIP' | 'Emergency' | 'Critical' | 'SLA' | 'Normal';
  level: 1 | 2 | 3;
  timestamp: string;
  acknowledgedBy: string[];
}
