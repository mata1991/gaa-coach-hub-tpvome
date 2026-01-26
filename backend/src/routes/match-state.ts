import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: any): boolean {
  if (typeof value !== 'string' || !value) return false;
  return UUID_REGEX.test(value);
}

export function registerMatchStateRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/fixtures/:fixtureId/match-state - Get match state
  app.fastify.get(
    '/api/fixtures/:fixtureId/match-state',
    async (request: FastifyRequest<{ Params: { fixtureId: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { fixtureId } = request.params;

      // Validate fixtureId is a valid UUID
      if (!isValidUUID(fixtureId)) {
        app.logger.warn({ userId: session.user.id, fixtureId }, 'Invalid fixtureId format');
        return reply.status(400).send({
          error: 'Invalid fixtureId',
          message: 'fixtureId must be a valid UUID',
        });
      }

      app.logger.info({ userId: session.user.id, fixtureId }, 'Fetching match state');

      try {
        const matchState = await app.db.query.matchState.findFirst({
          where: eq(schema.matchState.fixtureId, fixtureId),
        });

        // Return default match state if doesn't exist
        if (!matchState) {
          app.logger.info({ fixtureId }, 'Match state not found, returning default');
          return {
            id: null,
            fixtureId,
            status: 'NOT_STARTED',
            homeGoals: 0,
            homePoints: 0,
            awayGoals: 0,
            awayPoints: 0,
            matchClock: 0,
            half: 'H1',
            startedAt: null,
            completedAt: null,
          };
        }

        app.logger.info({ fixtureId, status: matchState.status }, 'Match state fetched');
        return matchState;
      } catch (error) {
        app.logger.error({ err: error, fixtureId }, 'Failed to fetch match state');
        throw error;
      }
    }
  );

  // POST /api/fixtures/:fixtureId/match-state/start - Start match
  app.fastify.post(
    '/api/fixtures/:fixtureId/match-state/start',
    async (request: FastifyRequest<{ Params: { fixtureId: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { fixtureId } = request.params;

      // Validate fixtureId is a valid UUID
      if (!isValidUUID(fixtureId)) {
        app.logger.warn({ userId: session.user.id, fixtureId }, 'Invalid fixtureId format');
        return reply.status(400).send({
          error: 'Invalid fixtureId',
          message: 'fixtureId must be a valid UUID',
        });
      }

      app.logger.info({ userId: session.user.id, fixtureId }, 'Starting match');

      try {
        // Verify fixture exists
        const fixture = await app.db.query.fixtures.findFirst({
          where: eq(schema.fixtures.id, fixtureId),
        });

        if (!fixture) {
          app.logger.warn({ fixtureId }, 'Fixture not found');
          return reply.status(404).send({ error: 'Fixture not found' });
        }

        // Verify both squads exist and have 15 starting players
        const squads = await app.db.query.matchSquads.findMany({
          where: eq(schema.matchSquads.fixtureId, fixtureId),
        });

        if (squads.length < 2) {
          app.logger.warn({ fixtureId }, 'Both squads required to start match');
          return reply
            .status(400)
            .send({ error: 'Both HOME and AWAY squads must be created before starting match' });
        }

        const homeSquad = squads.find((s) => s.side === 'HOME');
        const awaySquad = squads.find((s) => s.side === 'AWAY');

        if (!homeSquad || !awaySquad) {
          app.logger.warn({ fixtureId }, 'Missing HOME or AWAY squad');
          return reply.status(400).send({ error: 'Both HOME and AWAY squads required' });
        }

        // Check if squads have starting players (allow warning but permit override)
        const homeStarting = (homeSquad.startingSlots as any[]) || [];
        const awayStarting = (awaySquad.startingSlots as any[]) || [];

        if (homeStarting.length < 15 || awayStarting.length < 15) {
          app.logger.warn({ fixtureId }, 'Squads incomplete but proceeding');
          // Note: In production, could return warning but allow override
        }

        // Lock both squads
        await app.db
          .update(schema.matchSquads)
          .set({ locked: true })
          .where(eq(schema.matchSquads.fixtureId, fixtureId));

        // Get or create match state and start it
        let matchState = await app.db.query.matchState.findFirst({
          where: eq(schema.matchState.fixtureId, fixtureId),
        });

        if (!matchState) {
          [matchState] = await app.db
            .insert(schema.matchState)
            .values({
              fixtureId,
            })
            .returning();
        }

        const [updated] = await app.db
          .update(schema.matchState)
          .set({
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            matchClock: 0,
            half: 'H1',
          })
          .where(eq(schema.matchState.id, matchState.id))
          .returning();

        app.logger.info({ fixtureId, status: updated.status }, 'Match started successfully');
        return updated;
      } catch (error) {
        app.logger.error({ err: error, fixtureId }, 'Failed to start match');
        throw error;
      }
    }
  );

  // PUT /api/fixtures/:fixtureId/match-state - Update match state
  app.fastify.put(
    '/api/fixtures/:fixtureId/match-state',
    async (
      request: FastifyRequest<{
        Params: { fixtureId: string };
        Body: {
          status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
          homeGoals?: number;
          homePoints?: number;
          awayGoals?: number;
          awayPoints?: number;
          matchClock?: number;
          half?: 'H1' | 'H2';
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { fixtureId } = request.params;

      // Validate fixtureId is a valid UUID
      if (!isValidUUID(fixtureId)) {
        app.logger.warn({ userId: session.user.id, fixtureId }, 'Invalid fixtureId format');
        return reply.status(400).send({
          error: 'Invalid fixtureId',
          message: 'fixtureId must be a valid UUID',
        });
      }

      const { status, homeGoals, homePoints, awayGoals, awayPoints, matchClock, half } =
        request.body;

      app.logger.info(
        { userId: session.user.id, fixtureId, status, homeGoals, awayGoals, half },
        'Updating match state'
      );

      try {
        let matchState = await app.db.query.matchState.findFirst({
          where: eq(schema.matchState.fixtureId, fixtureId),
        });

        if (!matchState) {
          app.logger.warn({ fixtureId }, 'Match state not found');
          return reply.status(404).send({ error: 'Match state not found' });
        }

        const updateData: any = {};
        if (status) updateData.status = status;
        if (homeGoals !== undefined) updateData.homeGoals = homeGoals;
        if (homePoints !== undefined) updateData.homePoints = homePoints;
        if (awayGoals !== undefined) updateData.awayGoals = awayGoals;
        if (awayPoints !== undefined) updateData.awayPoints = awayPoints;
        if (matchClock !== undefined) updateData.matchClock = matchClock;
        if (half) updateData.half = half;

        const [updated] = await app.db
          .update(schema.matchState)
          .set(updateData)
          .where(eq(schema.matchState.id, matchState.id))
          .returning();

        app.logger.info(
          { fixtureId, status: updated.status, homeGoals: updated.homeGoals },
          'Match state updated'
        );
        return updated;
      } catch (error) {
        app.logger.error({ err: error, fixtureId }, 'Failed to update match state');
        throw error;
      }
    }
  );

  // POST /api/fixtures/:fixtureId/match-state/complete - Complete match
  app.fastify.post(
    '/api/fixtures/:fixtureId/match-state/complete',
    async (request: FastifyRequest<{ Params: { fixtureId: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { fixtureId } = request.params;

      // Validate fixtureId is a valid UUID
      if (!isValidUUID(fixtureId)) {
        app.logger.warn({ userId: session.user.id, fixtureId }, 'Invalid fixtureId format');
        return reply.status(400).send({
          error: 'Invalid fixtureId',
          message: 'fixtureId must be a valid UUID',
        });
      }

      app.logger.info({ userId: session.user.id, fixtureId }, 'Completing match');

      try {
        let matchState = await app.db.query.matchState.findFirst({
          where: eq(schema.matchState.fixtureId, fixtureId),
        });

        if (!matchState) {
          app.logger.warn({ fixtureId }, 'Match state not found');
          return reply.status(404).send({ error: 'Match state not found' });
        }

        const [updated] = await app.db
          .update(schema.matchState)
          .set({
            status: 'COMPLETED',
            completedAt: new Date(),
          })
          .where(eq(schema.matchState.id, matchState.id))
          .returning();

        app.logger.info(
          {
            fixtureId,
            homeScore: `${updated.homeGoals * 3 + updated.homePoints}`,
            awayScore: `${updated.awayGoals * 3 + updated.awayPoints}`,
          },
          'Match completed successfully'
        );
        return updated;
      } catch (error) {
        app.logger.error({ err: error, fixtureId }, 'Failed to complete match');
        throw error;
      }
    }
  );

  // GET /api/fixtures/:fixtureId/match-summary - Get end-of-match summary
  app.fastify.get(
    '/api/fixtures/:fixtureId/match-summary',
    async (request: FastifyRequest<{ Params: { fixtureId: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { fixtureId } = request.params;

      // Validate fixtureId is a valid UUID
      if (!isValidUUID(fixtureId)) {
        app.logger.warn({ userId: session.user.id, fixtureId }, 'Invalid fixtureId format');
        return reply.status(400).send({
          error: 'Invalid fixtureId',
          message: 'fixtureId must be a valid UUID',
        });
      }

      app.logger.info({ userId: session.user.id, fixtureId }, 'Fetching match summary');

      try {
        const fixture = await app.db.query.fixtures.findFirst({
          where: eq(schema.fixtures.id, fixtureId),
          with: {
            team: true,
          },
        });

        if (!fixture) {
          app.logger.warn({ fixtureId }, 'Fixture not found');
          return reply.status(404).send({ error: 'Fixture not found' });
        }

        const matchState = await app.db.query.matchState.findFirst({
          where: eq(schema.matchState.fixtureId, fixtureId),
        });

        const squads = await app.db.query.matchSquads.findMany({
          where: eq(schema.matchSquads.fixtureId, fixtureId),
        });

        const events = await app.db.query.matchEvents.findMany({
          where: eq(schema.matchEvents.fixtureId, fixtureId),
        });

        // Aggregate stats by side
        const homeStats = { goals: 0, points: 0, wides: 0, events: 0 };
        const awayStats = { goals: 0, points: 0, wides: 0, events: 0 };

        events.forEach((event) => {
          const stats = event.side === 'HOME' ? homeStats : event.side === 'AWAY' ? awayStats : null;
          if (stats) {
            if (event.eventCategory === 'Scoring') {
              if (event.eventType === 'Goal') stats.goals++;
              else if (event.eventType === 'Point') stats.points++;
              else if (event.eventType === 'Wide') stats.wides++;
            }
            stats.events++;
          }
        });

        const summary = {
          fixture: {
            id: fixture.id,
            opponent: fixture.opponent,
            date: fixture.date,
            venue: fixture.venue,
          },
          matchState,
          homeSquad: squads.find((s) => s.side === 'HOME'),
          awaySquad: squads.find((s) => s.side === 'AWAY'),
          teamStats: {
            home: homeStats,
            away: awayStats,
          },
          eventCount: events.length,
        };

        app.logger.info({ fixtureId }, 'Match summary fetched');
        return summary;
      } catch (error) {
        app.logger.error({ err: error, fixtureId }, 'Failed to fetch match summary');
        throw error;
      }
    }
  );
}
