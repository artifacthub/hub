import { JSONSchema } from '@apidevtools/json-schema-ref-parser';

import compoundJSONSchemaYAML, { shouldIgnorePath } from './compoundJSONSchemaYAML';

interface Tests {
  input: JSONSchema;
  opts?: { [key: string]: number };
  output: { yamlContent?: string; paths: string[] };
}

interface TestsIgnorePath {
  input: any;
  output: boolean;
}

const tests: Tests[] = [
  {
    input: {},
    output: { yamlContent: undefined, paths: [] },
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
    output: {
      yamlContent: `# Database configuration

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
      paths: ['host', 'port', 'user', 'database', 'password'],
    },
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
    output: {
      yamlContent: `

# SMTP host
host: ""

# SMTP port
port: 587

# SMTP password
password: ""

# SMTP username
username: ""`,
      paths: ['host', 'port', 'password', 'username'],
    },
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
    output: {
      yamlContent: `

image:${' '}
  # Hub image repository (without the tag)
  repository: artifacthub/hub

# Hub pod resource requirements
resources: {}

# Number of Hub replicas
replicaCount: 1

# Hub pod readiness gates
readinessGates: []`,
      paths: ['image', 'image.repository', 'resources', 'replicaCount', 'readinessGates'],
    },
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
    output: {
      yamlContent: `# Ingress definition

# Enables TLS
tls: false

annotations: {}`,
      paths: ['tls', 'annotations'],
    },
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
    output: {
      yamlContent: `# Cluster resources definition

limits:${` `}
  cpu: 100m
  memory: 128Mi

requests:${` `}
  cpu: 100m
  memory: 128Mi`,
      paths: ['limits', 'limits.cpu', 'limits.memory', 'requests', 'requests.cpu', 'requests.memory'],
    },
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
    output: {
      yamlContent: `# KlustAIR frontend application

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
      paths: ['url', 'debug', 'appkey', 'phpfpm', 'apachedocumentroot'],
    },
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
    output: {
      yamlContent: `

podSecurityContext: {}`,
      paths: ['podSecurityContext'],
    },
  },
  {
    input: {
      type: 'object',
      title: 'Agent Group Chart Configuration',
      $schema: 'http://json-schema.org/draft-07/schema#',
      required: [
        'image',
        'agent',
        'hpa',
        'replicas',
        'resources',
        'revisionHistoryLimit',
        'affinity',
        'readinessProbe',
        'livenessProbe',
        'env',
      ],
      properties: {
        agent: {
          type: 'object',
          required: ['registerjson'],
          properties: {
            registerjson: {
              oneOf: [
                { type: 'object', additionalProperties: false },
                {
                  type: 'object',
                  required: ['cloudUrl', 'username', 'password', 'agentGroupId'],
                  properties: {
                    cloudUrl: { type: 'string', description: 'Base URL of the Jitterbit Harmony Cloud' },
                    password: {
                      type: 'string',
                      description: 'Encrypted password of the Agent Installer user (encrypted using JitterbitUtils)',
                    },
                    username: {
                      type: 'string',
                      description: 'Encrypted username of the Agent Installer user (encrypted using JitterbitUtils)',
                    },
                    retryCount: {
                      type: 'integer',
                      maximum: 300,
                      minimum: 0,
                      description:
                        'Number of retries if agent is having issues making the call to Harmony cloud for registration (defaults to 10, valid range is 0-300)',
                    },
                    agentGroupId: {
                      type: 'number',
                      description: 'Agent group ID from Management Console (hover over an agent group to see its ID)',
                    },
                    agentNamePrefix: { type: 'string', description: "Prefix for each auto-registered agent's name" },
                    retryIntervalSeconds: {
                      type: 'integer',
                      maximum: 600,
                      minimum: 5,
                      description:
                        'Number of seconds the agent will wait before retrying. This number doubles every retry to a maximum of 600 seconds (10 minutes). Defaults to 5, valid range 5-600.',
                    },
                    deregisterAgentOnDrainstop: {
                      type: 'boolean',
                      description: 'Performs agent deregistration on drainstop/JVM shutdown (defaults to false)',
                    },
                  },
                  additionalProperties: false,
                },
                { type: 'null' },
              ],
              description: "agent group's register.json file",
            },
            jitterbitconf: { type: ['string', 'null'], description: "Agent group's jitterbit.conf file" },
          },
          description: 'Agent Group specific configuration',
          additionalProperties: false,
        },
      },
      definitions: {
        env: {
          type: 'array',
          items: {
            $ref:
              'https://raw.githubusercontent.com/instrumenta/kubernetes-json-schema/master/v1.12.8-standalone-strict/_definitions.json#/definitions/io.k8s.api.core.v1.EnvVar',
          },
          minItems: 0,
          description: 'List of additional environment variables that may be specified in the container',
          uniqueItems: true,
          additionalItems: false,
        },
        replicas: {
          type: 'integer',
          minimum: 1,
          description: 'Number of replicas set if the horizontal pod autoscaler is disabled or malfunctioning',
        },
      },
      description: 'agent-group chart configuration',
      additionalProperties: false,
    },
    opts: { 'agent.registerjson': 1 },
    output: {
      paths: [
        'agent',
        'agent.registerjson',
        'agent.registerjson.cloudUrl',
        'agent.registerjson.password',
        'agent.registerjson.username',
        'agent.registerjson.retryCount',
        'agent.registerjson.agentGroupId',
        'agent.registerjson.agentNamePrefix',
        'agent.registerjson.retryIntervalSeconds',
        'agent.registerjson.deregisterAgentOnDrainstop',
        'agent.jitterbitconf',
      ],
      yamlContent: undefined,
    },
  },
  {
    input: {
      type: 'object',
      title: 'CMAK operator Helm values',
      required: ['cmak'],
      properties: {
        cmak: {
          type: 'object',
          required: ['basicAuth', 'clustersCommon', 'clusters'],
          additionalProperties: false,
          properties: {
            clusters: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'curatorConfig'],
                properties: {
                  kafkaVersion: {
                    type: 'string',
                    default: '2.2.0',
                  },
                  name: {
                    type: 'string',
                  },
                  enabled: {
                    type: 'boolean',
                    default: true,
                  },
                  curatorConfig: {
                    type: 'object',
                    required: ['zkConnect'],
                    properties: {
                      zkMaxRetry: {
                        type: 'integer',
                        default: 100,
                      },
                      maxSleepTimeMs: {
                        type: 'integer',
                        default: 1000,
                      },
                      baseSleepTimeMs: {
                        type: 'integer',
                        default: 100,
                      },
                      zkConnect: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
            basicAuth: {
              type: 'object',
              required: ['enabled'],
              additionalProperties: false,
              properties: {
                enabled: {
                  type: 'boolean',
                  title: 'enable Basic auth',
                  default: false,
                },
                password: {
                  type: 'string',
                  title: 'password for Basic auth',
                  default: '',
                },
                username: {
                  type: 'string',
                  title: 'username for Basic auth',
                  default: '',
                },
              },
            },
            clustersCommon: {
              type: 'object',
              required: ['curatorConfig'],
              properties: {
                kafkaVersion: {
                  type: 'string',
                  default: '2.2.0',
                },
                curatorConfig: {
                  type: 'object',
                  properties: {
                    zkMaxRetry: {
                      type: 'integer',
                      default: 100,
                    },
                    maxSleepTimeMs: {
                      type: 'integer',
                      default: 1000,
                    },
                    baseSleepTimeMs: {
                      type: 'integer',
                      default: 100,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    output: {
      yamlContent: `# CMAK operator Helm values

cmak:${' '}
  basicAuth:${' '}
    # enable Basic auth
    enabled: false
    # password for Basic auth
    password: ""
    # username for Basic auth
    username: ""
  clustersCommon:${' '}
    kafkaVersion: 2.2.0
    curatorConfig:${' '}
      zkMaxRetry: 100
      maxSleepTimeMs: 1000
      baseSleepTimeMs: 100`,
      paths: [
        'cmak',
        'cmak.clusters',
        'cmak.basicAuth',
        'cmak.basicAuth.enabled',
        'cmak.basicAuth.password',
        'cmak.basicAuth.username',
        'cmak.clustersCommon',
        'cmak.clustersCommon.kafkaVersion',
        'cmak.clustersCommon.curatorConfig',
        'cmak.clustersCommon.curatorConfig.zkMaxRetry',
        'cmak.clustersCommon.curatorConfig.maxSleepTimeMs',
        'cmak.clustersCommon.curatorConfig.baseSleepTimeMs',
      ],
    },
  },
  {
    input: {
      type: 'object',
      properties: {
        reconcile: {
          type: 'object',
          required: ['schedule'],
          additionalProperties: false,
          properties: {
            schedule: {
              type: 'string',
              title: 'cron expression for periodic reconciliation',
            },
            overwriteZk: {
              type: 'boolean',
              title: 'allow overwrite Zookeeper settings of CMAK',
              default: true,
            },
            failedJobsHistoryLimit: {
              type: ['null', 'integer'],
              title: 'how many failed jobs should be kept',
              default: null,
            },
            successfulJobsHistoryLimit: {
              type: ['null', 'integer'],
              title: 'how many completed jobs should be kept',
              default: null,
            },
          },
        },
      },
    },
    output: {
      yamlContent: `

reconcile:${' '}
  # allow overwrite Zookeeper settings of CMAK
  overwriteZk: true
  # how many failed jobs should be kept
  failedJobsHistoryLimit: null
  # how many completed jobs should be kept
  successfulJobsHistoryLimit: null`,
      paths: [
        'reconcile',
        'reconcile.schedule',
        'reconcile.overwriteZk',
        'reconcile.failedJobsHistoryLimit',
        'reconcile.successfulJobsHistoryLimit',
      ],
    },
  },
];

const testsIgnore: TestsIgnorePath[] = [
  {
    input: {},
    output: true,
  },
  {
    input: { level: 2, value: `""`, title: 'username for Basic auth' },
    output: false,
  },
  {
    input: { level: 2, value: undefined, title: 'username for Basic auth' },
    output: true,
  },
  {
    input: {
      level: 1,
      properties: {
        kafkaVersion: { level: 2, value: '2.2.0' },
        curatorConfig: {
          level: 2,
          properties: {
            zkMaxRetry: { level: 3, value: '100' },
            maxSleepTimeMs: { level: 3, value: '1000' },
            baseSleepTimeMs: { level: 3, value: '100' },
          },
        },
      },
    },
    output: false,
  },
  {
    input: {
      level: 1,
      properties: {
        kafkaVersion: { level: 2 },
        curatorConfig: {
          level: 2,
          properties: {
            zkMaxRetry: { level: 3 },
          },
        },
      },
    },
    output: true,
  },
  {
    input: {
      level: 1,
      properties: {
        kafkaVersion: { level: 2 },
        curatorConfig: {
          level: 2,
          properties: {
            zkMaxRetry: {
              level: 3,
              properties: {
                level: 4,
                value: 'value',
              },
            },
          },
        },
      },
    },
    output: true,
  },
  {
    input: { level: 2, value: 'false', title: 'enable Basic auth' },
    output: false,
  },
  { input: { level: 3, value: '100' }, output: false },
  { input: { level: 3 }, output: true },
];

describe('compoundJSONSchemaYAML', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns proper content', () => {
      const actual = compoundJSONSchemaYAML(tests[i].input, tests[i].opts || {});
      expect(actual).toEqual(tests[i].output);
    });
  }

  for (let i = 0; i < testsIgnore.length; i++) {
    it('ignoring path', () => {
      const actual = shouldIgnorePath(testsIgnore[i].input);
      expect(actual).toEqual(testsIgnore[i].output);
    });
  }
});
