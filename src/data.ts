/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Room, Reservation, MaintenanceTicket, TeamActivity } from './types';

export const INITIAL_ROOMS: Room[] = [];

export const INITIAL_RESERVATIONS: Reservation[] = [];

export const INITIAL_TICKETS: MaintenanceTicket[] = [];

export const INITIAL_TEAM_ACTIVITIES: TeamActivity[] = [];

export const REVENUE_STATS = [
  { day: 'Mon', value: 0 },
  { day: 'Tue', value: 0 },
  { day: 'Wed', value: 0 },
  { day: 'Thu', value: 0 },
  { day: 'Fri', value: 0 },
  { day: 'Sat', value: 0 },
  { day: 'Sun', value: 0 }
];
