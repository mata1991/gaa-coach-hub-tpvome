import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';
import type { App } from '../index.js';

// Sport normalization mapping
const SPORT_MAP: Record<string, string> = {
  hurling: 'HURLING',
  'hurling ': 'HURLING',
  camogie: 'CAMOGIE',
  'camogie ': 'CAMOGIE',
  'gaelic football': 'GAELIC_FOOTBALL',
  'gaelic football ': 'GAELIC_FOOTBALL',
  'ladies gaelic football': 'LADIES_GAELIC_FOOTBALL',
  'ladies gaelic football ': 'LADIES_GAELIC_FOOTBALL',
};

function normalizeSport(sport: string | undefined): string | undefined {
  if (!sport) return undefined;

  const trimmed = sport.trim();
  const lower = trimmed.toLowerCase();

  // Check if already normalized
  if (['HURLING', 'CAMOGIE', 'GAELIC_FOOTBALL', 'LADIES_GAELIC_FOOTBALL'].includes(trimmed)) {
    return trimmed;
  }

  // Check mapping
  return SPORT_MAP[lower] || undefined;
}

export function registerTeamsV2Routes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/teams - Get teams accessible to user
  app.fastify.get(
    '/api/teams',
    async (
      request: FastifyRequest<{
        Querystring: { clubId?: string; includeArchived?: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { clubId, includeArchived } = request.query;
      const showArchived = includeArchived === 'true';

      app.logger.info(
        { userId: session.user.id, clubId, showArchived },
        'Fetching teams'
      );

      try {
        let teams: any[] = [];

        if (clubId) {
          // Check if user has access to this club via membership
          const membership = await app.db.query.memberships.findFirst({
            where: and(
              eq(schema.memberships.clubId, clubId),
              eq(schema.memberships.userId, session.user.id)
            ),
          });

          if (!membership) {
            app.logger.warn(
              { userId: session.user.id, clubId },
              'User does not have access to this club'
            );
            return reply.status(403).send({ error: 'You do not have access to this club' });
          }

          // Fetch teams for this club
          teams = await app.db.query.teams.findMany({
            where: showArchived
              ? eq(schema.teams.clubId, clubId)
              : and(
                  eq(schema.teams.clubId, clubId),
                  eq(schema.teams.isArchived, false)
                ),
          });
        } else {
          // Get all clubs user has access to, then fetch teams for those clubs
          const userMemberships = await app.db.query.memberships.findMany({
            where: eq(schema.memberships.userId, session.user.id),
            columns: { clubId: true },
          });

          const clubIds = userMemberships.map((m) => m.clubId);

          if (clubIds.length === 0) {
            app.logger.info({ userId: session.user.id }, 'User has no club memberships');
            return [];
          }

          // Fetch teams from all accessible clubs
          teams = await app.db.query.teams.findMany({
            where: showArchived
              ? inArray(schema.teams.clubId, clubIds)
              : and(
                  inArray(schema.teams.clubId, clubIds),
                  eq(schema.teams.isArchived, false)
                ),
          });
        }

        app.logger.info({ userId: session.user.id, clubId, teamCount: teams.length }, 'Teams fetched');
        return teams;
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, clubId }, 'Failed to fetch teams');
        throw error;
      }
    }
  );

  // POST /api/teams - Create team (updated)
  app.fastify.post(
    '/api/teams',
    async (
      request: FastifyRequest<{
        Body: {
          clubId: string;
          name: string;
          shortName?: string;
          sport?: string;
          grade?: string;
          ageGroup?: string;
          homeVenue?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { clubId, name, shortName, sport, grade, ageGroup, homeVenue } = request.body;
      app.logger.info({ userId: session.user.id, clubId, name }, 'Creating team');

      try {
        // Validate required fields
        if (!name || name.trim() === '') {
          app.logger.warn({ clubId, userId: session.user.id }, 'Team name is required');
          return reply.status(400).send({ error: 'Team name is required' });
        }

        if (!clubId) {
          app.logger.warn({ userId: session.user.id }, 'Club ID is required');
          return reply.status(400).send({ error: 'Club ID is required' });
        }

        // Verify club exists
        const club = await app.db.query.clubs.findFirst({
          where: eq(schema.clubs.id, clubId),
        });

        if (!club) {
          app.logger.warn({ clubId }, 'Club not found');
          return reply.status(404).send({ error: 'Club not found' });
        }

        // Check if user is CLUB_ADMIN or COACH
        const membership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, clubId),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!membership || !['CLUB_ADMIN', 'COACH'].includes(membership.role)) {
          app.logger.warn({ clubId, userId: session.user.id }, 'Unauthorized team creation');
          return reply
            .status(403)
            .send({ error: 'Only CLUB_ADMIN or COACH can create teams' });
        }

        // Normalize sport
        const normalizedSport = normalizeSport(sport);

        const [team] = await app.db
          .insert(schema.teams)
          .values({
            clubId,
            name: name.trim(),
            shortName,
            sport: normalizedSport,
            grade,
            ageGroup,
            homeVenue,
          })
          .returning();

        app.logger.info({ teamId: team.id, name }, 'Team created successfully');
        return {
          id: team.id,
          clubId: team.clubId,
          name: team.name,
          shortName: team.shortName,
          sport: team.sport,
          grade: team.grade,
          ageGroup: team.ageGroup,
          homeVenue: team.homeVenue,
          isArchived: team.isArchived,
          createdAt: team.createdAt,
        };
      } catch (error) {
        app.logger.error({ err: error, clubId, name }, 'Failed to create team');
        throw error;
      }
    }
  );

  // PUT /api/teams/:id - Update team
  app.fastify.put(
    '/api/teams/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          name?: string;
          shortName?: string;
          sport?: string;
          grade?: string;
          ageGroup?: string;
          homeVenue?: string;
          isArchived?: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { name, shortName, sport, grade, ageGroup, homeVenue, isArchived } = request.body;

      app.logger.info({ userId: session.user.id, teamId: id }, 'Updating team');

      try {
        const team = await app.db.query.teams.findFirst({
          where: eq(schema.teams.id, id),
        });

        if (!team) {
          app.logger.warn({ teamId: id }, 'Team not found');
          return reply.status(404).send({ error: 'Team not found' });
        }

        // Check if user is CLUB_ADMIN or COACH
        const membership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, team.clubId),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!membership || !['CLUB_ADMIN', 'COACH'].includes(membership.role)) {
          app.logger.warn({ teamId: id, userId: session.user.id }, 'Unauthorized team update');
          return reply
            .status(403)
            .send({ error: 'Only CLUB_ADMIN or COACH can update teams' });
        }

        const updateData: any = {};
        if (name) updateData.name = name.trim();
        if (shortName !== undefined) updateData.shortName = shortName;
        if (sport !== undefined) updateData.sport = normalizeSport(sport);
        if (grade !== undefined) updateData.grade = grade;
        if (ageGroup !== undefined) updateData.ageGroup = ageGroup;
        if (homeVenue !== undefined) updateData.homeVenue = homeVenue;
        if (isArchived !== undefined) updateData.isArchived = isArchived;

        const [updated] = await app.db
          .update(schema.teams)
          .set(updateData)
          .where(eq(schema.teams.id, id))
          .returning();

        app.logger.info({ teamId: id }, 'Team updated successfully');
        return updated;
      } catch (error) {
        app.logger.error({ err: error, teamId: id }, 'Failed to update team');
        throw error;
      }
    }
  );

  // GET /api/teams/:id/dashboard - Get team dashboard
  app.fastify.get(
    '/api/teams/:id/dashboard',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, teamId: id }, 'Fetching team dashboard');

      try {
        const team = await app.db.query.teams.findFirst({
          where: eq(schema.teams.id, id),
          with: {
            club: true,
            players: true,
            fixtures: true,
          },
        });

        if (!team) {
          app.logger.warn({ teamId: id }, 'Team not found');
          return reply.status(404).send({ error: 'Team not found' });
        }

        // Check if user is a member of team or club
        const clubMembership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, team.clubId),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!clubMembership) {
          app.logger.warn({ teamId: id, userId: session.user.id }, 'User not a member');
          return reply.status(403).send({ error: 'You are not a member of this team or club' });
        }

        // Get upcoming and recent fixtures
        const now = new Date();
        const upcomingFixtures = team.fixtures
          .filter((f) => f.date > now)
          .sort((a, b) => a.date.getTime() - b.date.getTime())
          .slice(0, 5);

        const recentFixtures = team.fixtures
          .filter((f) => f.date <= now)
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 5);

        const dashboard = {
          team,
          playerCount: team.players.length,
          upcomingFixtures,
          recentFixtures,
          userRole: clubMembership.role,
        };

        app.logger.info({ teamId: id }, 'Team dashboard fetched');
        return dashboard;
      } catch (error) {
        app.logger.error({ err: error, teamId: id }, 'Failed to fetch team dashboard');
        throw error;
      }
    }
  );

  // GET /api/team-memberships - Get team members
  app.fastify.get(
    '/api/team-memberships',
    async (
      request: FastifyRequest<{ Querystring: { teamId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId } = request.query;
      app.logger.info({ userId: session.user.id, teamId }, 'Fetching team memberships');

      try {
        const team = await app.db.query.teams.findFirst({
          where: eq(schema.teams.id, teamId),
        });

        if (!team) {
          app.logger.warn({ teamId }, 'Team not found');
          return reply.status(404).send({ error: 'Team not found' });
        }

        // Check if user is a member of team or club
        const clubMembership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, team.clubId),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!clubMembership) {
          app.logger.warn({ teamId, userId: session.user.id }, 'User not a member of club');
          return reply.status(403).send({ error: 'You are not a member of this club' });
        }

        const teamMemberships = await app.db.query.teamMemberships.findMany({
          where: eq(schema.teamMemberships.teamId, teamId),
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        const members = teamMemberships.map((m) => ({
          id: m.id,
          teamId: m.teamId,
          userId: m.userId,
          role: m.role,
          userName: m.user?.name,
          userEmail: m.user?.email,
          createdAt: m.createdAt,
        }));

        app.logger.info({ teamId, memberCount: members.length }, 'Team memberships fetched');
        return members;
      } catch (error) {
        app.logger.error({ err: error, teamId }, 'Failed to fetch team memberships');
        throw error;
      }
    }
  );

  // POST /api/team-memberships - Add user to team
  app.fastify.post(
    '/api/team-memberships',
    async (
      request: FastifyRequest<{
        Body: {
          teamId: string;
          userId: string;
          role: 'COACH' | 'STATS_PERSON' | 'PLAYER';
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId, userId, role } = request.body;
      app.logger.info(
        { userId: session.user.id, teamId, targetUserId: userId, role },
        'Adding user to team'
      );

      try {
        const team = await app.db.query.teams.findFirst({
          where: eq(schema.teams.id, teamId),
        });

        if (!team) {
          app.logger.warn({ teamId }, 'Team not found');
          return reply.status(404).send({ error: 'Team not found' });
        }

        // Check if requester is CLUB_ADMIN or COACH
        const requesterMembership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, team.clubId),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!requesterMembership || !['CLUB_ADMIN', 'COACH'].includes(requesterMembership.role)) {
          app.logger.warn({ teamId, userId: session.user.id }, 'Unauthorized team membership');
          return reply
            .status(403)
            .send({ error: 'Only CLUB_ADMIN or COACH can add users to team' });
        }

        // Create team membership
        const [membership] = await app.db
          .insert(schema.teamMemberships)
          .values({
            teamId,
            userId,
            role,
          })
          .returning();

        app.logger.info(
          { membershipId: membership.id, teamId, userId, role },
          'User added to team'
        );
        return {
          id: membership.id,
          teamId: membership.teamId,
          userId: membership.userId,
          role: membership.role,
          createdAt: membership.createdAt,
        };
      } catch (error) {
        app.logger.error({ err: error, teamId, userId }, 'Failed to add user to team');
        throw error;
      }
    }
  );
}
