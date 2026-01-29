import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';
import { validateParamId } from '../utils/validation.js';

export function registerTrainingSessionRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/training-sessions - Get training sessions for a team
  app.fastify.get(
    '/api/training-sessions',
    async (
      request: FastifyRequest<{ Querystring: { teamId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId } = request.query;

      // Validate teamId parameter
      if (!validateParamId(teamId, 'teamId', reply)) {
        return;
      }

      app.logger.info({ userId: session.user.id, teamId }, 'Fetching training sessions');

      try {
        // Verify team exists
        const team = await app.db.query.teams.findFirst({
          where: eq(schema.teams.id, teamId),
        });

        if (!team) {
          app.logger.warn({ teamId }, 'Team not found');
          return reply.status(404).send({ error: 'Team not found' });
        }

        const sessions = await app.db.query.trainingSessions.findMany({
          where: eq(schema.trainingSessions.teamId, teamId),
          orderBy: (sessions, { desc }) => [desc(sessions.date)],
          with: {
            trainingAttendance: true,
          },
        });

        // Add attendance counts to each session
        const sessionsWithCounts = sessions.map((s) => {
          const counts = {
            trained: s.trainingAttendance.filter((a) => a.status === 'TRAINED').length,
            injured: s.trainingAttendance.filter((a) => a.status === 'INJURED').length,
            excused: s.trainingAttendance.filter((a) => a.status === 'EXCUSED').length,
            noContact: s.trainingAttendance.filter((a) => a.status === 'NO_CONTACT').length,
          };
          const { trainingAttendance, ...rest } = s;
          return { ...rest, attendanceCounts: counts };
        });

        app.logger.info({ teamId, sessionCount: sessions.length }, 'Training sessions fetched');
        return sessionsWithCounts;
      } catch (error) {
        app.logger.error({ err: error, teamId }, 'Failed to fetch training sessions');
        throw error;
      }
    }
  );

  // POST /api/training-sessions - Create training session
  app.fastify.post(
    '/api/training-sessions',
    async (
      request: FastifyRequest<{
        Body: {
          teamId: string;
          dateTime: string;
          location?: string;
          focus?: string;
          notes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId, dateTime, location, focus, notes } = request.body;
      app.logger.info({ userId: session.user.id, teamId, dateTime }, 'Creating training session');

      try {
        const [trainSession] = await app.db
          .insert(schema.trainingSessions)
          .values({
            teamId,
            date: new Date(dateTime),
            location,
            focus,
            notes,
            createdBy: session.user.id,
          })
          .returning();

        app.logger.info(
          { trainingSessionId: trainSession.id, dateTime, createdBy: session.user.id },
          'Training session created successfully'
        );
        return {
          id: trainSession.id,
          teamId: trainSession.teamId,
          dateTime: trainSession.date,
          location: trainSession.location,
          focus: trainSession.focus,
          notes: trainSession.notes,
          createdBy: trainSession.createdBy,
          createdAt: trainSession.createdAt,
        };
      } catch (error) {
        app.logger.error({ err: error, teamId, dateTime }, 'Failed to create training session');
        throw error;
      }
    }
  );

  // GET /api/training-sessions/:id - Get session details with full attendance
  app.fastify.get(
    '/api/training-sessions/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, trainingSessionId: id }, 'Fetching session details');

      try {
        const trainSession = await app.db.query.trainingSessions.findFirst({
          where: eq(schema.trainingSessions.id, id),
          with: {
            trainingAttendance: {
              with: {
                player: true,
              },
            },
          },
        });

        if (!trainSession) {
          app.logger.warn({ trainingSessionId: id }, 'Training session not found');
          return reply.status(404).send({ error: 'Training session not found' });
        }

        const attendance = trainSession.trainingAttendance.map((a) => ({
          id: a.id,
          playerId: a.playerId,
          playerName: a.player?.name,
          status: a.status,
          note: a.note,
        }));

        app.logger.info({ trainingSessionId: id }, 'Session details fetched');
        return {
          id: trainSession.id,
          teamId: trainSession.teamId,
          dateTime: trainSession.date,
          location: trainSession.location,
          focus: trainSession.focus,
          notes: trainSession.notes,
          createdBy: trainSession.createdBy,
          createdAt: trainSession.createdAt,
          attendance,
        };
      } catch (error) {
        app.logger.error({ err: error, trainingSessionId: id }, 'Failed to fetch session');
        throw error;
      }
    }
  );

  // PUT /api/training-sessions/:id - Update session
  app.fastify.put(
    '/api/training-sessions/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          dateTime: string;
          location?: string;
          focus?: string;
          notes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { dateTime, location, focus, notes } = request.body;

      app.logger.info({ userId: session.user.id, trainingSessionId: id }, 'Updating training session');

      try {
        // Fetch the training session to verify it exists and get team info
        const trainSession = await app.db.query.trainingSessions.findFirst({
          where: eq(schema.trainingSessions.id, id),
          with: {
            team: true,
          },
        });

        if (!trainSession) {
          app.logger.warn({ trainingSessionId: id }, 'Training session not found');
          return reply.status(404).send({ error: 'Training session not found' });
        }

        // Check permissions: user must be COACH or CLUB_ADMIN for the team's club
        const membership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, trainSession.team.clubId),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!membership || !['COACH', 'CLUB_ADMIN'].includes(membership.role)) {
          app.logger.warn({ trainingSessionId: id, userId: session.user.id }, 'Unauthorized training session update');
          return reply
            .status(403)
            .send({ error: 'Only COACH or CLUB_ADMIN can update training sessions' });
        }

        // Validate required fields
        if (!dateTime || dateTime.trim() === '') {
          app.logger.warn({ trainingSessionId: id }, 'DateTime is required');
          return reply.status(400).send({ error: 'DateTime is required' });
        }

        // Validate date format
        let parsedDate: Date;
        try {
          parsedDate = new Date(dateTime);
          if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid date');
          }
        } catch {
          app.logger.warn({ trainingSessionId: id, dateTime }, 'Invalid date format');
          return reply.status(400).send({ error: 'Invalid date format. Use ISO 8601 format' });
        }

        const updateData: any = {
          date: parsedDate,
        };

        if (location !== undefined) updateData.location = location;
        if (focus !== undefined) updateData.focus = focus;
        if (notes !== undefined) updateData.notes = notes;

        const [updated] = await app.db
          .update(schema.trainingSessions)
          .set(updateData)
          .where(eq(schema.trainingSessions.id, id))
          .returning();

        app.logger.info(
          { trainingSessionId: id, dateTime: updated.date },
          'Training session updated successfully'
        );
        return {
          id: updated.id,
          teamId: updated.teamId,
          dateTime: updated.date,
          location: updated.location,
          focus: updated.focus,
          notes: updated.notes,
          createdBy: updated.createdBy,
          createdAt: updated.createdAt,
        };
      } catch (error) {
        app.logger.error({ err: error, trainingSessionId: id }, 'Failed to update training session');
        throw error;
      }
    }
  );

  // DELETE /api/training-sessions/:id - Delete training session
  app.fastify.delete(
    '/api/training-sessions/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, trainingSessionId: id }, 'Deleting training session');

      try {
        const trainSession = await app.db.query.trainingSessions.findFirst({
          where: eq(schema.trainingSessions.id, id),
        });

        if (!trainSession) {
          app.logger.warn({ trainingSessionId: id }, 'Training session not found');
          return reply.status(404).send({ error: 'Training session not found' });
        }

        // Delete associated training attendance records (cascade is handled by DB)
        await app.db
          .delete(schema.trainingSessions)
          .where(eq(schema.trainingSessions.id, id));

        app.logger.info({ trainingSessionId: id }, 'Training session deleted successfully');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, trainingSessionId: id }, 'Failed to delete training session');
        throw error;
      }
    }
  );

  // GET /api/teams/:teamId/training-sessions - Get upcoming training sessions for a team
  app.fastify.get(
    '/api/teams/:teamId/training-sessions',
    async (
      request: FastifyRequest<{
        Params: { teamId: string };
        Querystring: { from?: string; limit?: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId } = request.params;
      const { from, limit } = request.query;

      // Validate teamId parameter
      if (!validateParamId(teamId, 'teamId', reply)) {
        return;
      }

      const parsedLimit = limit ? Math.min(parseInt(limit), 100) : 5;

      app.logger.info(
        { userId: session.user.id, teamId, from, limit: parsedLimit },
        'Fetching upcoming training sessions'
      );

      try {
        // Verify team exists
        const team = await app.db.query.teams.findFirst({
          where: eq(schema.teams.id, teamId),
        });

        if (!team) {
          app.logger.warn({ teamId }, 'Team not found');
          return reply.status(404).send({ error: 'Team not found' });
        }

        let sessions = await app.db.query.trainingSessions.findMany({
          where: eq(schema.trainingSessions.teamId, teamId),
          orderBy: (sessions, { asc }) => [asc(sessions.date)],
        });

        // Filter for upcoming sessions if from=now
        if (from === 'now') {
          const now = new Date();
          sessions = sessions.filter((s) => s.date >= now);
        }

        // Apply limit
        sessions = sessions.slice(0, parsedLimit);

        // Format response
        const formattedSessions = sessions.map((s) => ({
          id: s.id,
          teamId: s.teamId,
          dateTime: s.date,
          location: s.location,
          focus: s.focus,
          notes: s.notes,
          createdBy: s.createdBy,
          createdAt: s.createdAt,
        }));

        app.logger.info({ teamId, sessionCount: sessions.length }, 'Upcoming training sessions fetched');
        return formattedSessions;
      } catch (error) {
        app.logger.error({ err: error, teamId }, 'Failed to fetch upcoming training sessions');
        throw error;
      }
    }
  );
}
