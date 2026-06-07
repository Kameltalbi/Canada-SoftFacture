export const openapiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'SoftFacture France API',
    version: '0.1.0',
    description: 'API REST pour la solution SaaS de facturation électronique SoftFacture France',
    contact: {
      name: 'SoftFacture France Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Serveur de développement',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['USER', 'ADMIN', 'SUPERADMIN'] },
        },
      },
      Organization: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          taxMatricule: { type: 'string' },
          email: { type: 'string' },
          invoicePdfTemplate: {
            type: 'string',
            enum: ['CLASSIC', 'MODERN', 'MINIMAL'],
          },
          quotePdfTemplate: {
            type: 'string',
            enum: ['CLASSIC', 'MODERN', 'MINIMAL'],
          },
          otherDocumentPdfTemplate: {
            type: 'string',
            enum: ['CLASSIC', 'MODERN', 'MINIMAL'],
          },
          documentFooterText: { type: 'string', nullable: true },
        },
      },
      Client: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          taxId: { type: 'string' },
          address: { type: 'string' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          unit: { type: 'string' },
          unitPrice: { type: 'number' },
          taxRate: { type: 'number' },
        },
      },
      Invoice: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          number: { type: 'string' },
          status: {
            type: 'string',
            enum: ['DRAFT', 'VALIDATED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'],
          },
          issueDate: { type: 'string', format: 'date-time' },
          dueDate: { type: 'string', format: 'date-time' },
          subtotalHt: { type: 'number' },
          vatTotal: { type: 'number' },
          totalTtc: { type: 'number' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    service: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: [
                  'email',
                  'password',
                  'firstName',
                  'lastName',
                  'organizationName',
                  'phone',
                ],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  organizationName: { type: 'string' },
                  phone: { type: 'string', minLength: 8 },
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
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Login user',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
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
                  properties: {
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/clients': {
      get: {
        summary: 'List clients',
        tags: ['Clients'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'q',
            in: 'query',
            description: 'Search query',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of clients',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Client' },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create a client',
        tags: ['Clients'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  taxId: { type: 'string' },
                  address: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Client created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Client' },
              },
            },
          },
        },
      },
    },
    '/api/products': {
      get: {
        summary: 'List products',
        tags: ['Products'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'active',
            in: 'query',
            schema: { type: 'boolean' },
          },
        ],
        responses: {
          '200': {
            description: 'List of products',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Product' },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create a product',
        tags: ['Products'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'unitPrice'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  unit: { type: 'string' },
                  unitPrice: { type: 'number' },
                  taxRate: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Product created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Product' },
              },
            },
          },
        },
      },
    },
  },
};
