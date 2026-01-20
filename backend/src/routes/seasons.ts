import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerSeasonRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/seasons - Get seasons for a club
  app.fastify.get(
    '/api/seasons',
    async (
      request: FastifyRequest<{ Querystring: { clubId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { clubId } = request.query;
      app.logger.info({ userId: session.user.id, clubId }, 'Fetching seasons');

      try {
        const seasons = await app.db.query.seasons.findMany({
          where: eq(schema.seasons.clubId, clubId),
        });

        app.logger.info({ clubId, seasonCount: seasons.length }, 'Seasons fetched');
        return seasons;
      } catch (error) {
        app.logger.error({ err: error, clubId }, 'Failed to fetch seasons');
        throw error;
      }
    }
  );

  // POST /api/seasons - Create a season
  app.fastify.post(
    '/api/seasons',
    async (
      request: FastifyRequest<{
        Body: {
          clubId: string;
          name: string;
          startDate: string;
          endDate: string;
          isActive?: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { clubId, name, startDate, endDate, isActive } = request.body;
      app.logger.info(
        { userId: session.user.id, clubId, name, startDate, endDate },
        'Creating season'
      );

      try {
        const [season] = await app.db
          .insert(schema.seasons)
          .values({
            clubId,
            name,
            startDate,
            endDate,
            isActive: isActive ?? false,
          })
          .returning();

        app.logger.info({ seasonId: season.id, name }, 'Season created successfully');
        return season;
      } catch (error) {
        app.logger.error({ err: error, clubId, name }, 'Failed to create season');
        throw error;
      }
    }
  );
}
