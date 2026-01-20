
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'club_admin' | 'coach' | 'stats_person' | 'player';
}

export interface Club {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
}

export interface Team {
  id: string;
  clubId: string;
  name: string;
  ageGrade?: string;
  level?: string;
  createdAt: string;
}

export interface Season {
  id: string;
  clubId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Competition {
  id: string;
  seasonId: string;
  name: string;
  type: 'League' | 'Championship' | 'Shield';
}

export interface Fixture {
  id: string;
  teamId: string;
  competitionId: string;
  opponent: string;
  venue?: string;
  date: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  createdAt: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  dob?: string;
  positions?: string;
  jerseyNo?: number;
  dominantSide?: 'left' | 'right';
  notes?: string;
  injuryStatus?: string;
  createdAt: string;
}

export interface MatchEvent {
  id?: string;
  fixtureId: string;
  playerId: string;
  timestamp: number; // seconds
  eventType: string;
  eventCategory: 'Scoring' | 'Puckouts' | 'Possession' | 'Discipline' | 'Substitutions';
  outcome?: string;
  zone?: string;
  notes?: string;
  createdAt?: string;
  synced?: boolean;
  clientId?: string; // For offline tracking
}

export interface EventPreset {
  category: string;
  types: {
    name: string;
    requiresOutcome?: boolean;
    outcomes?: string[];
  }[];
}
