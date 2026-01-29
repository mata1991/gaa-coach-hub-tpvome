import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: any): boolean {
  if (typeof value !== 'string' || !value) return false;
  return UUID_REGEX.test(value);
}

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

      // Validate fixtureId is a valid UUID
      if (!isValidUUID(fixtureId)) {
        app.logger.warn({ userId: session.user.id, fixtureId }, 'Invalid fixtureId format');
        return reply.status(400).send({
          error: 'Invalid fixtureId',
          message: 'fixtureId must be a valid UUID',
        });
      }

      app.logger.info({ userId: session.user.id, fixtureId }, 'Fetching match squads');

      try {
        // Verify fixture exists
        const fixture = await app.db.query.fixtures.findFirst({
          where: eq(schema.fixtures.id, fixtureId),
        });

        if (!fixture) {
          app.logger.warn({ fixtureId }, 'Fixture not found');
          return reply.status(404).send({ error: 'Fixture not found' });
        }

        let squads = await app.db.query.matchSquads.findMany({
          where: eq(schema.matchSquads.fixtureId, fixtureId),
        });

        // If away squad doesn't exist, auto-create it with placeholders
        const awaySquadExists = squads.some((s) => s.side === 'AWAY');
        if (!awaySquadExists) {
          const placeholderStartingSlots: LineupSlot[] = [];
          for (let i = 1; i <= 15; i++) {
            placeholderStartingSlots.push({
              positionNo: i,
              positionName: `Position ${i}`,
              playerId: null,
              playerName: `Away #${i}`,
              jerseyNo: String(i),
            });
          }

          const placeholderBench: LineupSlot[] = [];
          for (let i = 1; i <= 15; i++) {
            placeholderBench.push({
              positionNo: i,
              positionName: `Bench ${i}`,
              playerId: null,
              playerName: `Away Sub ${i}`,
              jerseyNo: String(100 + i),
            });
          }

          const [newAwaySquad] = await app.db
            .insert(schema.matchSquads)
            .values({
              fixtureId,
              side: 'AWAY',
              startingSlots: placeholderStartingSlots as any,
              bench: placeholderBench as any,
            })
            .returning();

          squads.push(newAwaySquad);
          app.logger.info({ fixtureId }, 'Auto-created AWAY squad with placeholders');
        }

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

      // Validate fixtureId is a valid UUID
      if (!isValidUUID(fixtureId)) {
        app.logger.warn({ userId: session.user.id, fixtureId }, 'Invalid fixtureId format');
        return reply.status(400).send({
          error: 'Invalid fixtureId',
          message: 'fixtureId must be a valid UUID',
        });
      }

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
        let slotsToUse = startingSlots;
        let benchToUse = bench;

        // If creating AWAY squad without explicit slots, use placeholders
        if (!existing && side === 'AWAY' && (!startingSlots || startingSlots.length === 0)) {
          slotsToUse = [];
          for (let i = 1; i <= 15; i++) {
            slotsToUse.push({
              positionNo: i,
              positionName: `Position ${i}`,
              playerId: undefined,
              playerName: `Away #${i}`,
              jerseyNo: String(i),
            });
          }

          benchToUse = [];
          for (let i = 1; i <= 15; i++) {
            benchToUse.push({
              positionNo: i,
              positionName: `Bench ${i}`,
              playerId: undefined,
              playerName: `Away Sub ${i}`,
              jerseyNo: String(100 + i),
            });
          }

          app.logger.info({ fixtureId }, 'Using placeholder squads for AWAY team');
        }

        if (existing) {
          // Update existing
          [squad] = await app.db
            .update(schema.matchSquads)
            .set({
              startingSlots: slotsToUse as any,
              bench: benchToUse as any,
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
              startingSlots: slotsToUse as any,
              bench: benchToUse as any,
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

      // Validate fixtureId is a valid UUID
      if (!isValidUUID(fixtureId)) {
        app.logger.warn({ userId: session.user.id, fixtureId }, 'Invalid fixtureId format');
        return reply.status(400).send({
          error: 'Invalid fixtureId',
          message: 'fixtureId must be a valid UUID',
        });
      }

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

      // Validate fixtureId is a valid UUID
      if (!isValidUUID(fixtureId)) {
        app.logger.warn({ userId: session.user.id, fixtureId }, 'Invalid fixtureId format');
        return reply.status(400).send({
          error: 'Invalid fixtureId',
          message: 'fixtureId must be a valid UUID',
        });
      }

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

  // GET /api/fixtures/:fixtureId/lineup-status - Check if a lineup exists for fixture
  app.fastify.get(
    '/api/fixtures/:fixtureId/lineup-status',
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

      app.logger.info({ userId: session.user.id, fixtureId }, 'Checking lineup status');

      try {
        // First, verify the fixture exists
        const fixture = await app.db.query.fixtures.findFirst({
          where: eq(schema.fixtures.id, fixtureId),
        });

        if (!fixture) {
          app.logger.warn({ fixtureId }, 'Fixture not found');
          return reply.status(404).send({ error: 'Fixture not found' });
        }

        // Check if any match squad exists for this fixture (HOME or AWAY)
        const matchSquad = await app.db.query.matchSquads.findFirst({
          where: eq(schema.matchSquads.fixtureId, fixtureId),
        });

        const hasLineup = !!matchSquad;

        app.logger.info({ fixtureId, hasLineup }, 'Lineup status checked');
        return { hasLineup };
      } catch (error) {
        app.logger.error({ err: error, fixtureId }, 'Failed to check lineup status');
        throw error;
      }
    }
  );

  // GET /api/fixtures/:fixtureId/squad-status - Check if both HOME and AWAY squads exist
  app.fastify.get(
    '/api/fixtures/:fixtureId/squad-status',
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

      app.logger.info({ userId: session.user.id, fixtureId }, 'Checking squad status');

      try {
        // First, verify the fixture exists
        const fixture = await app.db.query.fixtures.findFirst({
          where: eq(schema.fixtures.id, fixtureId),
        });

        if (!fixture) {
          app.logger.warn({ fixtureId }, 'Fixture not found');
          return reply.status(404).send({ error: 'Fixture not found' });
        }

        // Check if HOME squad exists and has at least one player in startingSlots
        const homeSquad = await app.db.query.matchSquads.findFirst({
          where: and(
            eq(schema.matchSquads.fixtureId, fixtureId),
            eq(schema.matchSquads.side, 'HOME')
          ),
        });

        // Check if AWAY squad exists and has at least one player in startingSlots
        const awaySquad = await app.db.query.matchSquads.findFirst({
          where: and(
            eq(schema.matchSquads.fixtureId, fixtureId),
            eq(schema.matchSquads.side, 'AWAY')
          ),
        });

        // Check if squads have at least one player in starting slots
        const homeStarting = homeSquad ? (homeSquad.startingSlots as any[]) || [] : [];
        const awayStarting = awaySquad ? (awaySquad.startingSlots as any[]) || [] : [];

        const homeReady = !!homeSquad && homeStarting.length > 0;
        const awayReady = !!awaySquad && awayStarting.length > 0;

        app.logger.info({ fixtureId, homeReady, awayReady }, 'Squad status checked');
        return { homeReady, awayReady };
      } catch (error) {
        app.logger.error({ err: error, fixtureId }, 'Failed to check squad status');
        throw error;
      }
    }
  );

  // POST /api/fixtures/:fixtureId/squads/away/placeholders - Create placeholder away squad
  app.fastify.post(
    '/api/fixtures/:fixtureId/squads/away/placeholders',
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

      app.logger.info({ userId: session.user.id, fixtureId }, 'Creating placeholder away squad');

      try {
        // Verify fixture exists
        const fixture = await app.db.query.fixtures.findFirst({
          where: eq(schema.fixtures.id, fixtureId),
        });

        if (!fixture) {
          app.logger.warn({ fixtureId }, 'Fixture not found');
          return reply.status(404).send({ error: 'Fixture not found' });
        }

        // Check if away squad already exists
        const existingAway = await app.db.query.matchSquads.findFirst({
          where: and(
            eq(schema.matchSquads.fixtureId, fixtureId),
            eq(schema.matchSquads.side, 'AWAY')
          ),
        });

        if (existingAway) {
          app.logger.warn({ fixtureId }, 'Away squad already exists');
          return reply.status(400).send({ error: 'Away squad already exists for this fixture' });
        }

        // Create placeholder starting slots (1-15)
        const startingSlots: LineupSlot[] = [];
        for (let i = 1; i <= 15; i++) {
          startingSlots.push({
            positionNo: i,
            positionName: DEFAULT_POSITIONS[i - 1]?.positionName || `Position ${i}`,
            playerName: `Away ${i}`,
          });
        }

        // Create placeholder bench slots (16-30)
        const benchSlots: LineupSlot[] = [];
        for (let i = 16; i <= 30; i++) {
          benchSlots.push({
            positionNo: i,
            positionName: `Substitute ${i - 15}`,
            playerName: `Away ${i}`,
          });
        }

        // Create the away squad
        const [awaySquad] = await app.db
          .insert(schema.matchSquads)
          .values({
            fixtureId,
            side: 'AWAY',
            startingSlots: startingSlots,
            bench: benchSlots,
          })
          .returning();

        app.logger.info(
          { fixtureId, squadId: awaySquad.id, side: 'AWAY' },
          'Placeholder away squad created successfully'
        );
        return awaySquad;
      } catch (error) {
        app.logger.error({ err: error, fixtureId }, 'Failed to create placeholder away squad');
        throw error;
      }
    }
  );
}
