import {
  pgTable,
  text,
  uuid,
  timestamp,
  date,
  integer,
  boolean,
  decimal,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth-schema.js';

// ============================================================================
// ENUMS
// ============================================================================

export const roleEnum = pgEnum('role', ['club_admin', 'coach', 'stats_person', 'player']);
export const fixtureStatusEnum = pgEnum('fixture_status', ['scheduled', 'in_progress', 'completed']);
export const competitionTypeEnum = pgEnum('competition_type', ['League', 'Championship', 'Shield']);
export const playerAvailabilityEnum = pgEnum('player_availability', ['available', 'unavailable', 'maybe']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'late', 'absent']);
export const dominantSideEnum = pgEnum('dominant_side', ['left', 'right']);
export const eventCategoryEnum = pgEnum('event_category', [
  'Scoring',
  'Puckouts',
  'Possession',
  'Discipline',
  'Substitutions',
]);

// ============================================================================
// CLUBS
// ============================================================================

export const clubs = pgTable('clubs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id, { onDelete: 'restrict' }),
}, (table) => [
  index('clubs_created_by_idx').on(table.createdBy),
]);

// ============================================================================
// TEAMS
// ============================================================================

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id')
    .notNull()
    .references(() => clubs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  ageGrade: text('age_grade'),
  level: text('level'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('teams_club_id_idx').on(table.clubId),
]);

// ============================================================================
// SEASONS
// ============================================================================

export const seasons = pgTable('seasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id')
    .notNull()
    .references(() => clubs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('seasons_club_id_idx').on(table.clubId),
  index('seasons_is_active_idx').on(table.isActive),
]);

// ============================================================================
// COMPETITIONS
// ============================================================================

export const competitions = pgTable('competitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  seasonId: uuid('season_id')
    .notNull()
    .references(() => seasons.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: competitionTypeEnum('type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('competitions_season_id_idx').on(table.seasonId),
]);

// ============================================================================
// FIXTURES
// ============================================================================

export const fixtures = pgTable('fixtures', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  competitionId: uuid('competition_id')
    .notNull()
    .references(() => competitions.id, { onDelete: 'cascade' }),
  opponent: text('opponent').notNull(),
  venue: text('venue'),
  date: timestamp('date').notNull(),
  status: fixtureStatusEnum('status').default('scheduled').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('fixtures_team_id_idx').on(table.teamId),
  index('fixtures_competition_id_idx').on(table.competitionId),
  index('fixtures_date_idx').on(table.date),
  index('fixtures_status_idx').on(table.status),
]);

// ============================================================================
// PLAYERS
// ============================================================================

export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  dob: date('dob'),
  positions: text('positions'),
  jerseyNo: integer('jersey_no'),
  dominantSide: dominantSideEnum('dominant_side'),
  notes: text('notes'),
  injuryStatus: text('injury_status'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('players_team_id_idx').on(table.teamId),
  uniqueIndex('players_team_jersey_unique_idx').on(table.teamId, table.jerseyNo),
]);

// ============================================================================
// AVAILABILITY
// ============================================================================

export const availability = pgTable('availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id')
    .notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  fixtureId: uuid('fixture_id').references(() => fixtures.id, { onDelete: 'cascade' }),
  trainingSessionId: uuid('training_session_id'),
  status: playerAvailabilityEnum('status').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('availability_player_id_idx').on(table.playerId),
  index('availability_fixture_id_idx').on(table.fixtureId),
  index('availability_training_session_id_idx').on(table.trainingSessionId),
]);

// ============================================================================
// TRAINING SESSIONS
// ============================================================================

export const trainingSessions = pgTable('training_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  date: timestamp('date').notNull(),
  focus: text('focus'),
  drills: text('drills'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('training_sessions_team_id_idx').on(table.teamId),
  index('training_sessions_date_idx').on(table.date),
]);

// ============================================================================
// ATTENDANCE
// ============================================================================

export const attendance = pgTable('attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id')
    .notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => trainingSessions.id, { onDelete: 'cascade' }),
  status: attendanceStatusEnum('status').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('attendance_player_id_idx').on(table.playerId),
  index('attendance_session_id_idx').on(table.sessionId),
  uniqueIndex('attendance_player_session_unique_idx').on(table.playerId, table.sessionId),
]);

// ============================================================================
// LINEUPS
// ============================================================================

export const lineups = pgTable('lineups', {
  id: uuid('id').primaryKey().defaultRandom(),
  fixtureId: uuid('fixture_id')
    .notNull()
    .references(() => fixtures.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  starting15: jsonb('starting_15').notNull(), // Array of { playerId, position }
  subs: jsonb('subs').notNull(), // Array of { playerId, order }
  minutesTargets: jsonb('minutes_targets'), // Map of playerId to target minutes
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('lineups_fixture_id_idx').on(table.fixtureId),
]);

// ============================================================================
// MATCH EVENTS
// ============================================================================

export const matchEvents = pgTable('match_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  fixtureId: uuid('fixture_id')
    .notNull()
    .references(() => fixtures.id, { onDelete: 'cascade' }),
  playerId: uuid('player_id').references(() => players.id, { onDelete: 'set null' }),
  timestamp: integer('timestamp').notNull(), // Match clock in seconds
  eventType: text('event_type').notNull(),
  eventCategory: eventCategoryEnum('event_category').notNull(),
  outcome: text('outcome'),
  zone: text('zone'),
  notes: text('notes'),
  clientId: text('client_id'), // For offline deduplication
  createdAt: timestamp('created_at').defaultNow().notNull(),
  synced: boolean('synced').default(false).notNull(),
}, (table) => [
  index('match_events_fixture_id_idx').on(table.fixtureId),
  index('match_events_player_id_idx').on(table.playerId),
  index('match_events_timestamp_idx').on(table.timestamp),
  index('match_events_client_id_idx').on(table.clientId),
  uniqueIndex('match_events_fixture_client_unique_idx').on(table.fixtureId, table.clientId),
]);

// ============================================================================
// DEVELOPMENT NOTES
// ============================================================================

export const developmentNotes = pgTable('development_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id')
    .notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  strengths: text('strengths'),
  targets: text('targets'),
  coachNotes: text('coach_notes'),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('development_notes_player_id_idx').on(table.playerId),
  index('development_notes_created_by_idx').on(table.createdBy),
]);

// ============================================================================
// FITNESS TESTS
// ============================================================================

export const fitnessTests = pgTable('fitness_tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id')
    .notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  testType: text('test_type').notNull(),
  date: date('date').notNull(),
  value: decimal('value', { precision: 10, scale: 2 }),
  unit: text('unit'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('fitness_tests_player_id_idx').on(table.playerId),
  index('fitness_tests_date_idx').on(table.date),
]);

// ============================================================================
// USER ROLES (Team-based permissions)
// ============================================================================

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('user_roles_user_id_idx').on(table.userId),
  index('user_roles_team_id_idx').on(table.teamId),
  uniqueIndex('user_roles_user_team_unique_idx').on(table.userId, table.teamId),
]);

// ============================================================================
// RELATIONS
// ============================================================================

export const clubsRelations = relations(clubs, ({ many, one }) => ({
  teams: many(teams),
  seasons: many(seasons),
  createdByUser: one(user, {
    fields: [clubs.createdBy],
    references: [user.id],
  }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  club: one(clubs, {
    fields: [teams.clubId],
    references: [clubs.id],
  }),
  players: many(players),
  fixtures: many(fixtures),
  trainingSessions: many(trainingSessions),
  userRoles: many(userRoles),
}));

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  club: one(clubs, {
    fields: [seasons.clubId],
    references: [clubs.id],
  }),
  competitions: many(competitions),
}));

export const competitionsRelations = relations(competitions, ({ one, many }) => ({
  season: one(seasons, {
    fields: [competitions.seasonId],
    references: [seasons.id],
  }),
  fixtures: many(fixtures),
}));

export const fixturesRelations = relations(fixtures, ({ one, many }) => ({
  team: one(teams, {
    fields: [fixtures.teamId],
    references: [teams.id],
  }),
  competition: one(competitions, {
    fields: [fixtures.competitionId],
    references: [competitions.id],
  }),
  lineups: many(lineups),
  matchEvents: many(matchEvents),
  availability: many(availability),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  team: one(teams, {
    fields: [players.teamId],
    references: [teams.id],
  }),
  availability: many(availability),
  attendance: many(attendance),
  developmentNotes: many(developmentNotes),
  fitnessTests: many(fitnessTests),
  matchEvents: many(matchEvents),
}));

export const availabilityRelations = relations(availability, ({ one }) => ({
  player: one(players, {
    fields: [availability.playerId],
    references: [players.id],
  }),
  fixture: one(fixtures, {
    fields: [availability.fixtureId],
    references: [fixtures.id],
  }),
  trainingSession: one(trainingSessions, {
    fields: [availability.trainingSessionId],
    references: [trainingSessions.id],
  }),
}));

export const trainingSessionsRelations = relations(trainingSessions, ({ one, many }) => ({
  team: one(teams, {
    fields: [trainingSessions.teamId],
    references: [teams.id],
  }),
  attendance: many(attendance),
  availability: many(availability),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  player: one(players, {
    fields: [attendance.playerId],
    references: [players.id],
  }),
  session: one(trainingSessions, {
    fields: [attendance.sessionId],
    references: [trainingSessions.id],
  }),
}));

export const lineupsRelations = relations(lineups, ({ one }) => ({
  fixture: one(fixtures, {
    fields: [lineups.fixtureId],
    references: [fixtures.id],
  }),
}));

export const matchEventsRelations = relations(matchEvents, ({ one }) => ({
  fixture: one(fixtures, {
    fields: [matchEvents.fixtureId],
    references: [fixtures.id],
  }),
  player: one(players, {
    fields: [matchEvents.playerId],
    references: [players.id],
  }),
}));

export const developmentNotesRelations = relations(developmentNotes, ({ one }) => ({
  player: one(players, {
    fields: [developmentNotes.playerId],
    references: [players.id],
  }),
  createdByUser: one(user, {
    fields: [developmentNotes.createdBy],
    references: [user.id],
  }),
}));

export const fitnessTestsRelations = relations(fitnessTests, ({ one }) => ({
  player: one(players, {
    fields: [fitnessTests.playerId],
    references: [players.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(user, {
    fields: [userRoles.userId],
    references: [user.id],
  }),
  team: one(teams, {
    fields: [userRoles.teamId],
    references: [teams.id],
  }),
}));
