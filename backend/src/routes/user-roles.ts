import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerUserRoleRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/user-roles - Get user roles for a team
  app.fastify.get(
    '/api/user-roles',
    async (
      request: FastifyRequest<{ Querystring: { teamId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { teamId } = request.query;
      app.logger.info({ userId: session.user.id, teamId }, 'Fetching user roles');

      try {
        const roles = await app.db.query.userRoles.findMany({
          where: eq(schema.userRoles.teamId, teamId),
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

        app.logger.info({ teamId, roleCount: roles.length }, 'User roles fetched');
        return roles;
      } catch (error) {
        app.logger.error({ err: error, teamId }, 'Failed to fetch user roles');
        throw error;
      }
    }
  );

  // POST /api/user-roles - Assign role to user for a team
  app.fastify.post(
    '/api/user-roles',
    async (
      request: FastifyRequest<{
        Body: {
          userId: string;
          teamId: string;
          role: 'club_admin' | 'coach' | 'stats_person' | 'player';
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { userId, teamId, role } = request.body;
      app.logger.info(
        { userId: session.user.id, targetUserId: userId, teamId, role },
        'Assigning user role'
      );

      try {
        // Check if role already exists
        const existing = await app.db.query.userRoles.findFirst({
          where: and(
            eq(schema.userRoles.userId, userId),
            eq(schema.userRoles.teamId, teamId)
          ),
        });

        if (existing) {
          app.logger.warn({ userId, teamId }, 'User already has a role for this team');
          return reply
            .status(409)
            .send({ error: 'User already has a role assigned to this team' });
        }

        const [userRole] = await app.db
          .insert(schema.userRoles)
          .values({
            userId,
            teamId,
            role,
          })
          .returning();

        app.logger.info(
          { userRoleId: userRole.id, userId, teamId, role },
          'User role assigned successfully'
        );
        return userRole;
      } catch (error) {
        app.logger.error(
          { err: error, userId, teamId, role },
          'Failed to assign user role'
        );
        throw error;
      }
    }
  );

  // PUT /api/user-roles/:id - Update user role
  app.fastify.put(
    '/api/user-roles/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          role: 'club_admin' | 'coach' | 'stats_person' | 'player';
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { role } = request.body;

      app.logger.info(
        { userId: session.user.id, userRoleId: id, role },
        'Updating user role'
      );

      try {
        const [updated] = await app.db
          .update(schema.userRoles)
          .set({ role })
          .where(eq(schema.userRoles.id, id))
          .returning();

        app.logger.info({ userRoleId: id, role }, 'User role updated successfully');
        return updated;
      } catch (error) {
        app.logger.error({ err: error, userRoleId: id }, 'Failed to update user role');
        throw error;
      }
    }
  );

  // DELETE /api/user-roles/:id - Remove user role
  app.fastify.delete(
    '/api/user-roles/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, userRoleId: id }, 'Deleting user role');

      try {
        await app.db.delete(schema.userRoles).where(eq(schema.userRoles.id, id));

        app.logger.info({ userRoleId: id }, 'User role deleted successfully');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userRoleId: id }, 'Failed to delete user role');
        throw error;
      }
    }
  );

  // GET /api/user-roles/me - Get current user's roles
  app.fastify.get('/api/user-roles/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching current user roles');

    try {
      const roles = await app.db.query.userRoles.findMany({
        where: eq(schema.userRoles.userId, session.user.id),
        with: {
          team: true,
        },
      });

      app.logger.info({ userId: session.user.id, roleCount: roles.length }, 'User roles fetched');
      return roles;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch user roles');
      throw error;
    }
  });
}
