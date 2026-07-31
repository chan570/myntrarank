export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'TrustRank Enterprise Trust & Ranking API Gateway',
    version: '1.0.0',
    description: 'API Gateway documenting search query rankings, buyer review audits, and ML pipelines.'
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Local Development Server'
    }
  ],
  paths: {
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
        description: 'Saves review in DB and flags product metrics as dirty for background batch re-auditing.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productId', 'reviewerName', 'rating', 'text'],
                properties: {
                  productId: { type: 'string' },
                  reviewerName: { type: 'string' },
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                  text: { type: 'string' },
                  verified: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Review saved successfully'
          },
          '400': {
            description: 'Validation exception'
          }
        }
      }
    },
    '/admin/audit': {
      post: {
        summary: 'Trigger audit batch pipeline',
        description: 'Initiates a full sweep processing spam checks, Type-Token Ratio scores, and ML sentiment evaluations.',
        responses: {
          '200': {
            description: 'Audit completed successfully'
          }
        }
      }
    },
    '/admin/inject-bot-attack': {
      post: {
        summary: 'Simulate bot review attack',
        description: 'Appends 38 identical duplicate spam reviews to check anomaly detection resilience.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productId'],
                properties: {
                  productId: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Bot reviews injected successfully'
          }
        }
      }
    },
    '/stats': {
      get: {
        summary: 'Get telemetry details',
        description: 'Returns indices document counts, DB connection status, and server states.',
        responses: {
          '200': {
            description: 'Telemetry logs'
          }
        }
      }
    }
  }
};

export default swaggerSpec;
