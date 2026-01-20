import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerClubRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/clubs - Get clubs accessible to user
  app.fastify.get('/api/clubs', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching clubs');

    const userClubs = await app.db
      .select({
        club: schema.clubs,
      })
      .from(schema.userRoles)
      .innerJoin(schema.clubs, eq(schema.userRoles.teamId, schema.teams.id))
      .innerJoin(schema.teams, eq(schema.teams.clubId, schema.clubs.id))
      .where(eq(schema.userRoles.userId, session.user.id));

    // Get unique clubs
    const uniqueClubs = Array.from(
      new Map(userClubs.map((item) => [item.club.id, item.club])).values()
    );

    app.logger.info({ userId: session.user.id, clubCount: uniqueClubs.length }, 'Clubs fetched');
    return uniqueClubs;
  });

  // POST /api/clubs - Create a club
  app.fastify.post(
    '/api/clubs',
    async (request: FastifyRequest<{ Body: { name: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { name } = request.body;

      app.logger.info({ userId: session.user.id, name }, 'Creating club');

      try {
        const [club] = await app.db
          .insert(schema.clubs)
          .values({
            name,
            createdBy: session.user.id,
          })
          .returning();

        app.logger.info({ clubId: club.id, name }, 'Club created successfully');
        return club;
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, name }, 'Failed to create club');
        throw error;
      }
    }
  );

  // GET /api/clubs/:id - Get club details
  app.fastify.get(
    '/api/clubs/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, clubId: id }, 'Fetching club details');

      try {
        const club = await app.db.query.clubs.findFirst({
          where: eq(schema.clubs.id, id),
          with: {
            teams: true,
            seasons: true,
          },
        });

        if (!club) {
          app.logger.warn({ clubId: id }, 'Club not found');
          return reply.status(404).send({ error: 'Club not found' });
        }

        app.logger.info({ clubId: id }, 'Club details fetched');
        return club;
      } catch (error) {
        app.logger.error({ err: error, clubId: id }, 'Failed to fetch club');
        throw error;
      }
    }
  );
}
