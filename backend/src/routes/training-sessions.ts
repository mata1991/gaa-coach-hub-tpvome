import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

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
      app.logger.info({ userId: session.user.id, teamId }, 'Fetching training sessions');

      try {
        const sessions = await app.db.query.trainingSessions.findMany({
          where: eq(schema.trainingSessions.teamId, teamId),
          orderBy: (sessions, { desc }) => [desc(sessions.date)],
        });

        app.logger.info({ teamId, sessionCount: sessions.length }, 'Training sessions fetched');
        return sessions;
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
          date: string;
          focus?: string;
          drills?: string;
          notes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId, date, focus, drills, notes } = request.body;
      app.logger.info({ userId: session.user.id, teamId, date }, 'Creating training session');

      try {
        const [trainSession] = await app.db
          .insert(schema.trainingSessions)
          .values({
            teamId,
            date: new Date(date),
            focus,
            drills,
            notes,
          })
          .returning();

        app.logger.info(
          { trainingSessionId: trainSession.id, date },
          'Training session created successfully'
        );
        return trainSession;
      } catch (error) {
        app.logger.error({ err: error, teamId, date }, 'Failed to create training session');
        throw error;
      }
    }
  );

  // GET /api/training-sessions/:id - Get session details
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
            attendance: true,
          },
        });

        if (!trainSession) {
          app.logger.warn({ trainingSessionId: id }, 'Training session not found');
          return reply.status(404).send({ error: 'Training session not found' });
        }

        app.logger.info({ trainingSessionId: id }, 'Session details fetched');
        return trainSession;
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
          focus?: string;
          drills?: string;
          notes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { focus, drills, notes } = request.body;

      app.logger.info({ userId: session.user.id, trainingSessionId: id }, 'Updating session');

      try {
        const updateData: any = {};
        if (focus !== undefined) updateData.focus = focus;
        if (drills !== undefined) updateData.drills = drills;
        if (notes !== undefined) updateData.notes = notes;

        const [updated] = await app.db
          .update(schema.trainingSessions)
          .set(updateData)
          .where(eq(schema.trainingSessions.id, id))
          .returning();

        app.logger.info({ trainingSessionId: id }, 'Session updated successfully');
        return updated;
      } catch (error) {
        app.logger.error({ err: error, trainingSessionId: id }, 'Failed to update session');
        throw error;
      }
    }
  );
}
