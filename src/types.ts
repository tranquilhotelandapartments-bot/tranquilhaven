/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RoomStatusType = 'Vacant' | 'Dirty' | 'Occupied' | 'Out of Order';

export interface Room {
  id: string; // Room number e.g. "101"
  type: string; // deluxe king, standard twin, standard queen, suite
  status: RoomStatusType;
  subStatus: string; // CLEANED, IN QUEUE, PRIVACY, SERVICE REQ, PRIORITY, STAYOVER, etc.
  guestName?: string;
  floor: '1st Floor' | '2nd Floor' | '3rd Floor' | 'Penthouse';
  notes: string;
  lastOccupiedDate?: string;
  lastCheckoutDate?: string;
  lastCleanedDate?: string;
  cleanPhoto?: string;
  cleanVideo?: string;
  cleanSubmittedBy?: string;
  cleanSubmittedTime?: string;
}

export type ReservationStatusType = 'EXPECTED' | 'CHECKED_IN' | 'CHECKING_OUT' | 'COMPLETED';

export interface Reservation {
  id: string;
  guestName: string;
  guestAvatar: string;
  roomNo: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  dateRange: string;
  numGuests: number;
  status: ReservationStatusType;
  checkedInTime?: string;
}

export interface MaintenanceTicket {
  id: string;
  location: string;
  issue: string;
  type: 'plumbing' | 'light_off' | 'wifi_off' | 'build' | 'monitoring' | 'cleaning_services';
  category: 'Urgent' | 'Routine' | 'Facility';
  status: 'ACTIVE' | 'RESOLVED';
  reportedTime: string;
  assignedStaff: string;
}

export interface TeamActivity {
  id: string;
  staffName: string;
  staffAvatar: string;
  action: string;
  timeAgo: string;
  statusType: 'success' | 'warning' | 'info';
}

// User Roles Defined
export type UserRole = 
  | 'Director'
  | 'Manager'
  | 'Receptionist'
  | 'Maintenance Officer'
  | 'Accountant'
  | 'Inventory Officer'
  | 'Security Officer'
  | 'Guest';

// Extended Guest Profiles CRM
export interface GuestCRM {
  id: string; // e.g. "TH-2026-00001"
  fullName: string;
  phone: string;
  email: string;
  passport: string;
  nationalId: string;
  emergencyContact: string;
  loyaltyPoints: number;
  spendingHistory: number; // in USD
  checkedInRoom?: string;
  historyLogs: string[];
}

// Inventory Stock Items
export interface StockItem {
  id: string;
  name: string;
  category: 'Housekeeping' | 'Kitchen' | 'Restaurant' | 'Bar' | 'Maintenance';
  stockCount: number;
  minLimit: number;
  expiryDate?: string;
  price: number;
}

// Accounting Transactions Ledger
export interface FinancialRecord {
  id: string;
  type: 'Revenue' | 'Expense';
  amount: number;
  category: string;
  timestamp: string;
  description: string;
  status: 'Approved' | 'Pending Approval';
}

// Security Logs
export interface VisitorLog {
  id: string;
  visitorName: string;
  hostGuestName: string;
  roomVisited: string;
  vehicleLicense?: string;
  checkInTime: string;
  checkOutTime?: string;
}

export interface IncidentReport {
  id: string;
  title: string;
  severity: 'Low' | 'Medium' | 'Critical';
  location: string;
  reportedBy: string;
  time: string;
  status: 'Investigation' | 'Resolved';
  actionTaken?: string;
}

// System Operations Notifications (Hierarchical)
export interface SystemNotification {
  id: string;
  title: string;
  text: string;
  urgency: 'VIP' | 'Emergency' | 'Critical' | 'SLA' | 'Normal';
  level: 1 | 2 | 3; // 1 = Receptionist, 2 = Manager, 3 = Director
  timestamp: string;
  acknowledgedBy: string[]; // List of roles who acknowledged this
}

// Internal Walkie-Talkie Walkthrough Messaging
export interface InternalMessage {
  id: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
}

// Automated WhatsApp Outbox Log
export interface WhatsAppLog {
  id: string;
  recipientPhone: string;
  recipientName: string;
  direction: 'outbound' | 'inbound';
  messageText: string;
  timestamp: string;
  status: 'sent' | 'received';
}

export type ServiceRequestStatus = 'Pending' | 'Accepted' | 'In Progress' | 'Delivered' | 'Closed';
export type ServiceRequestPriority = 'Normal' | 'Attention Needed' | 'Overdue' | 'Critical';

export interface ServiceRequest {
  id: string;
  roomNo: string;
  requestType: string;
  details?: string;
  requestedAt: string; // e.g. "10:32 AM"
  requestedTimeMs: number; // For calculations and real-time waiting timers
  assignedStaff: string; // Staff member assigned to service
  status: ServiceRequestStatus;
  priority: ServiceRequestPriority;
  escalationLevel: 1 | 2 | 3; // 1: Receptionist, 2: Manager, 3: Director
  minutesWaiting?: number; // Calculated dynamic field
}
