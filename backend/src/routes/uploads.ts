import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';

export function registerUploadRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/upload/image - Upload an image file
  app.fastify.post(
    '/api/upload/image',
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<{ url: string; key: string } | void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Uploading image');

      try {
        // Get the file from the request with 5MB size limit
        const data = await request.file({
          limits: { fileSize: 5 * 1024 * 1024 },
        });

        if (!data) {
          app.logger.warn({ userId: session.user.id }, 'No file provided');
          return reply.status(400).send({ error: 'No file provided' });
        }

        // Validate file type
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedMimeTypes.includes(data.mimetype)) {
          app.logger.warn({ userId: session.user.id, mimeType: data.mimetype }, 'Invalid file type');
          return reply.status(400).send({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' });
        }

        let buffer: Buffer;
        try {
          buffer = await data.toBuffer();
        } catch (err) {
          app.logger.error({ err, userId: session.user.id }, 'File size limit exceeded');
          return reply.status(413).send({ error: 'File too large. Maximum size is 5MB' });
        }

        // Generate a unique key for the file
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const key = `fixtures/${timestamp}-${randomSuffix}-${data.filename}`;

        // Upload the file to storage
        const uploadedKey = await app.storage.upload(key, buffer);

        // Generate a signed URL for client access
        const { url } = await app.storage.getSignedUrl(uploadedKey);

        app.logger.info(
          { userId: session.user.id, key: uploadedKey, filename: data.filename },
          'Image uploaded successfully'
        );

        return {
          url,
          key: uploadedKey,
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to upload image');
        throw error;
      }
    }
  );
}
