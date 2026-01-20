import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerLineupRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/lineups - Get all lineup versions for a fixture
  app.fastify.get(
    '/api/lineups',
    async (
      request: FastifyRequest<{ Querystring: { fixtureId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { fixtureId } = request.query;
      app.logger.info({ userId: session.user.id, fixtureId }, 'Fetching lineups');

      try {
        const lineups = await app.db.query.lineups.findMany({
          where: eq(schema.lineups.fixtureId, fixtureId),
        });

        app.logger.info({ fixtureId, lineupCount: lineups.length }, 'Lineups fetched');
        return lineups;
      } catch (error) {
        app.logger.error({ err: error, fixtureId }, 'Failed to fetch lineups');
        throw error;
      }
    }
  );

  // POST /api/lineups - Create a lineup
  app.fastify.post(
    '/api/lineups',
    async (
      request: FastifyRequest<{
        Body: {
          fixtureId: string;
          name: string;
          starting15: Array<{ playerId: string; position: string }>;
          subs: Array<{ playerId: string; order: number }>;
          minutesTargets?: Record<string, number>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { fixtureId, name, starting15, subs, minutesTargets } = request.body;
      app.logger.info(
        { userId: session.user.id, fixtureId, name },
        'Creating lineup'
      );

      try {
        const [lineup] = await app.db
          .insert(schema.lineups)
          .values({
            fixtureId,
            name,
            starting15: starting15 as any,
            subs: subs as any,
            minutesTargets: minutesTargets as any,
          })
          .returning();

        app.logger.info({ lineupId: lineup.id, name }, 'Lineup created successfully');
        return lineup;
      } catch (error) {
        app.logger.error({ err: error, fixtureId, name }, 'Failed to create lineup');
        throw error;
      }
    }
  );

  // PUT /api/lineups/:id - Update a lineup
  app.fastify.put(
    '/api/lineups/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          name?: string;
          starting15?: Array<{ playerId: string; position: string }>;
          subs?: Array<{ playerId: string; order: number }>;
          minutesTargets?: Record<string, number>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { name, starting15, subs, minutesTargets } = request.body;

      app.logger.info({ userId: session.user.id, lineupId: id }, 'Updating lineup');

      try {
        const updateData: any = {};
        if (name) updateData.name = name;
        if (starting15) updateData.starting15 = starting15;
        if (subs) updateData.subs = subs;
        if (minutesTargets) updateData.minutesTargets = minutesTargets;

        const [updated] = await app.db
          .update(schema.lineups)
          .set(updateData)
          .where(eq(schema.lineups.id, id))
          .returning();

        app.logger.info({ lineupId: id }, 'Lineup updated successfully');
        return updated;
      } catch (error) {
        app.logger.error({ err: error, lineupId: id }, 'Failed to update lineup');
        throw error;
      }
    }
  );

  // DELETE /api/lineups/:id - Delete a lineup
  app.fastify.delete(
    '/api/lineups/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, lineupId: id }, 'Deleting lineup');

      try {
        await app.db.delete(schema.lineups).where(eq(schema.lineups.id, id));

        app.logger.info({ lineupId: id }, 'Lineup deleted successfully');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, lineupId: id }, 'Failed to delete lineup');
        throw error;
      }
    }
  );
}
