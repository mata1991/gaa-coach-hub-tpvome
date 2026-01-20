import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

interface MatchReport {
  fixtureId: string;
  opponent: string;
  date: Date;
  venue: string | null;
  status: string;
  teamTotals: {
    goals: number;
    points: number;
    wides: number;
    totalScore: number;
    conversionRate: number;
    puckoutWinPercentage: number;
    puckoutDirections: Record<string, number>;
    turnoverDifferential: number;
    freesFor: number;
    freesAgainst: number;
    freesConversionRate: number;
  };
  playerStats: Array<{
    playerId: string;
    playerName: string;
    contributions: number;
    goals: number;
    points: number;
    wides: number;
    turnoversWon: number;
    turnoversLost: number;
    fouls: number;
    efficiency: number;
  }>;
  quarterBreakdown: Array<{
    quarter: number;
    goals: number;
    points: number;
    wides: number;
  }>;
  shotHeatmap: Record<string, number>;
  puckoutHeatmap: Record<string, number>;
}

function calculateQuarter(timestamp: number): number {
  const quarterDuration = (70 * 60) / 4; // 70 minutes divided into 4 quarters
  return Math.floor(timestamp / quarterDuration) + 1;
}

export function registerReportRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/fixtures/:id/report - Generate match report
  app.fastify.get(
    '/api/fixtures/:id/report',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, fixtureId: id }, 'Generating match report');

      try {
        // Fetch fixture
        const fixture = await app.db.query.fixtures.findFirst({
          where: eq(schema.fixtures.id, id),
          with: {
            team: true,
            competition: true,
            matchEvents: true,
          },
        });

        if (!fixture) {
          app.logger.warn({ fixtureId: id }, 'Fixture not found');
          return reply.status(404).send({ error: 'Fixture not found' });
        }

        // Fetch all players for the team to build player lookup
        const players = await app.db.query.players.findMany({
          where: eq(schema.players.teamId, fixture.teamId),
        });

        const playerMap = new Map(players.map((p) => [p.id, p]));

        // Calculate team totals
        const events = fixture.matchEvents;
        let goals = 0;
        let points = 0;
        let wides = 0;
        let puckoutsWon = 0;
        let puckoutsLost = 0;
        let turnoversWon = 0;
        let turnoversLost = 0;
        let freesFor = 0;
        let freesAgainst = 0;
        let freesConverted = 0;

        const puckoutDirections: Record<string, number> = {};
        const playerContributions: Record<
          string,
          {
            name: string;
            contributions: number;
            goals: number;
            points: number;
            wides: number;
            turnoversWon: number;
            turnoversLost: number;
            fouls: number;
          }
        > = {};
        const shotHeatmap: Record<string, number> = {};
        const puckoutHeatmap: Record<string, number> = {};
        const quarterBreakdown: Record<number, { goals: number; points: number; wides: number }> =
          {};

        // Initialize quarters
        for (let i = 1; i <= 4; i++) {
          quarterBreakdown[i] = { goals: 0, points: 0, wides: 0 };
        }

        // Process events
        events.forEach((event) => {
          const quarter = calculateQuarter(event.timestamp);

          if (event.eventCategory === 'Scoring') {
            if (event.eventType === 'Goal') {
              goals++;
              quarterBreakdown[quarter].goals++;
              if (event.playerId && playerMap.has(event.playerId)) {
                const name = playerMap.get(event.playerId)!.name;
                if (!playerContributions[event.playerId]) {
                  playerContributions[event.playerId] = {
                    name,
                    contributions: 0,
                    goals: 0,
                    points: 0,
                    wides: 0,
                    turnoversWon: 0,
                    turnoversLost: 0,
                    fouls: 0,
                  };
                }
                playerContributions[event.playerId].goals++;
                playerContributions[event.playerId].contributions++;
              }
            } else if (event.eventType === 'Point') {
              points++;
              quarterBreakdown[quarter].points++;
              if (event.playerId && playerMap.has(event.playerId)) {
                const name = playerMap.get(event.playerId)!.name;
                if (!playerContributions[event.playerId]) {
                  playerContributions[event.playerId] = {
                    name,
                    contributions: 0,
                    goals: 0,
                    points: 0,
                    wides: 0,
                    turnoversWon: 0,
                    turnoversLost: 0,
                    fouls: 0,
                  };
                }
                playerContributions[event.playerId].points++;
                playerContributions[event.playerId].contributions++;
              }
            } else if (event.eventType === 'Wide') {
              wides++;
              quarterBreakdown[quarter].wides++;
            } else if (event.eventType === 'Free Converted') {
              freesConverted++;
              if (event.playerId && playerMap.has(event.playerId)) {
                const name = playerMap.get(event.playerId)!.name;
                if (!playerContributions[event.playerId]) {
                  playerContributions[event.playerId] = {
                    name,
                    contributions: 0,
                    goals: 0,
                    points: 0,
                    wides: 0,
                    turnoversWon: 0,
                    turnoversLost: 0,
                    fouls: 0,
                  };
                }
                playerContributions[event.playerId].contributions++;
              }
            }

            // Track shot heatmap
            if (event.zone) {
              shotHeatmap[event.zone] = (shotHeatmap[event.zone] || 0) + 1;
            }
          } else if (event.eventCategory === 'Puckouts') {
            if (event.eventType === 'Won Clean' || event.eventType === 'Broken Won') {
              puckoutsWon++;
            } else if (event.eventType === 'Lost') {
              puckoutsLost++;
            }
            if (event.zone) {
              puckoutHeatmap[event.zone] = (puckoutHeatmap[event.zone] || 0) + 1;
            }
            if (event.outcome) {
              puckoutDirections[event.outcome] = (puckoutDirections[event.outcome] || 0) + 1;
            }
          } else if (event.eventCategory === 'Possession') {
            if (event.eventType === 'Turnover Won') {
              turnoversWon++;
              if (event.playerId && playerMap.has(event.playerId)) {
                const name = playerMap.get(event.playerId)!.name;
                if (!playerContributions[event.playerId]) {
                  playerContributions[event.playerId] = {
                    name,
                    contributions: 0,
                    goals: 0,
                    points: 0,
                    wides: 0,
                    turnoversWon: 0,
                    turnoversLost: 0,
                    fouls: 0,
                  };
                }
                playerContributions[event.playerId].turnoversWon++;
                playerContributions[event.playerId].contributions++;
              }
            } else if (event.eventType === 'Turnover Lost') {
              turnoversLost++;
              if (event.playerId && playerMap.has(event.playerId)) {
                const name = playerMap.get(event.playerId)!.name;
                if (!playerContributions[event.playerId]) {
                  playerContributions[event.playerId] = {
                    name,
                    contributions: 0,
                    goals: 0,
                    points: 0,
                    wides: 0,
                    turnoversWon: 0,
                    turnoversLost: 0,
                    fouls: 0,
                  };
                }
                playerContributions[event.playerId].turnoversLost++;
              }
            }
          } else if (event.eventCategory === 'Discipline') {
            if (event.playerId && playerMap.has(event.playerId)) {
              const name = playerMap.get(event.playerId)!.name;
              if (!playerContributions[event.playerId]) {
                playerContributions[event.playerId] = {
                  name,
                  contributions: 0,
                  goals: 0,
                  points: 0,
                  wides: 0,
                  turnoversWon: 0,
                  turnoversLost: 0,
                  fouls: 0,
                };
              }
              playerContributions[event.playerId].fouls++;
            }
          }
        });

        // Calculate derived metrics
        const totalShots = goals + points + wides;
        const conversionRate = totalShots > 0 ? ((goals * 3 + points) / totalShots / 3) * 100 : 0;
        const puckoutTotal = puckoutsWon + puckoutsLost;
        const puckoutWinPercentage = puckoutTotal > 0 ? (puckoutsWon / puckoutTotal) * 100 : 0;
        const turnoverDifferential = turnoversWon - turnoversLost;
        const freesTotal = freesFor + freesAgainst;
        const freesConversionRate = freesFor > 0 ? (freesConverted / freesFor) * 100 : 0;

        // Build player stats array
        const playerStats = Object.entries(playerContributions).map(([playerId, stats]) => ({
          playerId,
          playerName: stats.name,
          contributions: stats.contributions,
          goals: stats.goals,
          points: stats.points,
          wides: stats.wides,
          turnoversWon: stats.turnoversWon,
          turnoversLost: stats.turnoversLost,
          fouls: stats.fouls,
          efficiency: stats.contributions > 0 ? (stats.contributions / events.length) * 100 : 0,
        }));

        // Build report
        const report: MatchReport = {
          fixtureId: fixture.id,
          opponent: fixture.opponent,
          date: fixture.date,
          venue: fixture.venue,
          status: fixture.status,
          teamTotals: {
            goals,
            points,
            wides,
            totalScore: goals * 3 + points,
            conversionRate,
            puckoutWinPercentage,
            puckoutDirections,
            turnoverDifferential,
            freesFor,
            freesAgainst,
            freesConversionRate,
          },
          playerStats: playerStats.sort((a, b) => b.contributions - a.contributions),
          quarterBreakdown: Object.entries(quarterBreakdown).map(([q, data]) => ({
            quarter: parseInt(q),
            ...data,
          })),
          shotHeatmap,
          puckoutHeatmap,
        };

        app.logger.info({ fixtureId: id, goals, points, wides }, 'Match report generated');
        return report;
      } catch (error) {
        app.logger.error({ err: error, fixtureId: id }, 'Failed to generate match report');
        throw error;
      }
    }
  );
}
