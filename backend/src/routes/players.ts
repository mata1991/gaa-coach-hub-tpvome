import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerPlayerRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/players - Get players for a team, sorted by position group and depth order
  app.fastify.get(
    '/api/players',
    async (
      request: FastifyRequest<{ Querystring: { teamId: string; positionGroup?: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId, positionGroup } = request.query;
      app.logger.info({ userId: session.user.id, teamId, positionGroup }, 'Fetching players');

      try {
        let whereCondition: any = eq(schema.players.teamId, teamId);

        // Filter by position group if provided
        if (positionGroup) {
          whereCondition = and(
            eq(schema.players.teamId, teamId),
            eq(schema.players.primaryPositionGroup, positionGroup as 'GK' | 'BACK' | 'MID' | 'FWD')
          );
        }

        const players = await app.db.query.players.findMany({
          where: whereCondition,
          orderBy: (players, { asc }) => [
            asc(players.isInjured),
            asc(players.depthOrder),
            asc(players.name),
          ],
          with: {
            trainingAttendance: true,
            developmentNotes: true,
            fitnessTests: true,
          },
        });

        app.logger.info({ teamId, positionGroup, playerCount: players.length }, 'Players fetched');
        return players;
      } catch (error) {
        app.logger.error({ err: error, teamId, positionGroup }, 'Failed to fetch players');
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
          primaryPositionGroup?: 'GK' | 'BACK' | 'MID' | 'FWD';
          depthOrder?: number;
          notes?: string;
          injuryStatus?: string;
          isInjured?: boolean;
          injuryNote?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const {
        teamId,
        name,
        dob,
        positions,
        jerseyNo,
        dominantSide,
        primaryPositionGroup,
        depthOrder,
        notes,
        injuryStatus,
        isInjured,
        injuryNote,
      } = request.body;
      app.logger.info(
        { userId: session.user.id, teamId, name, primaryPositionGroup },
        'Creating player'
      );

      try {
        let assignedDepthOrder = depthOrder ?? 0;

        // Auto-assign depthOrder if primaryPositionGroup is provided but depthOrder is not
        if (primaryPositionGroup && depthOrder === undefined) {
          const maxDepthPlayer = await app.db.query.players.findFirst({
            where: and(
              eq(schema.players.teamId, teamId),
              eq(schema.players.primaryPositionGroup, primaryPositionGroup)
            ),
            orderBy: (players, { desc }) => [desc(players.depthOrder)],
          });
          assignedDepthOrder = (maxDepthPlayer?.depthOrder ?? -1) + 1;
        }

        const [player] = await app.db
          .insert(schema.players)
          .values({
            teamId,
            name,
            dob: dob ? dob : undefined,
            positions,
            jerseyNo,
            dominantSide,
            primaryPositionGroup,
            depthOrder: assignedDepthOrder,
            notes,
            injuryStatus,
            isInjured: isInjured ?? false,
            injuryNote,
            injuryUpdatedAt: isInjured ? new Date() : undefined,
          })
          .returning();

        app.logger.info(
          { playerId: player.id, name, depthOrder: player.depthOrder },
          'Player created successfully'
        );
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
          dominantSide?: 'left' | 'right';
          primaryPositionGroup?: 'GK' | 'BACK' | 'MID' | 'FWD';
          depthOrder?: number;
          notes?: string;
          injuryStatus?: string;
          isInjured?: boolean;
          injuryNote?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const {
        name,
        positions,
        jerseyNo,
        dominantSide,
        primaryPositionGroup,
        depthOrder,
        notes,
        injuryStatus,
        isInjured,
        injuryNote,
      } = request.body;

      app.logger.info(
        { userId: session.user.id, playerId: id, primaryPositionGroup, depthOrder, isInjured },
        'Updating player'
      );

      try {
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (positions !== undefined) updateData.positions = positions;
        if (jerseyNo !== undefined) updateData.jerseyNo = jerseyNo;
        if (dominantSide !== undefined) updateData.dominantSide = dominantSide;
        if (primaryPositionGroup !== undefined) updateData.primaryPositionGroup = primaryPositionGroup;
        if (depthOrder !== undefined) updateData.depthOrder = depthOrder;
        if (notes !== undefined) updateData.notes = notes;
        if (injuryStatus !== undefined) updateData.injuryStatus = injuryStatus;
        if (isInjured !== undefined) {
          updateData.isInjured = isInjured;
          updateData.injuryUpdatedAt = new Date();
        }
        if (injuryNote !== undefined) updateData.injuryNote = injuryNote;

        const [updated] = await app.db
          .update(schema.players)
          .set(updateData)
          .where(eq(schema.players.id, id))
          .returning();

        app.logger.info({ playerId: id, depthOrder: updated.depthOrder }, 'Player updated successfully');
        return updated;
      } catch (error) {
        app.logger.error({ err: error, playerId: id }, 'Failed to update player');
        throw error;
      }
    }
  );

  // PATCH /api/players/:id - Partial update player
  app.fastify.patch(
    '/api/players/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          name?: string;
          positions?: string;
          jerseyNo?: number;
          dominantSide?: 'left' | 'right';
          primaryPositionGroup?: 'GK' | 'BACK' | 'MID' | 'FWD';
          depthOrder?: number;
          notes?: string;
          injuryStatus?: string;
          isInjured?: boolean;
          injuryNote?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const {
        name,
        positions,
        jerseyNo,
        dominantSide,
        primaryPositionGroup,
        depthOrder,
        notes,
        injuryStatus,
        isInjured,
        injuryNote,
      } = request.body;

      app.logger.info({ userId: session.user.id, playerId: id, isInjured }, 'Patching player');

      try {
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (positions !== undefined) updateData.positions = positions;
        if (jerseyNo !== undefined) updateData.jerseyNo = jerseyNo;
        if (dominantSide !== undefined) updateData.dominantSide = dominantSide;
        if (primaryPositionGroup !== undefined) updateData.primaryPositionGroup = primaryPositionGroup;
        if (depthOrder !== undefined) updateData.depthOrder = depthOrder;
        if (notes !== undefined) updateData.notes = notes;
        if (injuryStatus !== undefined) updateData.injuryStatus = injuryStatus;
        if (isInjured !== undefined) {
          updateData.isInjured = isInjured;
          updateData.injuryUpdatedAt = new Date();
          if (isInjured) {
            // Mark as injured
            updateData.injuredAt = new Date();
            updateData.clearedAt = null;
          } else {
            // Clear injury
            updateData.clearedAt = new Date();
          }
        }
        if (injuryNote !== undefined) updateData.injuryNote = injuryNote;

        const [updated] = await app.db
          .update(schema.players)
          .set(updateData)
          .where(eq(schema.players.id, id))
          .returning();

        app.logger.info({ playerId: id, isInjured: updated.isInjured }, 'Player patched successfully');
        return updated;
      } catch (error) {
        app.logger.error({ err: error, playerId: id }, 'Failed to patch player');
        throw error;
      }
    }
  );

  // PUT /api/teams/:teamId/players/reorder - Bulk reorder players by position group
  app.fastify.put(
    '/api/teams/:teamId/players/reorder',
    async (
      request: FastifyRequest<{
        Params: { teamId: string };
        Body: {
          positionGroup: 'GK' | 'BACK' | 'MID' | 'FWD';
          orderedPlayerIds: string[];
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId } = request.params;
      const { positionGroup, orderedPlayerIds } = request.body;

      app.logger.info(
        { userId: session.user.id, teamId, positionGroup, playerCount: orderedPlayerIds.length },
        'Reordering players'
      );

      try {
        // Validate that all player IDs are provided
        if (!orderedPlayerIds || orderedPlayerIds.length === 0) {
          app.logger.warn({ teamId, positionGroup }, 'No player IDs provided for reorder');
          return reply.status(400).send({ error: 'orderedPlayerIds array is required and cannot be empty' });
        }

        // Fetch all players to validate they belong to the team and have the correct position group
        const players = await app.db.query.players.findMany({
          where: inArray(schema.players.id, orderedPlayerIds),
        });

        // Validate all players belong to the team
        const invalidTeamPlayers = players.filter((p) => p.teamId !== teamId);
        if (invalidTeamPlayers.length > 0) {
          app.logger.warn(
            { teamId, invalidPlayerCount: invalidTeamPlayers.length },
            'Some players do not belong to the team'
          );
          return reply
            .status(400)
            .send({ error: 'All players must belong to the specified team' });
        }

        // Validate all players have the correct position group
        const wrongPositionPlayers = players.filter((p) => p.primaryPositionGroup !== positionGroup);
        if (wrongPositionPlayers.length > 0) {
          app.logger.warn(
            { teamId, positionGroup, wrongPositionCount: wrongPositionPlayers.length },
            'Some players do not have the specified position group'
          );
          return reply.status(400).send({
            error: `All players must have primaryPositionGroup '${positionGroup}'`,
          });
        }

        // Update depthOrder for each player in the new order
        let updateCount = 0;
        for (let index = 0; index < orderedPlayerIds.length; index++) {
          await app.db
            .update(schema.players)
            .set({ depthOrder: index })
            .where(eq(schema.players.id, orderedPlayerIds[index]));
          updateCount++;
        }

        app.logger.info(
          { teamId, positionGroup, updatedCount: updateCount },
          'Players reordered successfully'
        );
        return { success: true, updated: updateCount };
      } catch (error) {
        app.logger.error({ err: error, teamId, positionGroup }, 'Failed to reorder players');
        throw error;
      }
    }
  );
}
