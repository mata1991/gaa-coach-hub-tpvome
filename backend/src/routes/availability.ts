import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerAvailabilityRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/availability - Get availability records
  app.fastify.get(
    '/api/availability',
    async (
      request: FastifyRequest<{
        Querystring: { playerId?: string; fixtureId?: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { playerId, fixtureId } = request.query;
      app.logger.info({ userId: session.user.id, playerId, fixtureId }, 'Fetching availability');

      try {
        let conditions = [];
        if (playerId) conditions.push(eq(schema.availability.playerId, playerId));
        if (fixtureId) conditions.push(eq(schema.availability.fixtureId, fixtureId));

        const availabilityRecords = await app.db.query.availability.findMany({
          where: conditions.length > 0 ? and(...conditions) : undefined,
        });

        app.logger.info(
          { playerId, fixtureId, count: availabilityRecords.length },
          'Availability fetched'
        );
        return availabilityRecords;
      } catch (error) {
        app.logger.error({ err: error, playerId, fixtureId }, 'Failed to fetch availability');
        throw error;
      }
    }
  );

  // POST /api/availability - Create availability record
  app.fastify.post(
    '/api/availability',
    async (
      request: FastifyRequest<{
        Body: {
          playerId: string;
          fixtureId?: string;
          trainingSessionId?: string;
          status: 'available' | 'unavailable' | 'maybe';
          notes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { playerId, fixtureId, trainingSessionId, status, notes } = request.body;
      app.logger.info(
        {
          userId: session.user.id,
          playerId,
          fixtureId,
          trainingSessionId,
          status,
        },
        'Creating availability record'
      );

      try {
        const [record] = await app.db
          .insert(schema.availability)
          .values({
            playerId,
            fixtureId,
            trainingSessionId,
            status,
            notes,
          })
          .returning();

        app.logger.info({ recordId: record.id, status }, 'Availability record created');
        return record;
      } catch (error) {
        app.logger.error(
          { err: error, playerId, fixtureId, trainingSessionId },
          'Failed to create availability record'
        );
        throw error;
      }
    }
  );

  // PUT /api/availability/:id - Update availability record
  app.fastify.put(
    '/api/availability/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          status?: 'available' | 'unavailable' | 'maybe';
          notes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { status, notes } = request.body;

      app.logger.info({ userId: session.user.id, availabilityId: id }, 'Updating availability');

      try {
        const updateData: any = {};
        if (status) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;

        const [updated] = await app.db
          .update(schema.availability)
          .set(updateData)
          .where(eq(schema.availability.id, id))
          .returning();

        app.logger.info({ availabilityId: id }, 'Availability updated successfully');
        return updated;
      } catch (error) {
        app.logger.error({ err: error, availabilityId: id }, 'Failed to update availability');
        throw error;
      }
    }
  );
}
