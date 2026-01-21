import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';
import type { App } from '../index.js';

export function registerClubsV2Routes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/clubs - Get clubs accessible to user (updated)
  app.fastify.get('/api/clubs', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching clubs');

    try {
      const userMemberships = await app.db.query.memberships.findMany({
        where: eq(schema.memberships.userId, session.user.id),
        with: {
          club: true,
        },
      });

      const clubs = userMemberships.map((m) => ({
        ...m.club,
        userRole: m.role,
      }));

      app.logger.info({ userId: session.user.id, clubCount: clubs.length }, 'Clubs fetched');
      return clubs;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch clubs');
      throw error;
    }
  });

  // POST /api/clubs - Create a club (updated)
  app.fastify.post(
    '/api/clubs',
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          county?: string;
          colours?: string;
          crestUrl?: string;
          primaryColor?: string;
          secondaryColor?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { name, county, colours, crestUrl, primaryColor, secondaryColor } = request.body;
      app.logger.info({ userId: session.user.id, name }, 'Creating club');

      try {
        const [club] = await app.db
          .insert(schema.clubs)
          .values({
            name,
            county,
            colours,
            crestUrl,
            primaryColor,
            secondaryColor,
            createdBy: session.user.id,
          })
          .returning();

        // Automatically create membership with CLUB_ADMIN role
        await app.db.insert(schema.memberships).values({
          clubId: club.id,
          userId: session.user.id,
          role: 'CLUB_ADMIN',
        });

        app.logger.info({ clubId: club.id, name }, 'Club created successfully with admin membership');
        return {
          id: club.id,
          name: club.name,
          county: club.county,
          colours: club.colours,
          crestUrl: club.crestUrl,
          primaryColor: club.primaryColor,
          secondaryColor: club.secondaryColor,
          createdAt: club.createdAt,
          createdBy: club.createdBy,
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, name }, 'Failed to create club');
        throw error;
      }
    }
  );

  // PUT /api/clubs/:id - Update club details
  app.fastify.put(
    '/api/clubs/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          name?: string;
          county?: string;
          colours?: string;
          crestUrl?: string;
          primaryColor?: string;
          secondaryColor?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { name, county, colours, crestUrl, primaryColor, secondaryColor } = request.body;

      app.logger.info({ userId: session.user.id, clubId: id }, 'Updating club');

      try {
        // Check if user is CLUB_ADMIN
        const membership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, id),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!membership || membership.role !== 'CLUB_ADMIN') {
          app.logger.warn({ clubId: id, userId: session.user.id }, 'Unauthorized club update');
          return reply.status(403).send({ error: 'Only CLUB_ADMIN can update club details' });
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        if (county !== undefined) updateData.county = county;
        if (colours !== undefined) updateData.colours = colours;
        if (crestUrl !== undefined) updateData.crestUrl = crestUrl;
        if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
        if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;

        const [updated] = await app.db
          .update(schema.clubs)
          .set(updateData)
          .where(eq(schema.clubs.id, id))
          .returning();

        app.logger.info({ clubId: id }, 'Club updated successfully');
        return updated;
      } catch (error) {
        app.logger.error({ err: error, clubId: id }, 'Failed to update club');
        throw error;
      }
    }
  );

  // GET /api/clubs/:id/dashboard - Get club dashboard data
  app.fastify.get(
    '/api/clubs/:id/dashboard',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, clubId: id }, 'Fetching club dashboard');

      try {
        // Check membership
        const membership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, id),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!membership) {
          app.logger.warn({ clubId: id, userId: session.user.id }, 'User not a member of club');
          return reply.status(403).send({ error: 'You are not a member of this club' });
        }

        const club = await app.db.query.clubs.findFirst({
          where: eq(schema.clubs.id, id),
          with: {
            teams: true,
            seasons: true,
            memberships: true,
          },
        });

        if (!club) {
          app.logger.warn({ clubId: id }, 'Club not found');
          return reply.status(404).send({ error: 'Club not found' });
        }

        const dashboard = {
          club,
          teams: club.teams,
          seasons: club.seasons,
          members: club.memberships,
          teamCount: club.teams.length,
          memberCount: club.memberships.length,
          userRole: membership.role,
        };

        app.logger.info({ clubId: id }, 'Club dashboard fetched');
        return dashboard;
      } catch (error) {
        app.logger.error({ err: error, clubId: id }, 'Failed to fetch club dashboard');
        throw error;
      }
    }
  );

  // GET /api/memberships - Get club members
  app.fastify.get(
    '/api/memberships',
    async (
      request: FastifyRequest<{ Querystring: { clubId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { clubId } = request.query;
      app.logger.info({ userId: session.user.id, clubId }, 'Fetching club memberships');

      try {
        // Check if user is a member of the club
        const userMembership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, clubId),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!userMembership) {
          app.logger.warn({ clubId, userId: session.user.id }, 'User not a member of club');
          return reply.status(403).send({ error: 'You are not a member of this club' });
        }

        const memberships = await app.db.query.memberships.findMany({
          where: eq(schema.memberships.clubId, clubId),
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

        const members = memberships.map((m) => ({
          id: m.id,
          clubId: m.clubId,
          userId: m.userId,
          role: m.role,
          userName: m.user?.name,
          userEmail: m.user?.email,
          createdAt: m.createdAt,
        }));

        app.logger.info({ clubId, memberCount: members.length }, 'Club memberships fetched');
        return members;
      } catch (error) {
        app.logger.error({ err: error, clubId }, 'Failed to fetch club memberships');
        throw error;
      }
    }
  );

  // POST /api/memberships - Invite user to club
  app.fastify.post(
    '/api/memberships',
    async (
      request: FastifyRequest<{
        Body: {
          clubId: string;
          userEmail: string;
          role: 'CLUB_ADMIN' | 'COACH' | 'STATS_PERSON' | 'PLAYER';
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { clubId, userEmail, role } = request.body;
      app.logger.info(
        { userId: session.user.id, clubId, userEmail, role },
        'Inviting user to club'
      );

      try {
        // Check if requester is CLUB_ADMIN
        const requesterMembership = await app.db.query.memberships.findFirst({
          where: and(
            eq(schema.memberships.clubId, clubId),
            eq(schema.memberships.userId, session.user.id)
          ),
        });

        if (!requesterMembership || requesterMembership.role !== 'CLUB_ADMIN') {
          app.logger.warn({ clubId, userId: session.user.id }, 'Unauthorized membership invite');
          return reply
            .status(403)
            .send({ error: 'Only CLUB_ADMIN can invite users to club' });
        }

        // Find user by email
        const targetUser = await app.db.query.user.findFirst({
          where: eq(user.email, userEmail),
        });

        if (!targetUser) {
          app.logger.warn({ userEmail }, 'User not found');
          return reply.status(404).send({ error: 'User not found' });
        }

        // Create membership
        const [membership] = await app.db
          .insert(schema.memberships)
          .values({
            clubId,
            userId: targetUser.id,
            role,
          })
          .returning();

        app.logger.info(
          { membershipId: membership.id, clubId, userId: targetUser.id, role },
          'User invited to club'
        );
        return {
          id: membership.id,
          clubId: membership.clubId,
          userId: membership.userId,
          role: membership.role,
          createdAt: membership.createdAt,
        };
      } catch (error) {
        app.logger.error(
          { err: error, clubId, userEmail },
          'Failed to invite user to club'
        );
        throw error;
      }
    }
  );
}
