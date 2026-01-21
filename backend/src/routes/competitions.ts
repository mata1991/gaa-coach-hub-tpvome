import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerCompetitionRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/competitions - Get competitions for a season
  app.fastify.get(
    '/api/competitions',
    async (
      request: FastifyRequest<{ Querystring: { seasonId?: string; teamId?: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      let { seasonId, teamId } = request.query;

      // If teamId is provided, fetch the team to get its club, then get the active season for that club
      if (teamId && !seasonId) {
        app.logger.info({ userId: session.user.id, teamId }, 'Fetching team to get active season');

        try {
          const team = await app.db.query.teams.findFirst({
            where: eq(schema.teams.id, teamId),
          });

          if (!team) {
            app.logger.warn({ teamId }, 'Team not found');
            return reply.status(404).send({ error: 'Team not found' });
          }

          // Get the active season for this team's club
          const activeSeason = await app.db.query.seasons.findFirst({
            where: eq(schema.seasons.clubId, team.clubId),
          });

          // If club has no active season, return empty array
          if (!activeSeason) {
            app.logger.info({ teamId, clubId: team.clubId }, 'No active season found for club, returning empty competitions');
            return [];
          }

          seasonId = activeSeason.id;
        } catch (error) {
          app.logger.error({ err: error, teamId }, 'Failed to fetch team or season');
          throw error;
        }
      }

      if (!seasonId) {
        app.logger.warn({ userId: session.user.id }, 'No seasonId provided');
        return reply.status(400).send({ error: 'Either seasonId or teamId must be provided' });
      }

      app.logger.info({ userId: session.user.id, seasonId }, 'Fetching competitions');

      try {
        const competitions = await app.db.query.competitions.findMany({
          where: eq(schema.competitions.seasonId, seasonId),
        });

        app.logger.info({ seasonId, competitionCount: competitions.length }, 'Competitions fetched');
        return competitions;
      } catch (error) {
        app.logger.error({ err: error, seasonId }, 'Failed to fetch competitions');
        throw error;
      }
    }
  );

  // POST /api/competitions - Create a competition
  app.fastify.post(
    '/api/competitions',
    async (
      request: FastifyRequest<{
        Body: {
          seasonId: string;
          name: string;
          type: 'League' | 'Championship' | 'Shield';
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { seasonId, name, type } = request.body;
      app.logger.info(
        { userId: session.user.id, seasonId, name, type },
        'Creating competition'
      );

      try {
        const [competition] = await app.db
          .insert(schema.competitions)
          .values({
            seasonId,
            name,
            type,
          })
          .returning();

        app.logger.info({ competitionId: competition.id, name }, 'Competition created successfully');
        return competition;
      } catch (error) {
        app.logger.error({ err: error, seasonId, name }, 'Failed to create competition');
        throw error;
      }
    }
  );
}
