import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';

// Import route registration functions
import { registerClubRoutes } from './routes/clubs.js';
import { registerClubsV2Routes } from './routes/clubs-v2.js';
import { registerTeamRoutes } from './routes/teams.js';
import { registerTeamsV2Routes } from './routes/teams-v2.js';
import { registerSeasonRoutes } from './routes/seasons.js';
import { registerCompetitionRoutes } from './routes/competitions.js';
import { registerFixtureRoutes } from './routes/fixtures.js';
import { registerPlayerRoutes } from './routes/players.js';
import { registerAvailabilityRoutes } from './routes/availability.js';
import { registerTrainingSessionRoutes } from './routes/training-sessions.js';
import { registerAttendanceRoutes } from './routes/attendance.js';
import { registerLineupRoutes } from './routes/lineups.js';
import { registerMatchEventRoutes } from './routes/match-events.js';
import { registerDevelopmentNoteRoutes } from './routes/development-notes.js';
import { registerFitnessTestRoutes } from './routes/fitness-tests.js';
import { registerUserRoleRoutes } from './routes/user-roles.js';
import { registerReportRoutes } from './routes/reports.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerExportRoutes } from './routes/exports.js';
import { registerMatchSquadRoutes } from './routes/match-squads.js';
import { registerMatchStateRoutes } from './routes/match-state.js';
import { registerUploadRoutes } from './routes/uploads.js';
import { registerTrainingReportRoutes } from './routes/training-reports.js';

// Combine schemas for full database type support
const schema = { ...appSchema, ...authSchema };

// Create application with combined schema
export const app = await createApplication(schema);

// Export database instance for use in seed script
export const db = app.db;

// Export App type for use in route files
export type App = typeof app;

// Enable authentication with Better Auth
app.withAuth();

// Enable storage for file uploads
app.withStorage();

// Register all route modules
// Note: V2 routes will override V1 routes for overlapping endpoints
registerClubsV2Routes(app);
registerTeamsV2Routes(app);
registerSeasonRoutes(app);
registerCompetitionRoutes(app);
registerFixtureRoutes(app);
registerPlayerRoutes(app);
registerAvailabilityRoutes(app);
registerTrainingSessionRoutes(app);
registerAttendanceRoutes(app);
registerLineupRoutes(app);
registerMatchEventRoutes(app);
registerDevelopmentNoteRoutes(app);
registerFitnessTestRoutes(app);
registerUserRoleRoutes(app);
registerReportRoutes(app);
registerAnalyticsRoutes(app);
registerExportRoutes(app);
registerMatchSquadRoutes(app);
registerMatchStateRoutes(app);
registerUploadRoutes(app);
registerTrainingReportRoutes(app);

await app.run();
app.logger.info('GAA Coach Hub API running');
