import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerDevelopmentNoteRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/development-notes - Get development notes for a player
  app.fastify.get(
    '/api/development-notes',
    async (
      request: FastifyRequest<{ Querystring: { playerId: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { playerId } = request.query;
      app.logger.info({ userId: session.user.id, playerId }, 'Fetching development notes');

      try {
        const notes = await app.db.query.developmentNotes.findMany({
          where: eq(schema.developmentNotes.playerId, playerId),
          orderBy: (notes, { desc }) => [desc(notes.createdAt)],
        });

        app.logger.info({ playerId, noteCount: notes.length }, 'Development notes fetched');
        return notes;
      } catch (error) {
        app.logger.error({ err: error, playerId }, 'Failed to fetch development notes');
        throw error;
      }
    }
  );

  // POST /api/development-notes - Create development note
  app.fastify.post(
    '/api/development-notes',
    async (
      request: FastifyRequest<{
        Body: {
          playerId: string;
          strengths?: string;
          targets?: string;
          coachNotes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { playerId, strengths, targets, coachNotes } = request.body;
      app.logger.info(
        { userId: session.user.id, playerId },
        'Creating development note'
      );

      try {
        const [note] = await app.db
          .insert(schema.developmentNotes)
          .values({
            playerId,
            strengths,
            targets,
            coachNotes,
            createdBy: session.user.id,
          })
          .returning();

        app.logger.info({ developmentNoteId: note.id }, 'Development note created successfully');
        return note;
      } catch (error) {
        app.logger.error({ err: error, playerId }, 'Failed to create development note');
        throw error;
      }
    }
  );

  // PUT /api/development-notes/:id - Update development note
  app.fastify.put(
    '/api/development-notes/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          strengths?: string;
          targets?: string;
          coachNotes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { strengths, targets, coachNotes } = request.body;

      app.logger.info(
        { userId: session.user.id, developmentNoteId: id },
        'Updating development note'
      );

      try {
        const updateData: any = {};
        if (strengths !== undefined) updateData.strengths = strengths;
        if (targets !== undefined) updateData.targets = targets;
        if (coachNotes !== undefined) updateData.coachNotes = coachNotes;

        const [updated] = await app.db
          .update(schema.developmentNotes)
          .set(updateData)
          .where(eq(schema.developmentNotes.id, id))
          .returning();

        app.logger.info({ developmentNoteId: id }, 'Development note updated successfully');
        return updated;
      } catch (error) {
        app.logger.error(
          { err: error, developmentNoteId: id },
          'Failed to update development note'
        );
        throw error;
      }
    }
  );
}
