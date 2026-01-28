import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerTrainingReportRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/teams/:teamId/training-reports/players - Get aggregated training attendance for all players
  app.fastify.get(
    '/api/teams/:teamId/training-reports/players',
    async (
      request: FastifyRequest<{
        Params: { teamId: string };
        Querystring: { from?: string; to?: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId } = request.params;
      const { from, to } = request.query;

      app.logger.info(
        { userId: session.user.id, teamId, from, to },
        'Fetching team training reports for all players'
      );

      try {
        // Parse date range
        let fromDate: Date | undefined;
        let toDate: Date | undefined;

        if (from) {
          fromDate = new Date(from);
          if (isNaN(fromDate.getTime())) {
            app.logger.warn({ from }, 'Invalid from date format');
            return reply.status(400).send({ error: 'Invalid from date format. Use ISO 8601 format' });
          }
        }

        if (to) {
          toDate = new Date(to);
          if (isNaN(toDate.getTime())) {
            app.logger.warn({ to }, 'Invalid to date format');
            return reply.status(400).send({ error: 'Invalid to date format. Use ISO 8601 format' });
          }
        }

        // Fetch all training attendance records for the team with their sessions
        const attendanceRecords = await app.db.query.trainingAttendance.findMany({
          with: {
            player: true,
            session: true,
          },
        });

        // Filter by team and date range
        const filteredRecords = attendanceRecords.filter((record) => {
          if (record.session.teamId !== teamId) return false;
          const sessionDate = record.session.date as Date;
          if (fromDate && sessionDate < fromDate) return false;
          if (toDate && sessionDate > toDate) return false;
          return true;
        });

        // Also fetch players to ensure we get all team players even with no attendance
        const players = await app.db.query.players.findMany({
          where: eq(schema.players.teamId, teamId),
        });

        // Build attendance map
        const attendanceMap: Record<
          string,
          {
            playerId: string;
            name: string;
            trained: number;
            injured: number;
            excused: number;
            noContact: number;
          }
        > = {};

        // Initialize all players
        players.forEach((player) => {
          attendanceMap[player.id] = {
            playerId: player.id,
            name: player.name,
            trained: 0,
            injured: 0,
            excused: 0,
            noContact: 0,
          };
        });

        // Count attendance by status
        filteredRecords.forEach((record) => {
          if (record.playerId && attendanceMap[record.playerId]) {
            const status = record.status as string;
            if (status === 'TRAINED') {
              attendanceMap[record.playerId].trained++;
            } else if (status === 'INJURED') {
              attendanceMap[record.playerId].injured++;
            } else if (status === 'EXCUSED') {
              attendanceMap[record.playerId].excused++;
            } else if (status === 'NO_CONTACT') {
              attendanceMap[record.playerId].noContact++;
            }
          }
        });

        const report = Object.values(attendanceMap).sort((a, b) => a.name.localeCompare(b.name));

        app.logger.info(
          { teamId, playerCount: report.length },
          'Team training reports fetched for all players'
        );
        return report;
      } catch (error) {
        app.logger.error({ err: error, teamId }, 'Failed to fetch team training reports');
        throw error;
      }
    }
  );

  // GET /api/teams/:teamId/training-reports/players/:playerId - Get detailed training report for a single player
  app.fastify.get(
    '/api/teams/:teamId/training-reports/players/:playerId',
    async (
      request: FastifyRequest<{
        Params: { teamId: string; playerId: string };
        Querystring: { from?: string; to?: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId, playerId } = request.params;
      const { from, to } = request.query;

      app.logger.info(
        { userId: session.user.id, teamId, playerId, from, to },
        'Fetching player training report'
      );

      try {
        // Verify player exists and belongs to team
        const player = await app.db.query.players.findFirst({
          where: and(
            eq(schema.players.id, playerId),
            eq(schema.players.teamId, teamId)
          ),
        });

        if (!player) {
          app.logger.warn({ teamId, playerId }, 'Player not found in team');
          return reply.status(404).send({ error: 'Player not found in team' });
        }

        // Parse date range
        let fromDate: Date | undefined;
        let toDate: Date | undefined;

        if (from) {
          fromDate = new Date(from);
          if (isNaN(fromDate.getTime())) {
            app.logger.warn({ from }, 'Invalid from date format');
            return reply.status(400).send({ error: 'Invalid from date format. Use ISO 8601 format' });
          }
        }

        if (to) {
          toDate = new Date(to);
          if (isNaN(toDate.getTime())) {
            app.logger.warn({ to }, 'Invalid to date format');
            return reply.status(400).send({ error: 'Invalid to date format. Use ISO 8601 format' });
          }
        }

        // Fetch all training attendance records for this player
        const attendanceRecords = await app.db.query.trainingAttendance.findMany({
          where: eq(schema.trainingAttendance.playerId, playerId),
          with: {
            session: true,
          },
        });

        // Filter by team and date range
        const filteredRecords = attendanceRecords.filter((record) => {
          if (record.session.teamId !== teamId) return false;
          const sessionDate = record.session.date as Date;
          if (fromDate && sessionDate < fromDate) return false;
          if (toDate && sessionDate > toDate) return false;
          return true;
        });

        // Aggregate counts by status
        const counts = {
          trained: 0,
          injured: 0,
          excused: 0,
          noContact: 0,
        };

        filteredRecords.forEach((record) => {
          const status = record.status as string;
          if (status === 'TRAINED') {
            counts.trained++;
          } else if (status === 'INJURED') {
            counts.injured++;
          } else if (status === 'EXCUSED') {
            counts.excused++;
          } else if (status === 'NO_CONTACT') {
            counts.noContact++;
          }
        });

        // Build sessions array sorted by date DESC (most recent first)
        const sessions = filteredRecords
          .map((record) => ({
            date: record.session.date,
            sessionId: record.session.id,
            sessionTitle: record.session.focus || 'Training Session',
            status: record.status,
          }))
          .sort((a, b) => {
            const dateA = a.date as Date;
            const dateB = b.date as Date;
            return dateB.getTime() - dateA.getTime();
          });

        const report = {
          playerId: player.id,
          name: player.name,
          counts,
          sessions,
        };

        app.logger.info(
          { teamId, playerId, sessionCount: sessions.length },
          'Player training report fetched'
        );
        return report;
      } catch (error) {
        app.logger.error({ err: error, teamId, playerId }, 'Failed to fetch player training report');
        throw error;
      }
    }
  );
}
