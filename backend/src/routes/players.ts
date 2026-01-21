import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerPlayerRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/players - Get players for a team
  app.fastify.get(
    '/api/players',
    async (
      request: FastifyRequest<{ Querystring: { teamId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId } = request.query;
      app.logger.info({ userId: session.user.id, teamId }, 'Fetching players');

      try {
        const players = await app.db.query.players.findMany({
          where: eq(schema.players.teamId, teamId),
          with: {
            trainingAttendance: true,
            developmentNotes: true,
            fitnessTests: true,
          },
        });

        app.logger.info({ teamId, playerCount: players.length }, 'Players fetched');
        return players;
      } catch (error) {
        app.logger.error({ err: error, teamId }, 'Failed to fetch players');
        throw error;
      }
    }
  );

  // POST /api/players - Create a player
  app.fastify.post(
    '/api/players',
    async (
      request: FastifyRequest<{
        Body: {
          teamId: string;
          name: string;
          dob?: string;
          positions?: string;
          jerseyNo?: number;
          dominantSide?: 'left' | 'right';
          notes?: string;
          injuryStatus?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId, name, dob, positions, jerseyNo, dominantSide, notes, injuryStatus } =
        request.body;
      app.logger.info({ userId: session.user.id, teamId, name }, 'Creating player');

      try {
        const [player] = await app.db
          .insert(schema.players)
          .values({
            teamId,
            name,
            dob: dob ? dob : undefined,
            positions,
            jerseyNo,
            dominantSide,
            notes,
            injuryStatus,
          })
          .returning();

        app.logger.info({ playerId: player.id, name }, 'Player created successfully');
        return player;
      } catch (error) {
        app.logger.error({ err: error, teamId, name }, 'Failed to create player');
        throw error;
      }
    }
  );

  // GET /api/players/:id - Get player details
  app.fastify.get(
    '/api/players/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, playerId: id }, 'Fetching player details');

      try {
        const player = await app.db.query.players.findFirst({
          where: eq(schema.players.id, id),
          with: {
            trainingAttendance: true,
            developmentNotes: true,
            fitnessTests: true,
            matchEvents: true,
          },
        });

        if (!player) {
          app.logger.warn({ playerId: id }, 'Player not found');
          return reply.status(404).send({ error: 'Player not found' });
        }

        // Calculate training attendance percentage
        const trainingRecords = player.trainingAttendance;
        const trainedCount = trainingRecords.filter((a) => a.status === 'TRAINED').length;
        const trainingAttendancePercentage =
          trainingRecords.length > 0 ? (trainedCount / trainingRecords.length) * 100 : 0;

        app.logger.info({ playerId: id }, 'Player details fetched');
        return {
          ...player,
          trainingAttendancePercentage,
        };
      } catch (error) {
        app.logger.error({ err: error, playerId: id }, 'Failed to fetch player');
        throw error;
      }
    }
  );

  // PUT /api/players/:id - Update player
  app.fastify.put(
    '/api/players/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          name?: string;
          positions?: string;
          jerseyNo?: number;
          notes?: string;
          injuryStatus?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { name, positions, jerseyNo, notes, injuryStatus } = request.body;

      app.logger.info({ userId: session.user.id, playerId: id }, 'Updating player');

      try {
        const updateData: any = {};
        if (name) updateData.name = name;
        if (positions) updateData.positions = positions;
        if (jerseyNo) updateData.jerseyNo = jerseyNo;
        if (notes !== undefined) updateData.notes = notes;
        if (injuryStatus !== undefined) updateData.injuryStatus = injuryStatus;

        const [updated] = await app.db
          .update(schema.players)
          .set(updateData)
          .where(eq(schema.players.id, id))
          .returning();

        app.logger.info({ playerId: id }, 'Player updated successfully');
        return updated;
      } catch (error) {
        app.logger.error({ err: error, playerId: id }, 'Failed to update player');
        throw error;
      }
    }
  );
}
