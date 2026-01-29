import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerFixtureRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/fixtures - Get fixtures for a team
  app.fastify.get(
    '/api/fixtures',
    async (
      request: FastifyRequest<{ Querystring: { teamId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId } = request.query;
      app.logger.info({ userId: session.user.id, teamId }, 'Fetching fixtures');

      try {
        const fixtures = await app.db.query.fixtures.findMany({
          where: eq(schema.fixtures.teamId, teamId),
          orderBy: (fixtures, { desc }) => [desc(fixtures.date)],
        });

        app.logger.info({ teamId, fixtureCount: fixtures.length }, 'Fixtures fetched');
        return fixtures;
      } catch (error) {
        app.logger.error({ err: error, teamId }, 'Failed to fetch fixtures');
        throw error;
      }
    }
  );

  // POST /api/fixtures - Create a fixture
  app.fastify.post(
    '/api/fixtures',
    async (
      request: FastifyRequest<{
        Body: {
          teamId: string;
          competitionId?: string;
          opponent: string;
          venue?: string;
          date: string;
          status?: 'scheduled' | 'in_progress' | 'completed';
          homeTeamName?: string;
          homeCrestUrl?: string;
          homeCrestImageUrl?: string;
          homeColours?: string;
          homeJerseyImageUrl?: string;
          awayTeamName?: string;
          awayCrestUrl?: string;
          awayCrestImageUrl?: string;
          awayColours?: string;
          awayJerseyImageUrl?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const {
        teamId,
        competitionId,
        opponent,
        venue,
        date,
        status,
        homeTeamName,
        homeCrestUrl,
        homeCrestImageUrl,
        homeColours,
        homeJerseyImageUrl,
        awayTeamName,
        awayCrestUrl,
        awayCrestImageUrl,
        awayColours,
        awayJerseyImageUrl,
      } = request.body;
      app.logger.info(
        { userId: session.user.id, teamId, competitionId, opponent, date },
        'Creating fixture'
      );

      try {
        const insertData: any = {
          teamId,
          opponent,
          venue,
          date: new Date(date),
          status: status || 'scheduled',
        };

        // Only include optional fields if provided
        if (competitionId) {
          insertData.competitionId = competitionId;
        }
        if (homeTeamName !== undefined) insertData.homeTeamName = homeTeamName;
        if (homeCrestUrl !== undefined) insertData.homeCrestUrl = homeCrestUrl;
        if (homeCrestImageUrl !== undefined) insertData.homeCrestImageUrl = homeCrestImageUrl;
        if (homeColours !== undefined) insertData.homeColours = homeColours;
        if (homeJerseyImageUrl !== undefined) insertData.homeJerseyImageUrl = homeJerseyImageUrl;
        if (awayTeamName !== undefined) insertData.awayTeamName = awayTeamName;
        if (awayCrestUrl !== undefined) insertData.awayCrestUrl = awayCrestUrl;
        if (awayCrestImageUrl !== undefined) insertData.awayCrestImageUrl = awayCrestImageUrl;
        if (awayColours !== undefined) insertData.awayColours = awayColours;
        if (awayJerseyImageUrl !== undefined) insertData.awayJerseyImageUrl = awayJerseyImageUrl;

        const [fixture] = await app.db
          .insert(schema.fixtures)
          .values(insertData)
          .returning();

        app.logger.info(
          { fixtureId: fixture.id, opponent, date, competitionId: fixture.competitionId },
          'Fixture created successfully'
        );
        return fixture;
      } catch (error) {
        app.logger.error(
          { err: error, teamId, competitionId, opponent },
          'Failed to create fixture'
        );
        throw error;
      }
    }
  );

  // GET /api/fixtures/:id - Get fixture details
  app.fastify.get(
    '/api/fixtures/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, fixtureId: id }, 'Fetching fixture details');

      try {
        const fixture = await app.db.query.fixtures.findFirst({
          where: eq(schema.fixtures.id, id),
          with: {
            team: true,
            competition: true,
            matchEvents: true,
            lineups: true,
          },
        });

        if (!fixture) {
          app.logger.warn({ fixtureId: id }, 'Fixture not found');
          return reply.status(404).send({ error: 'Fixture not found' });
        }

        app.logger.info({ fixtureId: id }, 'Fixture details fetched');
        return fixture;
      } catch (error) {
        app.logger.error({ err: error, fixtureId: id }, 'Failed to fetch fixture');
        throw error;
      }
    }
  );

  // PUT /api/fixtures/:id - Update fixture
  app.fastify.put(
    '/api/fixtures/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          opponent: string;
          venue?: string;
          date: string;
          competitionId?: string;
          status?: 'scheduled' | 'in_progress' | 'completed';
          homeTeamName?: string;
          homeCrestUrl?: string;
          homeCrestImageUrl?: string;
          homeColours?: string;
          homeJerseyImageUrl?: string;
          awayTeamName?: string;
          awayCrestUrl?: string;
          awayCrestImageUrl?: string;
          awayColours?: string;
          awayJerseyImageUrl?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const {
        opponent,
        venue,
        date,
        competitionId,
        status,
        homeTeamName,
        homeCrestUrl,
        homeCrestImageUrl,
        homeColours,
        homeJerseyImageUrl,
        awayTeamName,
        awayCrestUrl,
        awayCrestImageUrl,
        awayColours,
        awayJerseyImageUrl,
      } = request.body;

      app.logger.info({ userId: session.user.id, fixtureId: id }, 'Updating fixture');

      try {
        // Fetch the fixture to verify it exists and get team info
        const fixture = await app.db.query.fixtures.findFirst({
          where: eq(schema.fixtures.id, id),
          with: {
            team: true,
          },
        });

        if (!fixture) {
          app.logger.warn({ fixtureId: id }, 'Fixture not found');
          return reply.status(404).send({ error: 'Fixture not found' });
        }

        // Check permissions: user must be COACH or CLUB_ADMIN for the team's club
        const membership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, fixture.team.clubId),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!membership || !['COACH', 'CLUB_ADMIN'].includes(membership.role)) {
          app.logger.warn({ fixtureId: id, userId: session.user.id }, 'Unauthorized fixture update');
          return reply
            .status(403)
            .send({ error: 'Only COACH or CLUB_ADMIN can update fixtures' });
        }

        // Validate required fields
        if (!opponent || opponent.trim() === '') {
          app.logger.warn({ fixtureId: id }, 'Opponent is required');
          return reply.status(400).send({ error: 'Opponent is required' });
        }

        if (!date || date.trim() === '') {
          app.logger.warn({ fixtureId: id }, 'Date is required');
          return reply.status(400).send({ error: 'Date is required' });
        }

        // Validate date format
        let parsedDate: Date;
        try {
          parsedDate = new Date(date);
          if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid date');
          }
        } catch {
          app.logger.warn({ fixtureId: id, date }, 'Invalid date format');
          return reply.status(400).send({ error: 'Invalid date format. Use ISO 8601 format' });
        }

        const updateData: any = {
          opponent: opponent.trim(),
          date: parsedDate,
        };

        if (venue !== undefined) updateData.venue = venue;
        if (competitionId !== undefined) updateData.competitionId = competitionId;
        if (status !== undefined) updateData.status = status;
        if (homeTeamName !== undefined) updateData.homeTeamName = homeTeamName;
        if (homeCrestUrl !== undefined) updateData.homeCrestUrl = homeCrestUrl;
        if (homeCrestImageUrl !== undefined) updateData.homeCrestImageUrl = homeCrestImageUrl;
        if (homeColours !== undefined) updateData.homeColours = homeColours;
        if (homeJerseyImageUrl !== undefined) updateData.homeJerseyImageUrl = homeJerseyImageUrl;
        if (awayTeamName !== undefined) updateData.awayTeamName = awayTeamName;
        if (awayCrestUrl !== undefined) updateData.awayCrestUrl = awayCrestUrl;
        if (awayCrestImageUrl !== undefined) updateData.awayCrestImageUrl = awayCrestImageUrl;
        if (awayColours !== undefined) updateData.awayColours = awayColours;
        if (awayJerseyImageUrl !== undefined) updateData.awayJerseyImageUrl = awayJerseyImageUrl;

        const [updated] = await app.db
          .update(schema.fixtures)
          .set(updateData)
          .where(eq(schema.fixtures.id, id))
          .returning();

        app.logger.info(
          { fixtureId: id, opponent: updated.opponent, date: updated.date },
          'Fixture updated successfully'
        );
        return updated;
      } catch (error) {
        app.logger.error({ err: error, fixtureId: id }, 'Failed to update fixture');
        throw error;
      }
    }
  );

  // DELETE /api/fixtures/:id - Delete a fixture and all related data
  app.fastify.delete(
    '/api/fixtures/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, fixtureId: id }, 'Deleting fixture');

      try {
        // Fetch the fixture to verify it exists and get team info
        const fixture = await app.db.query.fixtures.findFirst({
          where: eq(schema.fixtures.id, id),
          with: {
            team: true,
          },
        });

        if (!fixture) {
          app.logger.warn({ fixtureId: id }, 'Fixture not found');
          return reply.status(404).send({ error: 'Fixture not found' });
        }

        // Check permissions: user must be COACH or CLUB_ADMIN for the team's club
        const membership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, fixture.team.clubId),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!membership || !['COACH', 'CLUB_ADMIN'].includes(membership.role)) {
          app.logger.warn({ fixtureId: id, userId: session.user.id }, 'Unauthorized fixture deletion');
          return reply
            .status(403)
            .send({ error: 'Only COACH or CLUB_ADMIN can delete fixtures' });
        }

        // Delete fixture (cascade will delete match_events, match_state, match_squads, lineups, etc.)
        await app.db
          .delete(schema.fixtures)
          .where(eq(schema.fixtures.id, id));

        app.logger.info(
          { fixtureId: id, opponent: fixture.opponent },
          'Fixture deleted successfully'
        );
        return { success: true, message: 'Fixture deleted successfully' };
      } catch (error) {
        app.logger.error({ err: error, fixtureId: id }, 'Failed to delete fixture');
        throw error;
      }
    }
  );

  // GET /api/fixtures/:id/stats - Get fixture stats
  app.fastify.get(
    '/api/fixtures/:id/stats',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, fixtureId: id }, 'Fetching fixture stats');

      try {
        const events = await app.db.query.matchEvents.findMany({
          where: eq(schema.matchEvents.fixtureId, id),
        });

        // Aggregate stats
        const totalEvents = events.length;
        const eventsByType: Record<string, number> = {};
        const eventsByPlayer: Record<string, number> = {};
        const scoringSummary: Record<string, number> = {};

        events.forEach((event) => {
          eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;

          if (event.playerId) {
            eventsByPlayer[event.playerId] = (eventsByPlayer[event.playerId] || 0) + 1;
          }

          if (event.eventCategory === 'Scoring') {
            scoringSummary[event.eventType] = (scoringSummary[event.eventType] || 0) + 1;
          }
        });

        const stats = {
          totalEvents,
          eventsByType,
          eventsByPlayer,
          scoringSummary,
        };

        app.logger.info({ fixtureId: id, totalEvents }, 'Fixture stats fetched');
        return stats;
      } catch (error) {
        app.logger.error({ err: error, fixtureId: id }, 'Failed to fetch fixture stats');
        throw error;
      }
    }
  );

  // GET /api/teams/:teamId/fixtures - Get upcoming fixtures for a team
  app.fastify.get(
    '/api/teams/:teamId/fixtures',
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
      const parsedLimit = limit ? Math.min(parseInt(limit), 100) : 5;

      app.logger.info(
        { userId: session.user.id, teamId, from, limit: parsedLimit },
        'Fetching upcoming fixtures'
      );

      try {
        let fixtures = await app.db.query.fixtures.findMany({
          where: eq(schema.fixtures.teamId, teamId),
          orderBy: (fixtures, { asc }) => [asc(fixtures.date)],
        });

        // Filter for upcoming fixtures if from=now
        if (from === 'now') {
          const now = new Date();
          fixtures = fixtures.filter((f) => f.date >= now);
        }

        // Apply limit
        fixtures = fixtures.slice(0, parsedLimit);

        app.logger.info({ teamId, fixtureCount: fixtures.length }, 'Upcoming fixtures fetched');
        return fixtures;
      } catch (error) {
        app.logger.error({ err: error, teamId }, 'Failed to fetch upcoming fixtures');
        throw error;
      }
    }
  );
}
