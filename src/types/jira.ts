export type TicketType = 'Story' | 'Task' | 'Bug' | 'Improvement' | 'Chore';

export interface Ticket {
  key: string;           // e.g., "PRJ-123"
  type: TicketType;      // 'Story' | 'Task' | 'Bug' | ...
  summary: string;       // short title
  labels?: string[];
  branch?: string;
  createdAt?: string;    // ISO date
}

export interface JiraMockData {
  tickets: Ticket[];
}
