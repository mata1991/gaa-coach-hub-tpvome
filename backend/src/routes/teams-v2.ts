import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';
import type { App } from '../index.js';
import { isValidHexColor, isValidUrl } from '../utils/validation.js';

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

/**
 * Map team database record to API response with new colour structure
 * Handles backward compatibility with legacy fields
 */
function mapTeamToResponse(team: any) {
  // Use new fields if they exist, fall back to legacy fields
  const crestUri = team.crestUri || team.crestImageUrl || team.crestUrl || null;
  const jerseyUri = team.jerseyUri || team.jerseyImageUrl || null;

  const colours = {
    primary: team.coloursPrimary || team.primaryColor || '#000000',
    secondary: team.coloursSecondary || team.secondaryColor || '#FFFFFF',
    accent: team.coloursAccent || team.accentColor || null,
  };

  return {
    ...team,
    crestUri,
    jerseyUri,
    colours,
    // Remove legacy fields from response
    crestUrl: undefined,
    crestImageUrl: undefined,
    jerseyImageUrl: undefined,
    primaryColor: undefined,
    secondaryColor: undefined,
    accentColor: undefined,
  };
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
        return teams.map(mapTeamToResponse);
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, clubId }, 'Failed to fetch teams');
        throw error;
      }
    }
  );

  // GET /api/teams/:teamId - Get single team details
  app.fastify.get(
    '/api/teams/:teamId',
    async (request: FastifyRequest<{ Params: { teamId: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId } = request.params;
      app.logger.info({ userId: session.user.id, teamId }, 'Fetching team details');

      try {
        // Fetch the team
        const team = await app.db.query.teams.findFirst({
          where: eq(schema.teams.id, teamId),
        });

        if (!team) {
          app.logger.warn({ teamId }, 'Team not found');
          return reply.status(404).send({ error: 'Team not found' });
        }

        // Check if user has access to this team's club via membership
        const membership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, team.clubId),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!membership) {
          app.logger.warn(
            { userId: session.user.id, teamId, clubId: team.clubId },
            'User does not have access to this team'
          );
          return reply.status(403).send({ error: 'You do not have access to this team' });
        }

        app.logger.info({ teamId, name: team.name }, 'Team details fetched');
        return mapTeamToResponse(team);
      } catch (error) {
        app.logger.error({ err: error, teamId }, 'Failed to fetch team details');
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
          ageGroup?: string;
          homeVenue?: string;
          crestUri?: string | null;
          jerseyUri?: string | null;
          colours?: {
            primary?: string;
            secondary?: string;
            accent?: string | null;
          };
          // Legacy fields for backward compatibility
          shortName?: string;
          sport?: string;
          grade?: string;
          crestUrl?: string;
          primaryColor?: string;
          secondaryColor?: string;
          accentColor?: string;
          isArchived?: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { name, ageGroup, homeVenue, crestUri, jerseyUri, colours, ...legacyFields } = request.body;

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

        // Update basic fields
        if (name) updateData.name = name.trim();
        if (ageGroup !== undefined) updateData.ageGroup = ageGroup;
        if (homeVenue !== undefined) updateData.homeVenue = homeVenue;

        // Handle new colour structure
        if (colours) {
          if (colours.primary !== undefined) {
            if (colours.primary && !isValidHexColor(colours.primary)) {
              app.logger.warn({ teamId: id, primary: colours.primary }, 'Invalid colours.primary format');
              return reply.status(400).send({ error: 'colours.primary must be a valid hex color (#RRGGBB)' });
            }
            updateData.coloursPrimary = colours.primary;
          }

          if (colours.secondary !== undefined) {
            if (colours.secondary && !isValidHexColor(colours.secondary)) {
              app.logger.warn({ teamId: id, secondary: colours.secondary }, 'Invalid colours.secondary format');
              return reply.status(400).send({ error: 'colours.secondary must be a valid hex color (#RRGGBB)' });
            }
            updateData.coloursSecondary = colours.secondary;
          }

          if (colours.accent !== undefined) {
            if (colours.accent && !isValidHexColor(colours.accent)) {
              app.logger.warn({ teamId: id, accent: colours.accent }, 'Invalid colours.accent format');
              return reply.status(400).send({ error: 'colours.accent must be a valid hex color (#RRGGBB)' });
            }
            updateData.coloursAccent = colours.accent;
          }
        }

        // Handle image URIs
        if (crestUri !== undefined) {
          if (crestUri && !isValidUrl(crestUri)) {
            app.logger.warn({ teamId: id, crestUri }, 'Invalid crestUri format');
            return reply.status(400).send({ error: 'crestUri must be a valid URL or null' });
          }
          updateData.crestUri = crestUri;
        }

        if (jerseyUri !== undefined) {
          if (jerseyUri && !isValidUrl(jerseyUri)) {
            app.logger.warn({ teamId: id, jerseyUri }, 'Invalid jerseyUri format');
            return reply.status(400).send({ error: 'jerseyUri must be a valid URL or null' });
          }
          updateData.jerseyUri = jerseyUri;
        }

        // Handle legacy fields for backward compatibility
        if (legacyFields.shortName !== undefined) updateData.shortName = legacyFields.shortName;
        if (legacyFields.sport !== undefined) updateData.sport = normalizeSport(legacyFields.sport);
        if (legacyFields.grade !== undefined) updateData.grade = legacyFields.grade;
        if (legacyFields.crestUrl !== undefined) updateData.crestUrl = legacyFields.crestUrl;
        if (legacyFields.primaryColor !== undefined) updateData.primaryColor = legacyFields.primaryColor;
        if (legacyFields.secondaryColor !== undefined) updateData.secondaryColor = legacyFields.secondaryColor;
        if (legacyFields.accentColor !== undefined) updateData.accentColor = legacyFields.accentColor;
        if (legacyFields.isArchived !== undefined) updateData.isArchived = legacyFields.isArchived;

        const [updated] = await app.db
          .update(schema.teams)
          .set(updateData)
          .where(eq(schema.teams.id, id))
          .returning();

        app.logger.info({ teamId: id }, 'Team updated successfully');
        return mapTeamToResponse(updated);
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
            trainingSessions: true,
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

        // Calculate dashboard counters
        const playerCount = team.players.length;
        const injuredCount = team.players.filter((p) => p.isInjured).length;

        // Combine fixtures and training sessions for session counts
        const allSessions = [
          ...team.fixtures.map((f) => ({ dateTime: f.date, type: 'fixture' })),
          ...team.trainingSessions.map((ts) => ({ dateTime: ts.date, type: 'training' })),
        ];

        const upcomingSessionsCount = allSessions.filter((s) => s.dateTime >= now).length;
        const completedSessionsCount = allSessions.filter((s) => s.dateTime < now).length;

        const dashboard = {
          team: mapTeamToResponse(team),
          club: team.club,
          playerCount,
          injuredCount,
          upcomingSessionsCount,
          completedSessionsCount,
          upcomingFixtures,
          recentFixtures,
          userRole: clubMembership.role,
        };

        app.logger.info(
          {
            teamId: id,
            playerCount,
            injuredCount,
            upcomingSessionsCount,
            completedSessionsCount,
          },
          'Team dashboard fetched'
        );
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

  // DELETE /api/teams/:id - Soft delete team (archive)
  app.fastify.delete(
    '/api/teams/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, teamId: id }, 'Deleting team');

      try {
        const team = await app.db.query.teams.findFirst({
          where: eq(schema.teams.id, id),
        });

        if (!team) {
          app.logger.warn({ teamId: id }, 'Team not found');
          return reply.status(404).send({ error: 'Team not found' });
        }

        // Check if user is CLUB_ADMIN
        const membership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, team.clubId),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!membership || membership.role !== 'CLUB_ADMIN') {
          app.logger.warn({ teamId: id, userId: session.user.id }, 'Unauthorized team deletion');
          return reply
            .status(403)
            .send({ error: 'Only CLUB_ADMIN can delete teams' });
        }

        // Soft delete: archive the team
        await app.db
          .update(schema.teams)
          .set({ isArchived: true })
          .where(eq(schema.teams.id, id));

        app.logger.info({ teamId: id }, 'Team archived successfully');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, teamId: id }, 'Failed to delete team');
        throw error;
      }
    }
  );

  // POST /api/teams/:teamId/crest - Upload team crest image
  app.fastify.post(
    '/api/teams/:teamId/crest',
    async (request: FastifyRequest<{ Params: { teamId: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId } = request.params;
      app.logger.info({ userId: session.user.id, teamId }, 'Uploading team crest');

      try {
        // Verify team exists
        const team = await app.db.query.teams.findFirst({
          where: eq(schema.teams.id, teamId),
          with: {
            club: true,
          },
        });

        if (!team) {
          app.logger.warn({ teamId }, 'Team not found');
          return reply.status(404).send({ error: 'Team not found' });
        }

        // Check permissions: user must be COACH or CLUB_ADMIN
        const membership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, team.clubId),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!membership || !['COACH', 'CLUB_ADMIN'].includes(membership.role)) {
          app.logger.warn({ teamId, userId: session.user.id }, 'Unauthorized crest upload');
          return reply.status(403).send({ error: 'Only COACH or CLUB_ADMIN can upload team crest' });
        }

        // Get the file from the request with 5MB size limit
        const data = await request.file({
          limits: { fileSize: 5 * 1024 * 1024 },
        });

        if (!data) {
          app.logger.warn({ userId: session.user.id, teamId }, 'No file provided');
          return reply.status(400).send({ error: 'No file provided' });
        }

        // Validate file type - only jpg, jpeg, png, webp
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(data.mimetype)) {
          app.logger.warn({ userId: session.user.id, teamId, mimeType: data.mimetype }, 'Invalid file type');
          return reply.status(400).send({ error: 'Only JPG, PNG, and WebP images are allowed' });
        }

        let buffer: Buffer;
        try {
          buffer = await data.toBuffer();
        } catch (err) {
          app.logger.error({ err, userId: session.user.id, teamId }, 'File size limit exceeded');
          return reply.status(413).send({ error: 'File too large. Maximum size is 5MB' });
        }

        // Generate a unique key for the file
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const key = `teams/${teamId}/crest/${timestamp}-${randomSuffix}-${data.filename}`;

        // Upload the file to storage
        const uploadedKey = await app.storage.upload(key, buffer);

        // Generate a signed URL for client access
        const { url } = await app.storage.getSignedUrl(uploadedKey);

        // Update team with new crest URL (use new field, but also set legacy field for compatibility)
        const [updated] = await app.db
          .update(schema.teams)
          .set({ crestUri: url, crestImageUrl: url })
          .where(eq(schema.teams.id, teamId))
          .returning();

        app.logger.info({ teamId, url }, 'Team crest uploaded successfully');
        return { crestUri: updated.crestUri };
      } catch (error) {
        app.logger.error({ err: error, teamId }, 'Failed to upload team crest');
        throw error;
      }
    }
  );

  // POST /api/teams/:teamId/jersey - Upload team jersey image
  app.fastify.post(
    '/api/teams/:teamId/jersey',
    async (request: FastifyRequest<{ Params: { teamId: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId } = request.params;
      app.logger.info({ userId: session.user.id, teamId }, 'Uploading team jersey');

      try {
        // Verify team exists
        const team = await app.db.query.teams.findFirst({
          where: eq(schema.teams.id, teamId),
          with: {
            club: true,
          },
        });

        if (!team) {
          app.logger.warn({ teamId }, 'Team not found');
          return reply.status(404).send({ error: 'Team not found' });
        }

        // Check permissions: user must be COACH or CLUB_ADMIN
        const membership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, team.clubId),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!membership || !['COACH', 'CLUB_ADMIN'].includes(membership.role)) {
          app.logger.warn({ teamId, userId: session.user.id }, 'Unauthorized jersey upload');
          return reply.status(403).send({ error: 'Only COACH or CLUB_ADMIN can upload team jersey' });
        }

        // Get the file from the request with 5MB size limit
        const data = await request.file({
          limits: { fileSize: 5 * 1024 * 1024 },
        });

        if (!data) {
          app.logger.warn({ userId: session.user.id, teamId }, 'No file provided');
          return reply.status(400).send({ error: 'No file provided' });
        }

        // Validate file type - only jpg, jpeg, png, webp
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(data.mimetype)) {
          app.logger.warn({ userId: session.user.id, teamId, mimeType: data.mimetype }, 'Invalid file type');
          return reply.status(400).send({ error: 'Only JPG, PNG, and WebP images are allowed' });
        }

        let buffer: Buffer;
        try {
          buffer = await data.toBuffer();
        } catch (err) {
          app.logger.error({ err, userId: session.user.id, teamId }, 'File size limit exceeded');
          return reply.status(413).send({ error: 'File too large. Maximum size is 5MB' });
        }

        // Generate a unique key for the file
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const key = `teams/${teamId}/jersey/${timestamp}-${randomSuffix}-${data.filename}`;

        // Upload the file to storage
        const uploadedKey = await app.storage.upload(key, buffer);

        // Generate a signed URL for client access
        const { url } = await app.storage.getSignedUrl(uploadedKey);

        // Update team with new jersey URL (use new field, but also set legacy field for compatibility)
        const [updated] = await app.db
          .update(schema.teams)
          .set({ jerseyUri: url, jerseyImageUrl: url })
          .where(eq(schema.teams.id, teamId))
          .returning();

        app.logger.info({ teamId, url }, 'Team jersey uploaded successfully');
        return { jerseyUri: updated.jerseyUri };
      } catch (error) {
        app.logger.error({ err: error, teamId }, 'Failed to upload team jersey');
        throw error;
      }
    }
  );

  // DELETE /api/teams/:teamId/crest - Remove team crest image
  app.fastify.delete(
    '/api/teams/:teamId/crest',
    async (request: FastifyRequest<{ Params: { teamId: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId } = request.params;
      app.logger.info({ userId: session.user.id, teamId }, 'Removing team crest');

      try {
        // Verify team exists and get club info
        const team = await app.db.query.teams.findFirst({
          where: eq(schema.teams.id, teamId),
          with: {
            club: true,
          },
        });

        if (!team) {
          app.logger.warn({ teamId }, 'Team not found');
          return reply.status(404).send({ error: 'Team not found' });
        }

        // Check permissions: user must be COACH or CLUB_ADMIN
        const membership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, team.clubId),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!membership || !['COACH', 'CLUB_ADMIN'].includes(membership.role)) {
          app.logger.warn({ teamId, userId: session.user.id }, 'Unauthorized crest deletion');
          return reply.status(403).send({ error: 'Only COACH or CLUB_ADMIN can delete team crest' });
        }

        // Remove crest URL (clear both new and legacy fields)
        await app.db
          .update(schema.teams)
          .set({ crestUri: null, crestImageUrl: null })
          .where(eq(schema.teams.id, teamId));

        app.logger.info({ teamId }, 'Team crest removed successfully');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, teamId }, 'Failed to remove team crest');
        throw error;
      }
    }
  );

  // DELETE /api/teams/:teamId/jersey - Remove team jersey image
  app.fastify.delete(
    '/api/teams/:teamId/jersey',
    async (request: FastifyRequest<{ Params: { teamId: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId } = request.params;
      app.logger.info({ userId: session.user.id, teamId }, 'Removing team jersey');

      try {
        // Verify team exists and get club info
        const team = await app.db.query.teams.findFirst({
          where: eq(schema.teams.id, teamId),
          with: {
            club: true,
          },
        });

        if (!team) {
          app.logger.warn({ teamId }, 'Team not found');
          return reply.status(404).send({ error: 'Team not found' });
        }

        // Check permissions: user must be COACH or CLUB_ADMIN
        const membership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, team.clubId),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!membership || !['COACH', 'CLUB_ADMIN'].includes(membership.role)) {
          app.logger.warn({ teamId, userId: session.user.id }, 'Unauthorized jersey deletion');
          return reply.status(403).send({ error: 'Only COACH or CLUB_ADMIN can delete team jersey' });
        }

        // Remove jersey URL (clear both new and legacy fields)
        await app.db
          .update(schema.teams)
          .set({ jerseyUri: null, jerseyImageUrl: null })
          .where(eq(schema.teams.id, teamId));

        app.logger.info({ teamId }, 'Team jersey removed successfully');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, teamId }, 'Failed to remove team jersey');
        throw error;
      }
    }
  );
}
