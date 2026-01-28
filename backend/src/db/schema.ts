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

export const clubRoleEnum = pgEnum('club_role', ['CLUB_ADMIN', 'COACH', 'STATS_PERSON', 'PLAYER']);
export const teamRoleEnum = pgEnum('team_role', ['COACH', 'STATS_PERSON', 'PLAYER']);
export const roleEnum = pgEnum('role', ['club_admin', 'coach', 'stats_person', 'player']);
export const fixtureStatusEnum = pgEnum('fixture_status', ['scheduled', 'in_progress', 'completed']);
export const competitionTypeEnum = pgEnum('competition_type', ['League', 'Championship', 'Shield']);
export const playerAvailabilityEnum = pgEnum('player_availability', ['available', 'unavailable', 'maybe']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'late', 'absent']);
export const trainingAttendanceStatusEnum = pgEnum('training_attendance_status', ['TRAINED', 'INJURED', 'EXCUSED', 'NO_CONTACT']);
export const dominantSideEnum = pgEnum('dominant_side', ['left', 'right']);
export const primaryPositionGroupEnum = pgEnum('primary_position_group', ['GK', 'BACK', 'MID', 'FWD']);
export const eventCategoryEnum = pgEnum('event_category', [
  'Scoring',
  'Puckouts',
  'Possession',
  'Discipline',
  'Substitutions',
]);
export const teamSideEnum = pgEnum('team_side', ['HOME', 'AWAY']);
export const matchStatusEnum = pgEnum('match_status', [
  'NOT_STARTED',
  'IN_PROGRESS',
  'PAUSED',
  'COMPLETED',
]);

// ============================================================================
// CLUBS
// ============================================================================

export const clubs = pgTable('clubs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  county: text('county'),
  colours: text('colours'),
  crestUrl: text('crest_url'),
  primaryColor: text('primary_color'),
  secondaryColor: text('secondary_color'),
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
  shortName: text('short_name'),
  sport: text('sport'),
  grade: text('grade'),
  ageGroup: text('age_group'),
  homeVenue: text('home_venue'),
  crestUrl: text('crest_url'),
  crestImageUrl: text('crest_image_url'),
  jerseyImageUrl: text('jersey_image_url'),
  colours: text('colours'),
  ageGrade: text('age_grade'),
  level: text('level'),
  isArchived: boolean('is_archived').default(false).notNull(),
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
    .references(() => competitions.id, { onDelete: 'set null' }),
  opponent: text('opponent').notNull(),
  venue: text('venue'),
  date: timestamp('date').notNull(),
  status: fixtureStatusEnum('status').default('scheduled').notNull(),
  homeTeamName: text('home_team_name'),
  homeCrestUrl: text('home_crest_url'),
  homeCrestImageUrl: text('home_crest_image_url'),
  homeColours: text('home_colours'),
  homeJerseyImageUrl: text('home_jersey_image_url'),
  awayTeamName: text('away_team_name'),
  awayCrestUrl: text('away_crest_url'),
  awayCrestImageUrl: text('away_crest_image_url'),
  awayColours: text('away_colours'),
  awayJerseyImageUrl: text('away_jersey_image_url'),
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
  primaryPositionGroup: primaryPositionGroupEnum('primary_position_group'),
  depthOrder: integer('depth_order').default(0).notNull(),
  notes: text('notes'),
  injuryStatus: text('injury_status'),
  isInjured: boolean('is_injured').default(false).notNull(),
  injuryNote: text('injury_note'),
  injuryUpdatedAt: timestamp('injury_updated_at'),
  injuredAt: timestamp('injured_at'),
  clearedAt: timestamp('cleared_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('players_team_id_idx').on(table.teamId),
  index('players_position_group_depth_idx').on(table.primaryPositionGroup, table.depthOrder),
  index('players_is_injured_idx').on(table.isInjured),
  index('players_injured_at_idx').on(table.injuredAt),
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
  location: text('location'),
  focus: text('focus'),
  drills: text('drills'),
  notes: text('notes'),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('training_sessions_team_id_idx').on(table.teamId),
  index('training_sessions_date_idx').on(table.date),
  index('training_sessions_created_by_idx').on(table.createdBy),
]);

// ============================================================================
// TRAINING ATTENDANCE
// ============================================================================

export const trainingAttendance = pgTable('training_attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => trainingSessions.id, { onDelete: 'cascade' }),
  playerId: uuid('player_id')
    .notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  status: trainingAttendanceStatusEnum('status').default('NO_CONTACT').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('training_attendance_session_id_idx').on(table.sessionId),
  index('training_attendance_player_id_idx').on(table.playerId),
  uniqueIndex('training_attendance_session_player_unique_idx').on(table.sessionId, table.playerId),
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
  side: teamSideEnum('side'),
  timestamp: integer('timestamp').notNull(), // Match clock in seconds
  eventType: text('event_type').notNull(),
  eventCategory: eventCategoryEnum('event_category').notNull(),
  half: text('half'), // 'H1' or 'H2'
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
// MATCH SQUADS
// ============================================================================

export const matchSquads = pgTable('match_squads', {
  id: uuid('id').primaryKey().defaultRandom(),
  fixtureId: uuid('fixture_id')
    .notNull()
    .references(() => fixtures.id, { onDelete: 'cascade' }),
  side: teamSideEnum('side').notNull(),
  startingSlots: jsonb('starting_slots').notNull(), // Array of 15 LineupSlot objects
  bench: jsonb('bench').notNull(), // Array of 15 LineupSlot objects
  subsLog: jsonb('subs_log').default([]), // Array of SubEvent objects
  locked: boolean('locked').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index('match_squads_fixture_id_idx').on(table.fixtureId),
  uniqueIndex('match_squads_fixture_side_unique_idx').on(table.fixtureId, table.side),
]);

// ============================================================================
// MATCH STATE
// ============================================================================

export const matchState = pgTable('match_state', {
  id: uuid('id').primaryKey().defaultRandom(),
  fixtureId: uuid('fixture_id')
    .notNull()
    .unique()
    .references(() => fixtures.id, { onDelete: 'cascade' }),
  status: matchStatusEnum('status').default('NOT_STARTED').notNull(),
  homeGoals: integer('home_goals').default(0).notNull(),
  homePoints: integer('home_points').default(0).notNull(),
  awayGoals: integer('away_goals').default(0).notNull(),
  awayPoints: integer('away_points').default(0).notNull(),
  matchClock: integer('match_clock').default(0).notNull(), // in seconds
  half: text('half').default('H1').notNull(), // 'H1' or 'H2'
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index('match_state_fixture_id_idx').on(table.fixtureId),
]);

// ============================================================================
// MEMBERSHIPS (Club-level permissions)
// ============================================================================

export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id')
    .notNull()
    .references(() => clubs.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  role: clubRoleEnum('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('memberships_club_id_idx').on(table.clubId),
  index('memberships_user_id_idx').on(table.userId),
  uniqueIndex('memberships_club_user_unique_idx').on(table.clubId, table.userId),
]);

// ============================================================================
// TEAM MEMBERSHIPS (Team-level permissions)
// ============================================================================

export const teamMemberships = pgTable('team_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  role: teamRoleEnum('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('team_memberships_team_id_idx').on(table.teamId),
  index('team_memberships_user_id_idx').on(table.userId),
  uniqueIndex('team_memberships_team_user_unique_idx').on(table.teamId, table.userId),
]);

// ============================================================================
// USER ROLES (Team-based permissions - legacy)
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
  memberships: many(memberships),
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
  teamMemberships: many(teamMemberships),
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
  matchSquads: many(matchSquads),
  matchState: one(matchState, {
    fields: [fixtures.id],
    references: [matchState.fixtureId],
  }),
  availability: many(availability),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  team: one(teams, {
    fields: [players.teamId],
    references: [teams.id],
  }),
  availability: many(availability),
  trainingAttendance: many(trainingAttendance),
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
  trainingAttendance: many(trainingAttendance),
  availability: many(availability),
}));

export const trainingAttendanceRelations = relations(trainingAttendance, ({ one }) => ({
  player: one(players, {
    fields: [trainingAttendance.playerId],
    references: [players.id],
  }),
  session: one(trainingSessions, {
    fields: [trainingAttendance.sessionId],
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

export const matchSquadsRelations = relations(matchSquads, ({ one }) => ({
  fixture: one(fixtures, {
    fields: [matchSquads.fixtureId],
    references: [fixtures.id],
  }),
}));

export const matchStateRelations = relations(matchState, ({ one }) => ({
  fixture: one(fixtures, {
    fields: [matchState.fixtureId],
    references: [fixtures.id],
  }),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  club: one(clubs, {
    fields: [memberships.clubId],
    references: [clubs.id],
  }),
  user: one(user, {
    fields: [memberships.userId],
    references: [user.id],
  }),
}));

export const teamMembershipsRelations = relations(teamMemberships, ({ one }) => ({
  team: one(teams, {
    fields: [teamMemberships.teamId],
    references: [teams.id],
  }),
  user: one(user, {
    fields: [teamMemberships.userId],
    references: [user.id],
  }),
}));
