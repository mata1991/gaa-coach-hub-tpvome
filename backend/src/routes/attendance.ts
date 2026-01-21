import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerAttendanceRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/training-sessions/:sessionId/attendance - Get training attendance for a session
  app.fastify.get(
    '/api/training-sessions/:sessionId/attendance',
    async (
      request: FastifyRequest<{ Params: { sessionId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { sessionId } = request.params;
      app.logger.info({ userId: session.user.id, sessionId }, 'Fetching training attendance');

      try {
        const attendanceRecords = await app.db.query.trainingAttendance.findMany({
          where: eq(schema.trainingAttendance.sessionId, sessionId),
          with: {
            player: true,
          },
        });

        app.logger.info({ sessionId, count: attendanceRecords.length }, 'Training attendance fetched');
        return attendanceRecords;
      } catch (error) {
        app.logger.error({ err: error, sessionId }, 'Failed to fetch training attendance');
        throw error;
      }
    }
  );

  // POST /api/training-sessions/:sessionId/attendance - Bulk update training attendance
  app.fastify.post(
    '/api/training-sessions/:sessionId/attendance',
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
        Body: {
          attendance: Array<{
            playerId: string;
            status: 'TRAINED' | 'INJURED' | 'EXCUSED' | 'NO_CONTACT';
            note?: string;
          }>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { sessionId } = request.params;
      const { attendance: attendanceData } = request.body;
      app.logger.info(
        { userId: session.user.id, sessionId, recordCount: attendanceData.length },
        'Bulk updating training attendance'
      );

      try {
        let updated = 0;

        for (const record of attendanceData) {
          // Check if attendance record exists
          const existing = await app.db.query.trainingAttendance.findFirst({
            where: and(
              eq(schema.trainingAttendance.sessionId, sessionId),
              eq(schema.trainingAttendance.playerId, record.playerId)
            ),
          });

          if (existing) {
            await app.db
              .update(schema.trainingAttendance)
              .set({
                status: record.status,
                note: record.note,
              })
              .where(eq(schema.trainingAttendance.id, existing.id));
          } else {
            await app.db.insert(schema.trainingAttendance).values({
              sessionId,
              playerId: record.playerId,
              status: record.status,
              note: record.note,
            });
          }
          updated++;
        }

        app.logger.info({ sessionId, updated }, 'Training attendance bulk updated successfully');
        return { success: true, updated };
      } catch (error) {
        app.logger.error({ err: error, sessionId }, 'Failed to bulk update training attendance');
        throw error;
      }
    }
  );

  // PUT /api/training-attendance/:id - Update single training attendance record
  app.fastify.put(
    '/api/training-attendance/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          status: 'TRAINED' | 'INJURED' | 'EXCUSED' | 'NO_CONTACT';
          note?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { status, note } = request.body;
      app.logger.info({ userId: session.user.id, attendanceId: id, status }, 'Updating training attendance');

      try {
        const [updated] = await app.db
          .update(schema.trainingAttendance)
          .set({ status, note })
          .where(eq(schema.trainingAttendance.id, id))
          .returning();

        app.logger.info({ attendanceId: id }, 'Training attendance updated successfully');
        return updated;
      } catch (error) {
        app.logger.error({ err: error, attendanceId: id }, 'Failed to update training attendance');
        throw error;
      }
    }
  );
}
