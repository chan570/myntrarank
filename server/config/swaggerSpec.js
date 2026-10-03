export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'TrustRank Review Ranking API',
    version: '2.0.0',
    description: 'Account-aware review submission, score recalculation, and snapshot-based product ranking.'
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      SessionCookie: { type: 'apiKey', in: 'cookie', name: 'trustrank_session' }
    }
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Create an account',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'email', 'password'], properties: { name: { type: 'string', minLength: 2, maxLength: 60 }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 10, maxLength: 128 } } } } } },
        responses: { '201': { description: 'Account created and signed in' }, '409': { description: 'Email already registered' } }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Sign in',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } } } } },
        responses: { '200': { description: 'Signed in with an HttpOnly session cookie' }, '401': { description: 'Invalid credentials' } }
      }
    },
    '/auth/me': {
      get: { summary: 'Get the current account', responses: { '200': { description: 'Current account, or null when signed out' } } }
    },
    '/auth/logout': {
      post: { summary: 'Sign out', responses: { '200': { description: 'Session revoked and cookie cleared' } } }
    },
    '/search': {
      get: {
        summary: 'Query product search results',
        description: 'Returns products matching search text ranked using the multi-factor SDE TrustRank formula.',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Search match text'
          },
          {
            name: 'category',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Filter category'
          },
          {
            name: 'removeSuspicious',
            in: 'query',
            required: false,
            schema: { type: 'boolean' },
            description: 'Filter out suspect bot/spam products'
          }
        ],
        responses: {
          '200': {
            description: 'Successful search execution',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        engine: { type: 'string' },
                        results: { type: 'array', items: { type: 'object' } }
                      }
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    error: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/search/autocomplete': {
      get: {
        summary: 'Autocomplete search keywords',
        description: 'Returns top prefix-matched product titles for UI autocomplete dropdowns.',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Prefix query letters'
          }
        ],
        responses: {
          '200': {
            description: 'Autocomplete match lists'
          }
        }
      }
    },
    '/reviews': {
      post: {
        summary: 'Submit customer review',
        description: 'Requires a signed-in account. Allows one review per account per product, recalculates scores, and leaves existing search snapshots unchanged. Use Idempotency-Key when retrying.',
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productId', 'rating', 'text'],
                properties: {
                  productId: { type: 'string' },
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                  text: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Review saved and product score recalculated'
          },
          '404': {
            description: 'Product not found'
          },
          '502': {
            description: 'Sentiment service unavailable; review was not indexed'
          },
          '400': {
            description: 'Validation exception'
          }
        }
      }
    }
  }
};

export default swaggerSpec;
