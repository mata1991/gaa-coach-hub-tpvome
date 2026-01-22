import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerMatchEventRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/fixtures/:fixtureId/events - Get all events for a fixture
  app.fastify.get(
    '/api/fixtures/:fixtureId/events',
    async (
      request: FastifyRequest<{ Params: { fixtureId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { fixtureId } = request.params;
      app.logger.info({ userId: session.user.id, fixtureId }, 'Fetching match events');

      try {
        const events = await app.db.query.matchEvents.findMany({
          where: eq(schema.matchEvents.fixtureId, fixtureId),
          orderBy: (events, { asc }) => [asc(events.timestamp)],
        });

        app.logger.info({ fixtureId, eventCount: events.length }, 'Match events fetched');
        return events;
      } catch (error) {
        app.logger.error({ err: error, fixtureId }, 'Failed to fetch match events');
        throw error;
      }
    }
  );

  // POST /api/fixtures/:fixtureId/events - Create a match event
  app.fastify.post(
    '/api/fixtures/:fixtureId/events',
    async (
      request: FastifyRequest<{
        Params: { fixtureId: string };
        Body: {
          playerId?: string;
          side?: 'HOME' | 'AWAY';
          timestamp: number;
          eventType: string;
          eventCategory: 'Scoring' | 'Puckouts' | 'Possession' | 'Discipline' | 'Substitutions';
          half?: 'H1' | 'H2';
          outcome?: string;
          zone?: string;
          notes?: string;
          clientId?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { fixtureId } = request.params;
      const { playerId, side, timestamp, eventType, eventCategory, half, outcome, zone, notes, clientId } =
        request.body;

      app.logger.info(
        { userId: session.user.id, fixtureId, eventType, timestamp },
        'Creating match event'
      );

      try {
        // Check for duplicate if clientId provided
        if (clientId) {
          const existing = await app.db.query.matchEvents.findFirst({
            where: and(
              eq(schema.matchEvents.fixtureId, fixtureId),
              eq(schema.matchEvents.clientId, clientId)
            ),
          });

          if (existing) {
            app.logger.warn({ fixtureId, clientId }, 'Duplicate event detected');
            return existing;
          }
        }

        const [created] = await app.db
          .insert(schema.matchEvents)
          .values({
            fixtureId,
            playerId,
            side,
            timestamp,
            eventType,
            eventCategory,
            half,
            outcome,
            zone,
            notes,
            clientId,
            synced: true,
          })
          .returning();

        app.logger.info({ fixtureId, eventId: created.id, eventType }, 'Match event created successfully');
        return created;
      } catch (error) {
        app.logger.error({ err: error, fixtureId, eventType }, 'Failed to create match event');
        throw error;
      }
    }
  );

  // POST /api/match-events/batch - Batch create events with offline sync
  app.fastify.post(
    '/api/match-events/batch',
    async (
      request: FastifyRequest<{
        Body: {
          fixtureId: string;
          events: Array<{
            playerId?: string;
            side?: 'HOME' | 'AWAY';
            timestamp: number;
            eventType: string;
            eventCategory:
              | 'Scoring'
              | 'Puckouts'
              | 'Possession'
              | 'Discipline'
              | 'Substitutions';
            half?: 'H1' | 'H2';
            outcome?: string;
            zone?: string;
            notes?: string;
            clientId?: string;
          }>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { fixtureId, events } = request.body;
      app.logger.info(
        { userId: session.user.id, fixtureId, eventCount: events.length },
        'Batch creating match events'
      );

      try {
        let synced = 0;
        let duplicates = 0;
        let failed = 0;

        for (const event of events) {
          try {
            // Check for duplicate using clientId
            if (event.clientId) {
              const existing = await app.db.query.matchEvents.findFirst({
                where: and(
                  eq(schema.matchEvents.fixtureId, fixtureId),
                  eq(schema.matchEvents.clientId, event.clientId)
                ),
              });

              if (existing) {
                duplicates++;
                continue;
              }
            }

            await app.db.insert(schema.matchEvents).values({
              fixtureId,
              playerId: event.playerId,
              side: event.side,
              timestamp: event.timestamp,
              eventType: event.eventType,
              eventCategory: event.eventCategory,
              half: event.half,
              outcome: event.outcome,
              zone: event.zone,
              notes: event.notes,
              clientId: event.clientId,
              synced: true,
            });

            synced++;
          } catch (error) {
            app.logger.error(
              { err: error, fixtureId, eventType: event.eventType },
              'Failed to create individual match event'
            );
            failed++;
          }
        }

        app.logger.info(
          { fixtureId, synced, duplicates, failed },
          'Batch match events processed'
        );
        return { synced, duplicates, failed };
      } catch (error) {
        app.logger.error(
          { err: error, fixtureId, eventCount: events.length },
          'Failed to batch create match events'
        );
        throw error;
      }
    }
  );

  // PUT /api/match-events/:id - Update a match event
  app.fastify.put(
    '/api/match-events/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          playerId?: string;
          timestamp?: number;
          eventType?: string;
          half?: 'H1' | 'H2';
          outcome?: string;
          zone?: string;
          notes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { playerId, timestamp, eventType, half, outcome, zone, notes } = request.body;

      app.logger.info({ userId: session.user.id, matchEventId: id }, 'Updating match event');

      try {
        const updateData: any = {};
        if (playerId !== undefined) updateData.playerId = playerId;
        if (timestamp !== undefined) updateData.timestamp = timestamp;
        if (eventType) updateData.eventType = eventType;
        if (half) updateData.half = half;
        if (outcome !== undefined) updateData.outcome = outcome;
        if (zone !== undefined) updateData.zone = zone;
        if (notes !== undefined) updateData.notes = notes;

        const [updated] = await app.db
          .update(schema.matchEvents)
          .set(updateData)
          .where(eq(schema.matchEvents.id, id))
          .returning();

        app.logger.info({ matchEventId: id }, 'Match event updated successfully');
        return updated;
      } catch (error) {
        app.logger.error({ err: error, matchEventId: id }, 'Failed to update match event');
        throw error;
      }
    }
  );

  // DELETE /api/match-events/:id - Delete a match event
  app.fastify.delete(
    '/api/match-events/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, matchEventId: id }, 'Deleting match event');

      try {
        await app.db.delete(schema.matchEvents).where(eq(schema.matchEvents.id, id));

        app.logger.info({ matchEventId: id }, 'Match event deleted successfully');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, matchEventId: id }, 'Failed to delete match event');
        throw error;
      }
    }
  );
}
