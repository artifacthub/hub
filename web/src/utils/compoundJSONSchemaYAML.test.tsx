import { JSONSchema } from '@apidevtools/json-schema-ref-parser';

import compoundJSONSchemaYAML from './compoundJSONSchemaYAML';

interface Tests {
  input: JSONSchema;
  output: string;
}

const tests: Tests[] = [
  {
    input: {},
    output: '',
  },
  {
    input: {
      type: 'object',
      title: 'Database configuration',
      required: ['database', 'host', 'password', 'port', 'user'],
      properties: {
        host: { type: 'string', title: 'Database host', default: '' },
        port: { type: 'string', title: 'Database port', default: '5432' },
        user: { type: 'string', title: 'Database user', default: 'postgres' },
        database: { type: 'string', title: 'Database name', default: 'hub' },
        password: { type: 'string', title: 'Database password', default: 'postgres' },
      },
    },
    output: `# Database configuration

# Database host
host: ""

# Database port
port: 5432

# Database user
user: postgres

# Database name
database: hub

# Database password
password: postgres`,
  },
  {
    input: {
      type: 'object',
      properties: {
        host: {
          type: 'string',
          title: 'SMTP host',
          default: '',
          description: 'This field is required if you want to enable email sending in Artifact Hub.',
        },
        port: {
          type: 'integer',
          title: 'SMTP port',
          default: 587,
          description: 'This field is required if you want to enable email sending in Artifact Hub.',
        },
        password: {
          type: 'string',
          title: 'SMTP password',
          default: '',
        },
        username: {
          type: 'string',
          title: 'SMTP username',
          default: '',
        },
      },
    },
    output: `

# SMTP host
host: ""

# SMTP port
port: 587

# SMTP password
password: ""

# SMTP username
username: ""`,
  },
  {
    input: {
      type: 'object',
      required: ['image', 'replicaCount', 'resources'],
      properties: {
        image: {
          type: 'object',
          required: ['repository'],
          properties: {
            repository: {
              type: 'string',
              title: 'Hub image repository (without the tag)',
              default: 'artifacthub/hub',
            },
          },
        },
        resources: {
          type: 'object',
          title: 'Hub pod resource requirements',
          default: {},
          description:
            'More information here: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.19/#resourcerequirements-v1-core',
        },
        replicaCount: {
          type: 'integer',
          title: 'Number of Hub replicas',
          default: 1,
        },
        readinessGates: {
          type: 'array',
          items: {
            type: 'object',
            description:
              'More information here: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.19/#podreadinessgate-v1-core',
          },
          title: 'Hub pod readiness gates',
          default: [],
        },
      },
    },
    output: `

image:${' '}
  # Hub image repository (without the tag)
  repository: artifacthub/hub

# Hub pod resource requirements
resources: {}

# Number of Hub replicas
replicaCount: 1

# Hub pod readiness gates
readinessGates: []`,
  },
  {
    input: {
      type: 'object',
      title: 'Ingress definition',
      properties: {
        tls: {
          type: 'boolean',
          title: 'Enables TLS',
          default: false,
          description: 'Enabling TLS my require some annotations',
        },
        annotations: {
          type: 'object',
          default: {},
        },
      },
    },
    output: `# Ingress definition

# Enables TLS
tls: false

annotations: {}`,
  },
  {
    input: {
      type: 'object',
      title: 'Cluster resources definition',
      properties: {
        limits: {
          type: 'object',
          properties: {
            cpu: {
              type: 'string',
              default: '100m',
            },
            memory: {
              type: 'string',
              default: '128Mi',
            },
          },
        },
        requests: {
          type: 'object',
          properties: {
            cpu: {
              type: 'string',
              default: '100m',
            },
            memory: {
              type: 'string',
              default: '128Mi',
            },
          },
        },
      },
    },
    output: `# Cluster resources definition

limits:${` `}
  cpu: 100m
  memory: 128Mi

requests:${` `}
  cpu: 100m
  memory: 128Mi`,
  },
  {
    input: {
      type: 'object',
      title: 'KlustAIR frontend application',
      required: ['apachedocumentroot', 'appkey', 'url', 'debug', 'phpfpm'],
      properties: {
        url: {
          type: 'string',
          title: 'URL the application is listening on',
          default: '',
          description: 'Example: preview.klustair.com',
        },
        debug: {
          type: 'boolean',
          title: 'Laravel debug toggle',
          default: false,
        },
        appkey: {
          type: 'string',
          title: 'Laravel app key',
          default: '',
          description: "Random string of 32 chars. See in README for way's to generate one.",
        },
        phpfpm: {
          type: 'boolean',
          title: 'php-fpm toggle',
          default: false,
        },
        apachedocumentroot: {
          type: 'string',
          title: 'apache document root',
          default: '/var/www/public',
        },
      },
    },
    output: `# KlustAIR frontend application

# URL the application is listening on
url: ""

# Laravel debug toggle
debug: false

# Laravel app key
appkey: ""

# php-fpm toggle
phpfpm: false

# apache document root
apachedocumentroot: /var/www/public`,
  },
  {
    input: {
      type: 'object',
      properties: {
        podSecurityContext: {
          type: 'object',
          default: {},
        },
      },
    },
    output: `

podSecurityContext: {}`,
  },
];

describe('compoundJSONSchemaYAML', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns proper content', () => {
      const actual = compoundJSONSchemaYAML(tests[i].input);
      expect(actual).toEqual(tests[i].output);
    });
  }
});
