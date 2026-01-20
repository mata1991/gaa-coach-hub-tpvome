import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';

// Import route registration functions
import { registerClubRoutes } from './routes/clubs.js';
import { registerTeamRoutes } from './routes/teams.js';
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

// Combine schemas for full database type support
const schema = { ...appSchema, ...authSchema };

// Create application with combined schema
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication with Better Auth
app.withAuth();

// Register all route modules
registerClubRoutes(app);
registerTeamRoutes(app);
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

await app.run();
app.logger.info('GAA Coach Hub API running');
