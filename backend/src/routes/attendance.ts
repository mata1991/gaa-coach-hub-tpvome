import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerAttendanceRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/attendance - Get attendance for a session
  app.fastify.get(
    '/api/attendance',
    async (
      request: FastifyRequest<{ Querystring: { sessionId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { sessionId } = request.query;
      app.logger.info({ userId: session.user.id, sessionId }, 'Fetching attendance');

      try {
        const attendanceRecords = await app.db.query.attendance.findMany({
          where: eq(schema.attendance.sessionId, sessionId),
          with: {
            player: true,
          },
        });

        app.logger.info({ sessionId, count: attendanceRecords.length }, 'Attendance fetched');
        return attendanceRecords;
      } catch (error) {
        app.logger.error({ err: error, sessionId }, 'Failed to fetch attendance');
        throw error;
      }
    }
  );

  // POST /api/attendance/batch - Batch update attendance
  app.fastify.post(
    '/api/attendance/batch',
    async (
      request: FastifyRequest<{
        Body: {
          sessionId: string;
          records: Array<{
            playerId: string;
            status: 'present' | 'late' | 'absent';
            notes?: string;
          }>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { sessionId, records } = request.body;
      app.logger.info(
        { userId: session.user.id, sessionId, recordCount: records.length },
        'Batch updating attendance'
      );

      try {
        let updated = 0;

        for (const record of records) {
          // Check if attendance record exists
          const existing = await app.db.query.attendance.findFirst({
            where: (att) =>
              eq(att.sessionId, sessionId) && eq(att.playerId, record.playerId),
          });

          if (existing) {
            await app.db
              .update(schema.attendance)
              .set({
                status: record.status,
                notes: record.notes,
              })
              .where(eq(schema.attendance.id, existing.id));
          } else {
            await app.db.insert(schema.attendance).values({
              sessionId,
              playerId: record.playerId,
              status: record.status,
              notes: record.notes,
            });
          }
          updated++;
        }

        app.logger.info({ sessionId, updated }, 'Attendance batch updated successfully');
        return { updated };
      } catch (error) {
        app.logger.error({ err: error, sessionId }, 'Failed to batch update attendance');
        throw error;
      }
    }
  );
}
