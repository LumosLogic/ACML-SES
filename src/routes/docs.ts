import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

const router = Router();

const spec = {
  openapi: '3.0.0',
  info: {
    title: 'ACML Email API',
    version: '1.0.0',
    description: 'Bulk and transactional email sending powered by AWS SES.',
  },
  servers: [{ url: '/api', description: 'API base' }],
  components: {
    securitySchemes: {
      ApiKey: { type: 'apiKey', in: 'header', name: 'X-Api-Key' },
    },
    schemas: {
      SendRequest: {
        type: 'object',
        required: ['subject', 'body'],
        properties: {
          to:           { type: 'string', example: 'john@example.com, jane@example.com', description: 'Comma-separated emails. Required unless csv or recipients is provided.' },
          recipients:   { type: 'string', example: '[{"email":"john@x.com","vars":{"name":"John"}}]', description: 'JSON array of {email, vars} for per-recipient personalization.' },
          subject:      { type: 'string', example: 'Hello {{name}}' },
          body:         { type: 'string', example: '<h1>Hi {{name}}</h1><a href="{{unsubscribe_url}}">Unsubscribe</a>' },
          isHtml:       { type: 'string', enum: ['true', 'false'], default: 'true' },
          from:         { type: 'string', example: 'no-reply@yourdomain.com', description: 'Must be a verified SES domain.' },
          replyTo:      { type: 'string', example: 'support@yourdomain.com' },
          cc:           { type: 'string', example: 'manager@yourdomain.com' },
          bcc:          { type: 'string', example: 'audit@yourdomain.com' },
          globalVars:   { type: 'string', example: '{"company":"ACML"}', description: 'JSON object applied to all recipients.' },
          send_at:      { type: 'string', example: '2026-06-25T09:00:00Z', description: 'ISO date for scheduled sending.' },
          callback_url: { type: 'string', example: 'https://yourserver.com/email-done', description: 'POST result here when bulk job completes.' },
        },
      },
    },
  },
  security: [{ ApiKey: [] }],
  paths: {
    '/send': {
      post: {
        summary: 'Send email (all types)',
        description: 'Unified endpoint. Handles single, bulk, CSV, attachments, personalization, scheduling.',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SendRequest' },
                  {
                    properties: {
                      csv:         { type: 'string', format: 'binary', description: 'CSV file with "email" column. Extra columns become {{vars}}.' },
                      attachments: { type: 'string', format: 'binary', description: 'File attachment (repeat field for multiple, max 10 files / 25 MB total).' },
                    },
                  },
                ],
              },
            },
          },
        },
        responses: {
          200: { description: 'Sent immediately (≤50 recipients)' },
          202: { description: 'Queued or scheduled (>50 recipients or send_at provided)' },
          400: { description: 'Validation error' },
          401: { description: 'Invalid API key' },
          429: { description: 'Rate limit exceeded (60 req/min)' },
        },
      },
    },
    '/job-status/{jobId}': {
      get: {
        summary: 'Poll bulk job status',
        parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Job progress and status' }, 404: { description: 'Job not found' } },
      },
    },
    '/job/{jobId}': {
      delete: {
        summary: 'Cancel a queued or scheduled job',
        parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Job cancelled' },
          404: { description: 'Job not found' },
          409: { description: 'Job is active or already completed' },
        },
      },
    },
    '/suppressions': {
      get: {
        summary: 'List suppressed emails',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: { 200: { description: 'List of suppressed emails' } },
      },
      post: {
        summary: 'Manually add email to suppression list',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['email'],
                properties: {
                  email:  { type: 'string', example: 'user@example.com' },
                  reason: { type: 'string', enum: ['bounce', 'complaint'], default: 'complaint' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Added' }, 400: { description: 'Invalid email' } },
      },
    },
    '/suppressions/{email}': {
      get: {
        summary: 'Check if an email is suppressed',
        parameters: [{ name: 'email', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Suppression status' } },
      },
      delete: {
        summary: 'Remove email from suppression list',
        parameters: [{ name: 'email', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Removed' }, 404: { description: 'Not found' } },
      },
    },
    '/recent-emails': {
      get: {
        summary: 'Recent email log',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
          { name: 'days', in: 'query', schema: { type: 'integer' }, description: 'Last N days' },
          { name: 'from', in: 'query', schema: { type: 'string' }, description: 'Date range start (YYYY-MM-DD)' },
          { name: 'to', in: 'query', schema: { type: 'string' }, description: 'Date range end (YYYY-MM-DD)' },
        ],
        responses: { 200: { description: 'Email log entries' } },
      },
    },
  },
};

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(spec, { customSiteTitle: 'ACML Email API Docs' }));

export default router;
