/**
 * OpenAPI 3.0 specification for the Notes App Backend API.
 * Served at GET /openapi.json
 */
export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Notes App Backend API',
    version: '1.0.0',
    description:
      'A multi-user notes service with JWT authentication, note sharing, full-text search, and AI-powered importance analysis.',
  },
  servers: [{ url: '/', description: 'Current server' }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Note: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          title: { type: 'string', maxLength: 500 },
          content: { type: 'string', maxLength: 50000 },
          priority: { type: 'integer', minimum: 1, maximum: 5 },
          pinned: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
          modified_at: { type: 'string', format: 'date-time' },
          is_shared: { type: 'boolean' },
        },
      },
      PaginatedNotes: {
        type: 'object',
        properties: {
          notes: { type: 'array', items: { $ref: '#/components/schemas/Note' } },
          total: { type: 'integer' },
          page: { type: 'integer' },
          page_size: { type: 'integer' },
          total_pages: { type: 'integer' },
        },
      },
      ImportantNote: {
        type: 'object',
        properties: {
          noteId: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          content: { type: 'string' },
          importance_score: { type: 'number', minimum: 0, maximum: 10 },
          explanation: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object', additionalProperties: { type: 'string' } },
            },
          },
        },
      },
    },
  },
  paths: {
    '/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', minLength: 8, example: 'securepassword123' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    userId: { type: 'string', format: 'uuid' },
                    email: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '409': { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/login': {
      post: {
        summary: 'Login and get a JWT token',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', example: 'securepassword123' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { access_token: { type: 'string' } },
                },
                example: { access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              },
            },
          },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/notes': {
      get: {
        summary: 'Get all notes (owned + shared)',
        tags: ['Notes'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'page_size', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          '200': { description: 'Paginated list of notes', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedNotes' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        summary: 'Create a new note',
        tags: ['Notes'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'content'],
                properties: {
                  title: { type: 'string', maxLength: 500, example: 'Meeting notes' },
                  content: { type: 'string', maxLength: 50000, example: 'Discussed Q4 roadmap...' },
                  priority: { type: 'integer', minimum: 1, maximum: 5, default: 3 },
                  pinned: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Note created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Note' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/notes/{id}': {
      get: {
        summary: 'Get a specific note by ID',
        tags: ['Notes'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Note data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Note' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Note not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      put: {
        summary: 'Update a note',
        tags: ['Notes'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', maxLength: 500 },
                  content: { type: 'string', maxLength: 50000 },
                  priority: { type: 'integer', minimum: 1, maximum: 5 },
                  pinned: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated note', content: { 'application/json': { schema: { $ref: '#/components/schemas/Note' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Note not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        summary: 'Delete a note',
        tags: ['Notes'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '204': { description: 'Note deleted' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Note not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/notes/{id}/share': {
      post: {
        summary: 'Share a note with another user',
        tags: ['Notes'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['share_with_email'],
                properties: {
                  share_with_email: { type: 'string', format: 'email', example: 'friend@example.com' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Note shared successfully', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Note or user not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/search': {
      get: {
        summary: 'Full-text search across accessible notes',
        tags: ['Search'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Search keyword' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'page_size', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          '200': { description: 'Search results', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedNotes' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/important': {
      get: {
        summary: 'Get AI-identified important notes',
        tags: ['AI'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Ranked list of important notes',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/ImportantNote' } },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '503': { description: 'AI service unavailable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/about': {
      get: {
        summary: 'Service information',
        tags: ['Meta'],
        responses: {
          '200': {
            description: 'Service metadata',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string' },
                    'my features': { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['Meta'],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/openapi.json': {
      get: {
        summary: 'OpenAPI specification',
        tags: ['Meta'],
        responses: {
          '200': { description: 'OpenAPI 3.0 JSON document' },
        },
      },
    },
  },
};
