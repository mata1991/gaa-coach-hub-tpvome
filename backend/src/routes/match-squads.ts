import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

interface LineupSlot {
  positionNo: number;
  positionName: string;
  playerId?: string;
  playerName?: string;
  jerseyNo?: string;
}

interface SubEvent {
  time: string;
  matchTime: number;
  playerOffId: string;
  playerOffName: string;
  playerOnId: string;
  playerOnName: string;
}

const DEFAULT_POSITIONS: LineupSlot[] = [
  { positionNo: 1, positionName: 'GK (Goalkeeper)' },
  { positionNo: 2, positionName: 'RCB (R Corner Back)' },
  { positionNo: 3, positionName: 'FB (Full Back)' },
  { positionNo: 4, positionName: 'LCB (L Corner Back)' },
  { positionNo: 5, positionName: 'RHB (R Half Back)' },
  { positionNo: 6, positionName: 'CB (Centre Back)' },
  { positionNo: 7, positionName: 'LHB (L Half Back)' },
  { positionNo: 8, positionName: 'MF (Midfield)' },
  { positionNo: 9, positionName: 'MF (Midfield)' },
  { positionNo: 10, positionName: 'RHF (R Half Forward)' },
  { positionNo: 11, positionName: 'CF (Centre Forward)' },
  { positionNo: 12, positionName: 'LHF (L Half Forward)' },
  { positionNo: 13, positionName: 'RCF (R Corner Forward)' },
  { positionNo: 14, positionName: 'FF (Full Forward)' },
  { positionNo: 15, positionName: 'LCF (L Corner Forward)' },
];

export function registerMatchSquadRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/fixtures/:fixtureId/squads - Get both squads
  app.fastify.get(
    '/api/fixtures/:fixtureId/squads',
    async (request: FastifyRequest<{ Params: { fixtureId: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { fixtureId } = request.params;
      app.logger.info({ userId: session.user.id, fixtureId }, 'Fetching match squads');

      try {
        const squads = await app.db.query.matchSquads.findMany({
          where: eq(schema.matchSquads.fixtureId, fixtureId),
        });

        app.logger.info({ fixtureId, squadCount: squads.length }, 'Match squads fetched');
        return squads;
      } catch (error) {
        app.logger.error({ err: error, fixtureId }, 'Failed to fetch match squads');
        throw error;
      }
    }
  );

  // POST /api/fixtures/:fixtureId/squads - Create or update squad
  app.fastify.post(
    '/api/fixtures/:fixtureId/squads',
    async (
      request: FastifyRequest<{
        Params: { fixtureId: string };
        Body: {
          side: 'HOME' | 'AWAY';
          startingSlots: LineupSlot[];
          bench: LineupSlot[];
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { fixtureId } = request.params;
      const { side, startingSlots, bench } = request.body;

      app.logger.info(
        { userId: session.user.id, fixtureId, side },
        'Creating or updating match squad'
      );

      try {
        // Check if squad exists
        const existing = await app.db.query.matchSquads.findFirst({
          where: and(
            eq(schema.matchSquads.fixtureId, fixtureId),
            eq(schema.matchSquads.side, side)
          ),
        });

        let squad;

        if (existing) {
          // Update existing
          [squad] = await app.db
            .update(schema.matchSquads)
            .set({
              startingSlots: startingSlots as any,
              bench: bench as any,
            })
            .where(eq(schema.matchSquads.id, existing.id))
            .returning();
        } else {
          // Create new
          [squad] = await app.db
            .insert(schema.matchSquads)
            .values({
              fixtureId,
              side,
              startingSlots: startingSlots as any,
              bench: bench as any,
            })
            .returning();
        }

        app.logger.info({ fixtureId, side, squadId: squad.id }, 'Match squad created/updated');
        return squad;
      } catch (error) {
        app.logger.error({ err: error, fixtureId, side }, 'Failed to create/update squad');
        throw error;
      }
    }
  );

  // PUT /api/fixtures/:fixtureId/squads/:side - Update squad (only if not locked)
  app.fastify.put(
    '/api/fixtures/:fixtureId/squads/:side',
    async (
      request: FastifyRequest<{
        Params: { fixtureId: string; side: string };
        Body: {
          startingSlots?: LineupSlot[];
          bench?: LineupSlot[];
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { fixtureId, side } = request.params;
      const { startingSlots, bench } = request.body;

      app.logger.info({ userId: session.user.id, fixtureId, side }, 'Updating squad');

      try {
        const sideValue = side as 'HOME' | 'AWAY';
        const squad = await app.db.query.matchSquads.findFirst({
          where: and(
            eq(schema.matchSquads.fixtureId, fixtureId),
            eq(schema.matchSquads.side, sideValue)
          ),
        });

        if (!squad) {
          app.logger.warn({ fixtureId, side }, 'Squad not found');
          return reply.status(404).send({ error: 'Squad not found' });
        }

        if (squad.locked) {
          app.logger.warn({ fixtureId, side }, 'Cannot update locked squad');
          return reply.status(409).send({ error: 'Squad is locked and cannot be updated' });
        }

        const updateData: any = {};
        if (startingSlots) updateData.startingSlots = startingSlots;
        if (bench) updateData.bench = bench;

        const [updated] = await app.db
          .update(schema.matchSquads)
          .set(updateData)
          .where(eq(schema.matchSquads.id, squad.id))
          .returning();

        app.logger.info({ fixtureId, side }, 'Squad updated successfully');
        return updated;
      } catch (error) {
        app.logger.error({ err: error, fixtureId, side }, 'Failed to update squad');
        throw error;
      }
    }
  );

  // POST /api/fixtures/:fixtureId/squads/:side/substitute - Record substitution
  app.fastify.post(
    '/api/fixtures/:fixtureId/squads/:side/substitute',
    async (
      request: FastifyRequest<{
        Params: { fixtureId: string; side: string };
        Body: {
          playerOffId: string;
          playerOffName: string;
          playerOnId: string;
          playerOnName: string;
          matchTime: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { fixtureId, side } = request.params;
      const { playerOffId, playerOffName, playerOnId, playerOnName, matchTime } = request.body;

      app.logger.info(
        { userId: session.user.id, fixtureId, side, playerOffId, playerOnId },
        'Recording substitution'
      );

      try {
        const sideValue = side as 'HOME' | 'AWAY';
        const squad = await app.db.query.matchSquads.findFirst({
          where: and(
            eq(schema.matchSquads.fixtureId, fixtureId),
            eq(schema.matchSquads.side, sideValue)
          ),
        });

        if (!squad) {
          app.logger.warn({ fixtureId, side }, 'Squad not found for substitution');
          return reply.status(404).send({ error: 'Squad not found' });
        }

        const startingSlots = (squad.startingSlots as LineupSlot[]) || [];
        const bench = (squad.bench as LineupSlot[]) || [];
        const subsLog = ((squad.subsLog as SubEvent[]) || []);

        // Find and validate playerOff in starting slots
        const playerOffIndex = startingSlots.findIndex((s) => s.playerId === playerOffId);
        if (playerOffIndex === -1) {
          app.logger.warn({ fixtureId, side, playerOffId }, 'Player not in starting lineup');
          return reply.status(400).send({ error: 'Player not found in starting lineup' });
        }

        // Find and validate playerOn in bench
        const playerOnIndex = bench.findIndex((s) => s.playerId === playerOnId);
        if (playerOnIndex === -1) {
          app.logger.warn({ fixtureId, side, playerOnId }, 'Substitute player not in bench');
          return reply.status(400).send({ error: 'Player not found in bench' });
        }

        // Create sub event
        const subEvent: SubEvent = {
          time: new Date().toISOString(),
          matchTime,
          playerOffId,
          playerOffName,
          playerOnId,
          playerOnName,
        };

        // Swap players
        const playerOnSlot = bench[playerOnIndex];
        startingSlots[playerOffIndex] = playerOnSlot;
        bench[playerOnIndex] = {
          positionNo: startingSlots[playerOffIndex].positionNo,
          positionName: startingSlots[playerOffIndex].positionName,
          playerId: playerOffId,
          playerName: playerOffName,
          jerseyNo: startingSlots[playerOffIndex].jerseyNo,
        };

        subsLog.push(subEvent);

        // Update squad
        const [updated] = await app.db
          .update(schema.matchSquads)
          .set({
            startingSlots: startingSlots as any,
            bench: bench as any,
            subsLog: subsLog as any,
          })
          .where(eq(schema.matchSquads.id, squad.id))
          .returning();

        app.logger.info(
          { fixtureId, side, playerOffId, playerOnId, matchTime },
          'Substitution recorded successfully'
        );
        return updated;
      } catch (error) {
        app.logger.error(
          { err: error, fixtureId, side, playerOffId, playerOnId },
          'Failed to record substitution'
        );
        throw error;
      }
    }
  );

  // POST /api/teams/:teamId/players/quick-add - Create player with minimal info
  app.fastify.post(
    '/api/teams/:teamId/players/quick-add',
    async (
      request: FastifyRequest<{
        Params: { teamId: string };
        Body: {
          name: string;
          jerseyNo?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId } = request.params;
      const { name, jerseyNo } = request.body;

      app.logger.info({ userId: session.user.id, teamId, name }, 'Quick adding player');

      try {
        const [player] = await app.db
          .insert(schema.players)
          .values({
            teamId,
            name,
            jerseyNo,
          })
          .returning();

        app.logger.info({ playerId: player.id, name }, 'Player quick added successfully');
        return player;
      } catch (error) {
        app.logger.error({ err: error, teamId, name }, 'Failed to quick add player');
        throw error;
      }
    }
  );
}
