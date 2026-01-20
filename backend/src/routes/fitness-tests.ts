import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerFitnessTestRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/fitness-tests - Get fitness tests for a player
  app.fastify.get(
    '/api/fitness-tests',
    async (
      request: FastifyRequest<{ Querystring: { playerId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { playerId } = request.query;
      app.logger.info({ userId: session.user.id, playerId }, 'Fetching fitness tests');

      try {
        const tests = await app.db.query.fitnessTests.findMany({
          where: eq(schema.fitnessTests.playerId, playerId),
          orderBy: (tests, { desc }) => [desc(tests.date)],
        });

        app.logger.info({ playerId, testCount: tests.length }, 'Fitness tests fetched');
        return tests;
      } catch (error) {
        app.logger.error({ err: error, playerId }, 'Failed to fetch fitness tests');
        throw error;
      }
    }
  );

  // POST /api/fitness-tests - Create fitness test
  app.fastify.post(
    '/api/fitness-tests',
    async (
      request: FastifyRequest<{
        Body: {
          playerId: string;
          testType: string;
          date: string;
          value?: number;
          unit?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { playerId, testType, date, value, unit } = request.body;
      app.logger.info(
        { userId: session.user.id, playerId, testType, date },
        'Creating fitness test'
      );

      try {
        const [test] = await app.db
          .insert(schema.fitnessTests)
          .values({
            playerId,
            testType,
            date,
            value: value ? value.toString() : undefined,
            unit,
          })
          .returning();

        app.logger.info(
          { fitnessTestId: test.id, testType },
          'Fitness test created successfully'
        );
        return test;
      } catch (error) {
        app.logger.error(
          { err: error, playerId, testType },
          'Failed to create fitness test'
        );
        throw error;
      }
    }
  );
}
