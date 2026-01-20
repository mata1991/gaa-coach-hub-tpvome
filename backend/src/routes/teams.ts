import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerTeamRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/teams - Get teams for a club
  app.fastify.get(
    '/api/teams',
    async (
      request: FastifyRequest<{ Querystring: { clubId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { clubId } = request.query;
      app.logger.info({ userId: session.user.id, clubId }, 'Fetching teams');

      try {
        const teams = await app.db.query.teams.findMany({
          where: eq(schema.teams.clubId, clubId),
        });

        app.logger.info({ clubId, teamCount: teams.length }, 'Teams fetched');
        return teams;
      } catch (error) {
        app.logger.error({ err: error, clubId }, 'Failed to fetch teams');
        throw error;
      }
    }
  );

  // POST /api/teams - Create a team
  app.fastify.post(
    '/api/teams',
    async (
      request: FastifyRequest<{
        Body: { clubId: string; name: string; ageGrade?: string; level?: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { clubId, name, ageGrade, level } = request.body;
      app.logger.info({ userId: session.user.id, clubId, name }, 'Creating team');

      try {
        const [team] = await app.db
          .insert(schema.teams)
          .values({
            clubId,
            name,
            ageGrade,
            level,
          })
          .returning();

        app.logger.info({ teamId: team.id, name }, 'Team created successfully');
        return team;
      } catch (error) {
        app.logger.error({ err: error, clubId, name }, 'Failed to create team');
        throw error;
      }
    }
  );

  // GET /api/teams/:id - Get team details with players
  app.fastify.get(
    '/api/teams/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, teamId: id }, 'Fetching team details');

      try {
        const team = await app.db.query.teams.findFirst({
          where: eq(schema.teams.id, id),
          with: {
            players: true,
            fixtures: true,
          },
        });

        if (!team) {
          app.logger.warn({ teamId: id }, 'Team not found');
          return reply.status(404).send({ error: 'Team not found' });
        }

        app.logger.info({ teamId: id, playerCount: team.players.length }, 'Team details fetched');
        return team;
      } catch (error) {
        app.logger.error({ err: error, teamId: id }, 'Failed to fetch team');
        throw error;
      }
    }
  );
}
