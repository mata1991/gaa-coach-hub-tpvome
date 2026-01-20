import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

function generateWhatsAppReport(fixtureId: string, report: any): string {
  const {
    opponent,
    date,
    venue,
    teamTotals,
    playerStats,
  } = report;

  const formattedDate = new Date(date).toLocaleDateString('en-IE', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  let message = `🏑 *Match Summary*\n`;
  message += `📅 ${formattedDate}\n`;
  message += `🎯 vs ${opponent}\n`;
  if (venue) {
    message += `📍 ${venue}\n`;
  }
  message += `\n`;

  message += `*Team Totals*\n`;
  message += `⚽ Goals: ${teamTotals.goals}\n`;
  message += `📍 Points: ${teamTotals.points}\n`;
  message += `🎪 Wides: ${teamTotals.wides}\n`;
  message += `📊 Total Score: ${teamTotals.totalScore}\n`;
  message += `✅ Conversion Rate: ${teamTotals.conversionRate.toFixed(1)}%\n`;
  message += `🥊 Puckout Win %: ${teamTotals.puckoutWinPercentage.toFixed(1)}%\n`;
  message += `🔄 Turnover Differential: ${teamTotals.turnoverDifferential}\n`;
  message += `📞 Frees For: ${teamTotals.freesFor}\n`;
  message += `📞 Frees Against: ${teamTotals.freesAgainst}\n`;
  message += `\n`;

  if (playerStats.length > 0) {
    message += `*Top Performers*\n`;
    playerStats.slice(0, 5).forEach((player: any, i: number) => {
      message += `${i + 1}. ${player.playerName}: ${player.contributions} contributions (${player.efficiency.toFixed(1)}%)\n`;
    });
  }

  return message;
}

function generateCSVReport(events: any[]): string {
  const headers = [
    'Timestamp (s)',
    'Event Type',
    'Category',
    'Player',
    'Outcome',
    'Zone',
    'Notes',
  ];

  let csv = headers.join(',') + '\n';

  events.forEach((event) => {
    const row = [
      event.timestamp,
      event.eventType,
      event.eventCategory,
      event.playerId || '',
      event.outcome || '',
      event.zone || '',
      event.notes ? `"${event.notes.replace(/"/g, '""')}"` : '',
    ];
    csv += row.join(',') + '\n';
  });

  return csv;
}

export function registerExportRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/fixtures/:id/export/whatsapp - Generate WhatsApp-friendly text summary
  app.fastify.post(
    '/api/fixtures/:id/export/whatsapp',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, fixtureId: id }, 'Generating WhatsApp export');

      try {
        // Fetch fixture with match events
        const fixture = await app.db.query.fixtures.findFirst({
          where: eq(schema.fixtures.id, id),
          with: {
            team: true,
            matchEvents: true,
          },
        });

        if (!fixture) {
          app.logger.warn({ fixtureId: id }, 'Fixture not found for WhatsApp export');
          return reply.status(404).send({ error: 'Fixture not found' });
        }

        // Fetch players
        const players = await app.db.query.players.findMany({
          where: eq(schema.players.teamId, fixture.teamId),
        });

        const playerMap = new Map(players.map((p) => [p.id, p]));

        // Build report data
        const reportData = {
          opponent: fixture.opponent,
          date: fixture.date,
          venue: fixture.venue,
          teamTotals: {
            goals: 0,
            points: 0,
            wides: 0,
            totalScore: 0,
            conversionRate: 0,
            puckoutWinPercentage: 0,
            turnoverDifferential: 0,
            freesFor: 0,
            freesAgainst: 0,
          },
          playerStats: [] as any[],
        };

        // Calculate totals
        let goals = 0,
          points = 0,
          wides = 0;
        let puckoutsWon = 0,
          puckoutsLost = 0;
        let turnoversWon = 0,
          turnoversLost = 0;
        const playerContributions: Record<string, any> = {};

        fixture.matchEvents.forEach((event) => {
          if (event.eventCategory === 'Scoring') {
            if (event.eventType === 'Goal') goals++;
            else if (event.eventType === 'Point') points++;
            else if (event.eventType === 'Wide') wides++;
          } else if (event.eventCategory === 'Puckouts') {
            if (event.eventType === 'Won Clean' || event.eventType === 'Broken Won')
              puckoutsWon++;
            else if (event.eventType === 'Lost') puckoutsLost++;
          } else if (event.eventCategory === 'Possession') {
            if (event.eventType === 'Turnover Won') turnoversWon++;
            else if (event.eventType === 'Turnover Lost') turnoversLost++;
          }

          if (event.playerId && playerMap.has(event.playerId)) {
            const player = playerMap.get(event.playerId)!;
            if (!playerContributions[event.playerId]) {
              playerContributions[event.playerId] = {
                playerId: event.playerId,
                playerName: player.name,
                contributions: 0,
                efficiency: 0,
              };
            }
            playerContributions[event.playerId].contributions++;
          }
        });

        reportData.teamTotals.goals = goals;
        reportData.teamTotals.points = points;
        reportData.teamTotals.wides = wides;
        reportData.teamTotals.totalScore = goals * 3 + points;
        const totalShots = goals + points + wides;
        reportData.teamTotals.conversionRate =
          totalShots > 0 ? ((goals * 3 + points) / totalShots / 3) * 100 : 0;
        const puckoutTotal = puckoutsWon + puckoutsLost;
        reportData.teamTotals.puckoutWinPercentage =
          puckoutTotal > 0 ? (puckoutsWon / puckoutTotal) * 100 : 0;
        reportData.teamTotals.turnoverDifferential = turnoversWon - turnoversLost;

        reportData.playerStats = Object.values(playerContributions).sort(
          (a: any, b: any) => b.contributions - a.contributions
        );

        const whatsappText = generateWhatsAppReport(id, reportData);

        app.logger.info({ fixtureId: id }, 'WhatsApp export generated');
        return { text: whatsappText };
      } catch (error) {
        app.logger.error({ err: error, fixtureId: id }, 'Failed to generate WhatsApp export');
        throw error;
      }
    }
  );

  // POST /api/fixtures/:id/export/pdf - Generate PDF report (return URL stub)
  app.fastify.post(
    '/api/fixtures/:id/export/pdf',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, fixtureId: id }, 'Generating PDF export');

      try {
        // Fetch fixture
        const fixture = await app.db.query.fixtures.findFirst({
          where: eq(schema.fixtures.id, id),
        });

        if (!fixture) {
          app.logger.warn({ fixtureId: id }, 'Fixture not found for PDF export');
          return reply.status(404).send({ error: 'Fixture not found' });
        }

        // Stub: Return a URL that would be generated by a PDF service
        const pdfUrl = `/api/fixtures/${id}/pdf-report.pdf`;

        app.logger.info({ fixtureId: id, pdfUrl }, 'PDF export generated');
        return {
          url: pdfUrl,
          message: 'PDF report generated successfully',
          note: 'In production, use a service like Puppeteer or PDFKit to generate the actual PDF',
        };
      } catch (error) {
        app.logger.error({ err: error, fixtureId: id }, 'Failed to generate PDF export');
        throw error;
      }
    }
  );

  // GET /api/fixtures/:id/export/csv - Export match events as CSV
  app.fastify.get(
    '/api/fixtures/:id/export/csv',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, fixtureId: id }, 'Exporting match events CSV');

      try {
        // Fetch fixture with events
        const fixture = await app.db.query.fixtures.findFirst({
          where: eq(schema.fixtures.id, id),
          with: {
            matchEvents: true,
          },
        });

        if (!fixture) {
          app.logger.warn({ fixtureId: id }, 'Fixture not found for CSV export');
          return reply.status(404).send({ error: 'Fixture not found' });
        }

        const csv = generateCSVReport(fixture.matchEvents);

        reply.header('Content-Type', 'text/csv');
        reply.header(
          'Content-Disposition',
          `attachment; filename="match-events-${id}-${Date.now()}.csv"`
        );

        app.logger.info(
          { fixtureId: id, eventCount: fixture.matchEvents.length },
          'Match events CSV exported'
        );
        return csv;
      } catch (error) {
        app.logger.error({ err: error, fixtureId: id }, 'Failed to export match events CSV');
        throw error;
      }
    }
  );

  // GET /api/teams/:teamId/export/csv - Export season summary as CSV
  app.fastify.get(
    '/api/teams/:teamId/export/csv',
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
        'Exporting season summary CSV'
      );

      try {
        // Fetch fixtures for the team in the season
        const fixtures = await app.db.query.fixtures.findMany({
          where: eq(schema.fixtures.teamId, teamId),
          with: {
            competition: true,
            matchEvents: true,
          },
        });

        // Filter by season
        const seasonFixtures = fixtures.filter((f) => f.competition.seasonId === seasonId);

        // Generate CSV
        const headers = [
          'Date',
          'Opponent',
          'Venue',
          'Competition',
          'Goals',
          'Points',
          'Total Score',
          'Wides',
          'Conversion Rate %',
          'Puckout Win %',
          'Turnover Differential',
        ];

        let csv = headers.join(',') + '\n';

        seasonFixtures.forEach((fixture) => {
          let goals = 0,
            points = 0,
            wides = 0;
          let puckoutsWon = 0,
            puckoutsLost = 0;
          let turnoversWon = 0,
            turnoversLost = 0;

          fixture.matchEvents.forEach((event) => {
            if (event.eventCategory === 'Scoring') {
              if (event.eventType === 'Goal') goals++;
              else if (event.eventType === 'Point') points++;
              else if (event.eventType === 'Wide') wides++;
            } else if (event.eventCategory === 'Puckouts') {
              if (event.eventType === 'Won Clean' || event.eventType === 'Broken Won')
                puckoutsWon++;
              else if (event.eventType === 'Lost') puckoutsLost++;
            } else if (event.eventCategory === 'Possession') {
              if (event.eventType === 'Turnover Won') turnoversWon++;
              else if (event.eventType === 'Turnover Lost') turnoversLost++;
            }
          });

          const totalScore = goals * 3 + points;
          const totalShots = goals + points + wides;
          const conversionRate =
            totalShots > 0 ? ((goals * 3 + points) / totalShots / 3) * 100 : 0;
          const puckoutTotal = puckoutsWon + puckoutsLost;
          const puckoutWinPercentage =
            puckoutTotal > 0 ? (puckoutsWon / puckoutTotal) * 100 : 0;
          const turnoverDifferential = turnoversWon - turnoversLost;

          const row = [
            new Date(fixture.date).toLocaleDateString('en-IE'),
            fixture.opponent,
            fixture.venue || '',
            fixture.competition.type,
            goals,
            points,
            totalScore,
            wides,
            conversionRate.toFixed(1),
            puckoutWinPercentage.toFixed(1),
            turnoverDifferential,
          ];
          csv += row.join(',') + '\n';
        });

        reply.header('Content-Type', 'text/csv');
        reply.header(
          'Content-Disposition',
          `attachment; filename="season-summary-${teamId}-${Date.now()}.csv"`
        );

        app.logger.info(
          { teamId, seasonId, fixtureCount: seasonFixtures.length },
          'Season summary CSV exported'
        );
        return csv;
      } catch (error) {
        app.logger.error(
          { err: error, teamId, seasonId },
          'Failed to export season summary CSV'
        );
        throw error;
      }
    }
  );
}
