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
      request: FastifyRequest<{ Querystring: { seasonId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { seasonId } = request.query;
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
