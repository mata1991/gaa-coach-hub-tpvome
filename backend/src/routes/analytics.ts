import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

interface SeasonTrend {
  fixtureId: string;
  date: Date;
  opponent: string;
  competitionType: string;
  goals: number;
  points: number;
  wides: number;
  conversionRate: number;
  puckoutWinPercentage: number;
  turnoverDifferential: number;
}

interface CompetitionComparison {
  league: {
    avgGoals: number;
    avgPoints: number;
    avgConversionRate: number;
    avgPuckoutWinPercentage: number;
    fixtureCount: number;
  };
  championship: {
    avgGoals: number;
    avgPoints: number;
    avgConversionRate: number;
    avgPuckoutWinPercentage: number;
    fixtureCount: number;
  };
}

interface SeasonDashboard {
  seasonId: string;
  teamId: string;
  trends: SeasonTrend[];
  competitionComparison: CompetitionComparison;
}

function calculateStats(events: any[]) {
  let goals = 0;
  let points = 0;
  let wides = 0;
  let puckoutsWon = 0;
  let puckoutsLost = 0;
  let turnoversWon = 0;
  let turnoversLost = 0;

  events.forEach((event) => {
    if (event.eventCategory === 'Scoring') {
      if (event.eventType === 'Goal') goals++;
      else if (event.eventType === 'Point') points++;
      else if (event.eventType === 'Wide') wides++;
    } else if (event.eventCategory === 'Puckouts') {
      if (event.eventType === 'Won Clean' || event.eventType === 'Broken Won') puckoutsWon++;
      else if (event.eventType === 'Lost') puckoutsLost++;
    } else if (event.eventCategory === 'Possession') {
      if (event.eventType === 'Turnover Won') turnoversWon++;
      else if (event.eventType === 'Turnover Lost') turnoversLost++;
    }
  });

  const totalShots = goals + points + wides;
  const conversionRate = totalShots > 0 ? ((goals * 3 + points) / totalShots / 3) * 100 : 0;
  const puckoutTotal = puckoutsWon + puckoutsLost;
  const puckoutWinPercentage = puckoutTotal > 0 ? (puckoutsWon / puckoutTotal) * 100 : 0;
  const turnoverDifferential = turnoversWon - turnoversLost;

  return {
    goals,
    points,
    wides,
    conversionRate,
    puckoutWinPercentage,
    turnoverDifferential,
  };
}

export function registerAnalyticsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/teams/:teamId/season-dashboard - Season trends and comparisons
  app.fastify.get(
    '/api/teams/:teamId/season-dashboard',
    async (
      request: FastifyRequest<{ Params: { teamId: string }; Querystring: { seasonId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId } = request.params;
      const { seasonId } = request.query;

      app.logger.info(
        { userId: session.user.id, teamId, seasonId },
        'Fetching season dashboard'
      );

      try {
        // Fetch all fixtures for the team in this season
        const fixtures = await app.db.query.fixtures.findMany({
          where: eq(schema.fixtures.teamId, teamId),
          with: {
            competition: true,
            matchEvents: true,
          },
        });

        // Filter by season
        const seasonFixtures = fixtures.filter((f) => f.competition.seasonId === seasonId);

        // Calculate trends
        const trends: SeasonTrend[] = seasonFixtures.map((fixture) => {
          const stats = calculateStats(fixture.matchEvents);
          return {
            fixtureId: fixture.id,
            date: fixture.date,
            opponent: fixture.opponent,
            competitionType: fixture.competition.type,
            ...stats,
          };
        });

        // Calculate competition comparison
        const leagueFixtures = seasonFixtures.filter((f) => f.competition.type === 'League');
        const championshipFixtures = seasonFixtures.filter(
          (f) => f.competition.type === 'Championship'
        );

        const leagueStats = {
          avgGoals: 0,
          avgPoints: 0,
          avgConversionRate: 0,
          avgPuckoutWinPercentage: 0,
          fixtureCount: leagueFixtures.length,
        };

        const championshipStats = {
          avgGoals: 0,
          avgPoints: 0,
          avgConversionRate: 0,
          avgPuckoutWinPercentage: 0,
          fixtureCount: championshipFixtures.length,
        };

        if (leagueFixtures.length > 0) {
          const leagueStats_ = leagueFixtures.map((f) => calculateStats(f.matchEvents));
          leagueStats.avgGoals = leagueStats_.reduce((sum, s) => sum + s.goals, 0) / leagueFixtures.length;
          leagueStats.avgPoints =
            leagueStats_.reduce((sum, s) => sum + s.points, 0) / leagueFixtures.length;
          leagueStats.avgConversionRate =
            leagueStats_.reduce((sum, s) => sum + s.conversionRate, 0) / leagueFixtures.length;
          leagueStats.avgPuckoutWinPercentage =
            leagueStats_.reduce((sum, s) => sum + s.puckoutWinPercentage, 0) / leagueFixtures.length;
        }

        if (championshipFixtures.length > 0) {
          const champStats_ = championshipFixtures.map((f) => calculateStats(f.matchEvents));
          championshipStats.avgGoals =
            champStats_.reduce((sum, s) => sum + s.goals, 0) / championshipFixtures.length;
          championshipStats.avgPoints =
            champStats_.reduce((sum, s) => sum + s.points, 0) / championshipFixtures.length;
          championshipStats.avgConversionRate =
            champStats_.reduce((sum, s) => sum + s.conversionRate, 0) / championshipFixtures.length;
          championshipStats.avgPuckoutWinPercentage =
            champStats_.reduce((sum, s) => sum + s.puckoutWinPercentage, 0) /
            championshipFixtures.length;
        }

        const dashboard: SeasonDashboard = {
          seasonId,
          teamId,
          trends: trends.sort((a, b) => b.date.getTime() - a.date.getTime()),
          competitionComparison: {
            league: leagueStats,
            championship: championshipStats,
          },
        };

        app.logger.info(
          { teamId, seasonId, fixtureCount: trends.length },
          'Season dashboard fetched'
        );
        return dashboard;
      } catch (error) {
        app.logger.error(
          { err: error, teamId, seasonId },
          'Failed to fetch season dashboard'
        );
        throw error;
      }
    }
  );

  // GET /api/fixtures/:id/benchmarks - Compare fixture stats to season averages
  app.fastify.get(
    '/api/fixtures/:id/benchmarks',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, fixtureId: id }, 'Fetching fixture benchmarks');

      try {
        // Fetch the fixture
        const fixture = await app.db.query.fixtures.findFirst({
          where: eq(schema.fixtures.id, id),
          with: {
            team: true,
            competition: {
              with: {
                season: true,
              },
            },
            matchEvents: true,
          },
        });

        if (!fixture) {
          app.logger.warn({ fixtureId: id }, 'Fixture not found');
          return reply.status(404).send({ error: 'Fixture not found' });
        }

        // Calculate fixture stats
        const fixtureStats = calculateStats(fixture.matchEvents);

        // Fetch all fixtures in the same season and competition type
        const allSeasonFixtures = await app.db.query.fixtures.findMany({
          where: eq(schema.fixtures.teamId, fixture.teamId),
          with: {
            competition: true,
            matchEvents: true,
          },
        });

        const competitionFixtures = allSeasonFixtures.filter(
          (f) =>
            f.competition.seasonId === fixture.competition.seasonId &&
            f.competition.type === fixture.competition.type &&
            f.id !== id
        );

        // Calculate competition averages
        const competitionStats_ = competitionFixtures.map((f) => calculateStats(f.matchEvents));
        const avgGoals =
          competitionStats_.length > 0
            ? competitionStats_.reduce((sum, s) => sum + s.goals, 0) / competitionStats_.length
            : 0;
        const avgPoints =
          competitionStats_.length > 0
            ? competitionStats_.reduce((sum, s) => sum + s.points, 0) / competitionStats_.length
            : 0;
        const avgConversionRate =
          competitionStats_.length > 0
            ? competitionStats_.reduce((sum, s) => sum + s.conversionRate, 0) /
              competitionStats_.length
            : 0;
        const avgPuckoutWinPercentage =
          competitionStats_.length > 0
            ? competitionStats_.reduce((sum, s) => sum + s.puckoutWinPercentage, 0) /
              competitionStats_.length
            : 0;

        // Flag notable changes
        const flags = [];
        const puckoutChange = fixtureStats.puckoutWinPercentage - avgPuckoutWinPercentage;
        if (Math.abs(puckoutChange) > 10) {
          flags.push({
            type: 'puckout_win_percentage',
            message: `Puckout win % ${puckoutChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(puckoutChange).toFixed(1)} points`,
            severity: puckoutChange > 0 ? 'positive' : 'warning',
          });
        }

        const wideChange = fixtureStats.wides - (avgGoals + avgPoints);
        if (wideChange > 2) {
          flags.push({
            type: 'wide_count',
            message: `Wide count spiked by ${wideChange.toFixed(1)} above average`,
            severity: 'warning',
          });
        }

        app.logger.info({ fixtureId: id, flagCount: flags.length }, 'Fixture benchmarks calculated');
        return {
          fixtureId: id,
          fixtureStats,
          seasonAverages: {
            avgGoals,
            avgPoints,
            avgConversionRate,
            avgPuckoutWinPercentage,
            fixtureCount: competitionFixtures.length,
          },
          comparisons: {
            goalsVariance: fixtureStats.goals - avgGoals,
            pointsVariance: fixtureStats.points - avgPoints,
            conversionVariance: fixtureStats.conversionRate - avgConversionRate,
            puckoutVariance: fixtureStats.puckoutWinPercentage - avgPuckoutWinPercentage,
          },
          flags,
        };
      } catch (error) {
        app.logger.error({ err: error, fixtureId: id }, 'Failed to fetch fixture benchmarks');
        throw error;
      }
    }
  );
}
