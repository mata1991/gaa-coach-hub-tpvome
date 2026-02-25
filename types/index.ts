
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'club_admin' | 'coach' | 'stats_person' | 'player';
}

export interface Club {
  id: string;
  name: string;
  county?: string;
  colours?: string;
  primaryColor?: string;
  secondaryColor?: string;
  crestUrl?: string;
  createdAt: string;
  createdBy: string;
}

export interface Team {
  id: string;
  clubId: string;
  name: string;
  shortName?: string;
  sport?: string;
  grade?: string;
  ageGroup?: string;
  homeVenue?: string;
  // New field names (preferred)
  crestUri?: string | null;
  jerseyUri?: string | null;
  colours?: {
    primary: string;
    secondary: string;
    accent?: string | null;
  };
  isArchived?: boolean;
  // Legacy/backend field names (returned by current backend)
  crestUrl?: string | null;
  crestImageUrl?: string | null;
  jerseyImageUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  ageGrade?: string;
  level?: string;
  createdAt: string;
}

export interface Membership {
  id: string;
  clubId: string;
  userId: string;
  role: 'CLUB_ADMIN' | 'COACH' | 'STATS_PERSON' | 'PLAYER';
  userName?: string;
  userEmail?: string;
  createdAt: string;
}

export interface TeamMembership {
  id: string;
  teamId: string;
  userId: string;
  role: 'COACH' | 'STATS_PERSON' | 'PLAYER';
  userName?: string;
  userEmail?: string;
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
  homeTeamName?: string;
  homeCrestUrl?: string;
  homeCrestImageUrl?: string;
  homeColours?: string;
  homeJerseyImageUrl?: string;
  awayTeamName?: string;
  awayCrestUrl?: string;
  awayCrestImageUrl?: string;
  awayColours?: string;
  awayJerseyImageUrl?: string;
  createdAt: string;
}

export type PositionGroup = 'GK' | 'BACK' | 'MID' | 'FWD';

export interface Player {
  id: string;
  teamId: string;
  name: string;
  dob?: string;
  positions?: string;
  primaryPositionGroup?: PositionGroup;
  depthOrder?: number;
  jerseyNo?: number;
  dominantSide?: 'left' | 'right';
  notes?: string;
  injuryStatus?: string;
  isInjured?: boolean;
  injuryNote?: string;
  injuryUpdatedAt?: string;
  createdAt: string;
}

export interface MatchEvent {
  id?: string;
  fixtureId: string;
  playerId: string;
  side?: 'HOME' | 'AWAY';
  timestamp: number;
  eventType: string;
  eventCategory: 'Scoring' | 'Puckouts' | 'Possession' | 'Discipline' | 'Substitutions';
  half?: 'H1' | 'H2';
  outcome?: string;
  zone?: string;
  notes?: string;
  createdAt?: string;
  synced?: boolean;
  clientId?: string;
}

export interface EventPreset {
  category: string;
  types: {
    name: string;
    requiresOutcome?: boolean;
    outcomes?: string[];
  }[];
}

export type TeamSide = 'HOME' | 'AWAY';

export interface LineupSlot {
  positionNo: number;
  positionName: string;
  playerId: string | null;
  playerName: string | null;
  jerseyNo: string | null;
}

export interface SubEvent {
  time: string;
  matchTime: number;
  playerOffId: string;
  playerOffName: string;
  playerOnId: string;
  playerOnName: string;
}

export interface MatchSquad {
  id: string;
  fixtureId: string;
  side: TeamSide;
  startingSlots: LineupSlot[];
  bench: LineupSlot[];
  subsLog: SubEvent[];
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MatchState {
  id: string;
  fixtureId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  homeGoals: number;
  homePoints: number;
  awayGoals: number;
  awayPoints: number;
  matchClock: number;
  period: number;
  half?: 'H1' | 'H2';
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TrainingStatus = 'TRAINED' | 'INJURED' | 'EXCUSED' | 'NO_CONTACT';

export interface TrainingSession {
  id: string;
  teamId: string;
  dateTime: string;
  location?: string;
  focus?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  attendanceCounts?: {
    trained: number;
    injured: number;
    excused: number;
    noContact: number;
  };
}

export interface TrainingAttendance {
  id: string;
  sessionId: string;
  playerId: string;
  playerName?: string;
  status: TrainingStatus;
  note?: string;
  createdAt: string;
}
