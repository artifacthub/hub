import compoundJSONSchemaYAML, { shouldIgnorePath } from './compoundJSONSchemaYAML';

interface Tests {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any;
  opts?: { [key: string]: number };
  output: { yamlContent?: string; paths: string[] };
}

interface TestsIgnorePath {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            $ref: 'https://raw.githubusercontent.com/instrumenta/kubernetes-json-schema/master/v1.12.8-standalone-strict/_definitions.json#/definitions/io.k8s.api.core.v1.EnvVar',
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
  clusters:${' '}
    - kafkaVersion: 2.2.0
      enabled: true
      curatorConfig:${' '}
        zkMaxRetry: 100
        maxSleepTimeMs: 1000
        baseSleepTimeMs: 100
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
        'cmak.clusters[0]',
        'cmak.clusters[0].kafkaVersion',
        'cmak.clusters[0].name',
        'cmak.clusters[0].enabled',
        'cmak.clusters[0].curatorConfig',
        'cmak.clusters[0].curatorConfig.zkMaxRetry',
        'cmak.clusters[0].curatorConfig.maxSleepTimeMs',
        'cmak.clusters[0].curatorConfig.baseSleepTimeMs',
        'cmak.clusters[0].curatorConfig.zkConnect',
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
  {
    input: {
      $id: 'https://github.com/eshepelyuk/cmak-operator/',
      type: 'object',
      title: 'CMAK operator Helm values',
      $schema: 'http://json-schema.org/draft-07/schema#',
      required: ['cmak', 'reconcile', 'ui', 'zk'],
      definitions: {
        tls: {
          type: ['null', 'object'],
          title: 'use TLS secret',
          default: null,
          properties: { secret: { type: 'string', title: 'Secret name to attach to the ingress object' } },
        },
        resources: {
          type: 'object',
          title: 'resource requests and limits',
          required: ['limits', 'requests'],
          description: 'See https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/',
          additionalProperties: false,
          properties: {
            limits: { type: 'object', title: 'resource limits', default: {} },
            requests: { type: 'object', title: 'resource requests', default: {} },
          },
        },
        consumerSsl: {
          type: 'object',
          title: 'Consumer SSL configuration',
          default: null,
          properties: {
            keystore: {
              type: 'object',
              title: 'keystore configuration',
              properties: {
                type: { type: 'string' },
                value: { type: 'string', description: 'base64 encoded keystore' },
                password: { type: 'string' },
              },
            },
            truststore: {
              type: 'object',
              title: 'truststore configuration',
              properties: {
                type: { type: 'string' },
                value: { type: 'string', description: 'base64 encoded truststore' },
                password: { type: 'string' },
              },
            },
          },
        },
        clusterConfig: {
          type: 'object',
          title: 'config for particular cluster',
          required: ['name', 'curatorConfig'],
          properties: {
            jmxSsl: { type: 'boolean', default: false },
            enabled: { type: 'boolean', title: 'either cluster enabled', default: true },
            jmxPass: { type: ['null', 'string'], default: null },
            jmxUser: { type: ['null', 'string'], default: null },
            jmxEnabled: { type: 'boolean', default: false },
            kafkaVersion: { type: 'string', default: '2.2.0' },
            pollConsumers: { type: 'boolean', default: true },
            filterConsumers: { type: 'boolean', default: false },
            logkafkaEnabled: { type: 'boolean', default: false },
            displaySizeEnabled: { type: 'boolean', default: false },
            activeOffsetCacheEnabled: { type: 'boolean', default: true },
            name: { type: 'string', title: 'display name for the cluster' },
            curatorConfig: {
              type: 'object',
              required: ['zkConnect'],
              title: 'curator framework settings for zookeeper',
              properties: {
                zkMaxRetry: { type: 'integer', default: 100 },
                maxSleepTimeMs: { type: 'integer', default: 1000 },
                baseSleepTimeMs: { type: 'integer', default: 100 },
                zkConnect: {
                  type: 'string',
                  title: 'zookeeper connection string',
                  description: 'Zookeeper addresses joined by , host1:port,host2:port,host3:port',
                },
              },
            },
          },
        },
        curatorConfig: {
          type: 'object',
          required: ['zkConnect'],
          title: 'curator framework settings for zookeeper',
          properties: {
            zkMaxRetry: { type: 'integer', default: 100 },
            maxSleepTimeMs: { type: 'integer', default: 1000 },
            baseSleepTimeMs: { type: 'integer', default: 100 },
            zkConnect: {
              type: 'string',
              title: 'zookeeper connection string',
              description: 'Zookeeper addresses joined by , host1:port,host2:port,host3:port',
            },
          },
        },
        clusterConfigCommon: {
          type: 'object',
          title: 'common config for all declared clusters',
          required: ['curatorConfig'],
          properties: {
            jmxSsl: { type: 'boolean', default: false },
            enabled: { type: 'boolean', title: 'either cluster enabled', default: true },
            jmxPass: { type: ['null', 'string'], default: null },
            jmxUser: { type: ['null', 'string'], default: null },
            jmxEnabled: { type: 'boolean', default: false },
            kafkaVersion: { type: 'string', default: '2.2.0' },
            pollConsumers: { type: 'boolean', default: true },
            filterConsumers: { type: 'boolean', default: false },
            logkafkaEnabled: { type: 'boolean', default: false },
            displaySizeEnabled: { type: 'boolean', default: false },
            activeOffsetCacheEnabled: { type: 'boolean', default: true },
            curatorConfig: {
              type: 'object',
              title: 'curator framework settings for zookeeper',
              properties: {
                zkMaxRetry: { type: 'integer', default: 100 },
                maxSleepTimeMs: { type: 'integer', default: 1000 },
                baseSleepTimeMs: { type: 'integer', default: 100 },
              },
            },
          },
        },
        clusterConfigShared: {
          type: 'object',
          properties: {
            jmxSsl: { type: 'boolean', default: false },
            enabled: { type: 'boolean', title: 'either cluster enabled', default: true },
            jmxPass: { type: ['null', 'string'], default: null },
            jmxUser: { type: ['null', 'string'], default: null },
            jmxEnabled: { type: 'boolean', default: false },
            kafkaVersion: { type: 'string', default: '2.2.0' },
            pollConsumers: { type: 'boolean', default: true },
            filterConsumers: { type: 'boolean', default: false },
            logkafkaEnabled: { type: 'boolean', default: false },
            displaySizeEnabled: { type: 'boolean', default: false },
            activeOffsetCacheEnabled: { type: 'boolean', default: true },
          },
        },
        curatorConfigCommon: {
          type: 'object',
          title: 'curator framework settings for zookeeper',
          properties: {
            zkMaxRetry: { type: 'integer', default: 100 },
            maxSleepTimeMs: { type: 'integer', default: 1000 },
            baseSleepTimeMs: { type: 'integer', default: 100 },
          },
        },
      },
      properties: {
        ui: {
          type: 'object',
          title: 'ui container k8s settings',
          properties: {
            extraArgs: { type: 'array', title: 'extra cmd line arguments', default: [], items: { type: 'string' } },
            resources: {
              type: 'object',
              title: 'resource requests and limits',
              required: ['limits', 'requests'],
              description: 'See https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/',
              additionalProperties: false,
              properties: {
                limits: { type: 'object', title: 'resource limits', default: {} },
                requests: { type: 'object', title: 'resource requests', default: {} },
              },
            },
            consumerProperties: {
              type: 'object',
              title: 'provide key value base pairs for consumer properties according to java docs',
              default: {},
            },
            consumerPropertiesSsl: {
              type: 'object',
              title: 'Consumer SSL configuration',
              default: null,
              properties: {
                keystore: {
                  type: 'object',
                  title: 'keystore configuration',
                  properties: {
                    type: { type: 'string' },
                    value: { type: 'string', description: 'base64 encoded keystore' },
                    password: { type: 'string' },
                  },
                },
                truststore: {
                  type: 'object',
                  title: 'truststore configuration',
                  properties: {
                    type: { type: 'string' },
                    value: { type: 'string', description: 'base64 encoded truststore' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        zk: {
          type: 'object',
          title: 'zk container k8s settings',
          required: ['version'],
          additionalProperties: false,
          properties: {
            version: { type: 'string', title: 'zk version', default: '3.6.1' },
            resources: {
              type: 'object',
              title: 'resource requests and limits',
              required: ['limits', 'requests'],
              description: 'See https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/',
              additionalProperties: false,
              properties: {
                limits: { type: 'object', title: 'resource limits', default: {} },
                requests: { type: 'object', title: 'resource requests', default: {} },
              },
            },
          },
        },
        cmak: {
          type: 'object',
          title: 'cmak instance settings',
          required: ['clustersCommon', 'clusters'],
          description: 'Those settings are mirroring CMAK UI preferences.',
          additionalProperties: false,
          properties: {
            clusters: {
              type: 'array',
              title: 'list of configured clusters',
              items: {
                type: 'object',
                title: 'config for particular cluster',
                required: ['name', 'curatorConfig'],
                properties: {
                  jmxSsl: { type: 'boolean', default: false },
                  enabled: { type: 'boolean', title: 'either cluster enabled', default: true },
                  jmxPass: { type: ['null', 'string'], default: null },
                  jmxUser: { type: ['null', 'string'], default: null },
                  jmxEnabled: { type: 'boolean', default: false },
                  kafkaVersion: { type: 'string', default: '2.2.0' },
                  pollConsumers: { type: 'boolean', default: true },
                  filterConsumers: { type: 'boolean', default: false },
                  logkafkaEnabled: { type: 'boolean', default: false },
                  displaySizeEnabled: { type: 'boolean', default: false },
                  activeOffsetCacheEnabled: { type: 'boolean', default: true },
                  name: { type: 'string', title: 'display name for the cluster' },
                  curatorConfig: {
                    type: 'object',
                    required: ['zkConnect'],
                    title: 'curator framework settings for zookeeper',
                    properties: {
                      zkMaxRetry: { type: 'integer', default: 100 },
                      maxSleepTimeMs: { type: 'integer', default: 1000 },
                      baseSleepTimeMs: { type: 'integer', default: 100 },
                      zkConnect: {
                        type: 'string',
                        title: 'zookeeper connection string',
                        description: 'Zookeeper addresses joined by , host1:port,host2:port,host3:port',
                      },
                    },
                  },
                },
              },
            },
            clustersCommon: {
              type: 'object',
              title: 'common config for all declared clusters',
              required: ['curatorConfig'],
              properties: {
                jmxSsl: { type: 'boolean', default: false },
                enabled: { type: 'boolean', title: 'either cluster enabled', default: true },
                jmxPass: { type: ['null', 'string'], default: null },
                jmxUser: { type: ['null', 'string'], default: null },
                jmxEnabled: { type: 'boolean', default: false },
                kafkaVersion: { type: 'string', default: '2.2.0' },
                pollConsumers: { type: 'boolean', default: true },
                filterConsumers: { type: 'boolean', default: false },
                logkafkaEnabled: { type: 'boolean', default: false },
                displaySizeEnabled: { type: 'boolean', default: false },
                activeOffsetCacheEnabled: { type: 'boolean', default: true },
                curatorConfig: {
                  type: 'object',
                  title: 'curator framework settings for zookeeper',
                  properties: {
                    zkMaxRetry: { type: 'integer', default: 100 },
                    maxSleepTimeMs: { type: 'integer', default: 1000 },
                    baseSleepTimeMs: { type: 'integer', default: 100 },
                  },
                },
              },
            },
          },
        },
        ingress: {
          type: ['null', 'object'],
          title: 'ingress configuration',
          default: null,
          required: ['host', 'path'],
          description: 'If object not null, then Ingress resources will be created.',
          additionalProperties: false,
          properties: {
            tls: {
              type: ['null', 'object'],
              title: 'use TLS secret',
              default: null,
              properties: { secret: { type: 'string', title: 'Secret name to attach to the ingress object' } },
            },
            host: { type: 'string', title: 'ingress host' },
            path: { type: 'string', title: 'ingress path' },
            labels: { type: 'object', title: 'optional ingress labels', default: {} },
            annotations: { type: 'object', title: 'optional ingress annotations', default: {} },
          },
        },
        reconcile: {
          type: 'object',
          title: 'reconciliation job config',
          required: ['schedule'],
          additionalProperties: false,
          properties: {
            schedule: { type: 'string', title: 'cron expression for periodic reconciliation', default: '*/3 * * * *' },
            overwriteZk: { type: 'boolean', title: 'allow overwrite Zookeeper settings of CMAK', default: true },
            failedJobsHistoryLimit: {
              type: ['null', 'integer'],
              title: 'number of failed jobs to keep',
              default: null,
            },
            successfulJobsHistoryLimit: {
              type: ['null', 'integer'],
              title: 'number of completed jobs to keep',
              default: null,
            },
          },
        },
        imageRegistry: { type: 'string', title: 'docker registry for all images of the chart', default: 'docker.io' },
      },
    },
    output: {
      yamlContent:
        '# CMAK operator Helm values\n\n# ui container k8s settings\nui: \n  # extra cmd line arguments\n  extraArgs: []\n  # resource requests and limits\n  resources: \n    # resource limits\n    limits: {}\n    # resource requests\n    requests: {}\n  # provide key value base pairs for consumer properties according to java docs\n  consumerProperties: {}\n\n# zk container k8s settings\nzk: \n  # zk version\n  version: 3.6.1\n  # resource requests and limits\n  resources: \n    # resource limits\n    limits: {}\n    # resource requests\n    requests: {}\n\n# cmak instance settings\ncmak: \n  # list of configured clusters\n  clusters: \n    - jmxSsl: false\n      # either cluster enabled\n      enabled: true\n      jmxPass: null\n      jmxUser: null\n      jmxEnabled: false\n      kafkaVersion: 2.2.0\n      pollConsumers: true\n      filterConsumers: false\n      logkafkaEnabled: false\n      displaySizeEnabled: false\n      activeOffsetCacheEnabled: true\n      # curator framework settings for zookeeper\n      curatorConfig: \n        zkMaxRetry: 100\n        maxSleepTimeMs: 1000\n        baseSleepTimeMs: 100\n  # common config for all declared clusters\n  clustersCommon: \n    jmxSsl: false\n    # either cluster enabled\n    enabled: true\n    jmxPass: null\n    jmxUser: null\n    jmxEnabled: false\n    kafkaVersion: 2.2.0\n    pollConsumers: true\n    filterConsumers: false\n    logkafkaEnabled: false\n    displaySizeEnabled: false\n    activeOffsetCacheEnabled: true\n    # curator framework settings for zookeeper\n    curatorConfig: \n      zkMaxRetry: 100\n      maxSleepTimeMs: 1000\n      baseSleepTimeMs: 100\n\n# reconciliation job config\nreconcile: \n  # cron expression for periodic reconciliation\n  schedule: "*/3 * * * *"\n  # allow overwrite Zookeeper settings of CMAK\n  overwriteZk: true\n  # number of failed jobs to keep\n  failedJobsHistoryLimit: null\n  # number of completed jobs to keep\n  successfulJobsHistoryLimit: null\n\n# docker registry for all images of the chart\nimageRegistry: docker.io',
      paths: [
        'ui',
        'ui.extraArgs',
        'ui.resources',
        'ui.resources.limits',
        'ui.resources.requests',
        'ui.consumerProperties',
        'ui.consumerPropertiesSsl',
        'ui.consumerPropertiesSsl.keystore',
        'ui.consumerPropertiesSsl.keystore.type',
        'ui.consumerPropertiesSsl.keystore.value',
        'ui.consumerPropertiesSsl.keystore.password',
        'ui.consumerPropertiesSsl.truststore',
        'ui.consumerPropertiesSsl.truststore.type',
        'ui.consumerPropertiesSsl.truststore.value',
        'ui.consumerPropertiesSsl.truststore.password',
        'zk',
        'zk.version',
        'zk.resources',
        'zk.resources.limits',
        'zk.resources.requests',
        'cmak',
        'cmak.clusters[0]',
        'cmak.clusters[0].jmxSsl',
        'cmak.clusters[0].enabled',
        'cmak.clusters[0].jmxPass',
        'cmak.clusters[0].jmxUser',
        'cmak.clusters[0].jmxEnabled',
        'cmak.clusters[0].kafkaVersion',
        'cmak.clusters[0].pollConsumers',
        'cmak.clusters[0].filterConsumers',
        'cmak.clusters[0].logkafkaEnabled',
        'cmak.clusters[0].displaySizeEnabled',
        'cmak.clusters[0].activeOffsetCacheEnabled',
        'cmak.clusters[0].name',
        'cmak.clusters[0].curatorConfig',
        'cmak.clusters[0].curatorConfig.zkMaxRetry',
        'cmak.clusters[0].curatorConfig.maxSleepTimeMs',
        'cmak.clusters[0].curatorConfig.baseSleepTimeMs',
        'cmak.clusters[0].curatorConfig.zkConnect',
        'cmak.clustersCommon',
        'cmak.clustersCommon.jmxSsl',
        'cmak.clustersCommon.enabled',
        'cmak.clustersCommon.jmxPass',
        'cmak.clustersCommon.jmxUser',
        'cmak.clustersCommon.jmxEnabled',
        'cmak.clustersCommon.kafkaVersion',
        'cmak.clustersCommon.pollConsumers',
        'cmak.clustersCommon.filterConsumers',
        'cmak.clustersCommon.logkafkaEnabled',
        'cmak.clustersCommon.displaySizeEnabled',
        'cmak.clustersCommon.activeOffsetCacheEnabled',
        'cmak.clustersCommon.curatorConfig',
        'cmak.clustersCommon.curatorConfig.zkMaxRetry',
        'cmak.clustersCommon.curatorConfig.maxSleepTimeMs',
        'cmak.clustersCommon.curatorConfig.baseSleepTimeMs',
        'ingress',
        'ingress.tls',
        'ingress.tls.secret',
        'ingress.host',
        'ingress.path',
        'ingress.labels',
        'ingress.annotations',
        'reconcile',
        'reconcile.schedule',
        'reconcile.overwriteZk',
        'reconcile.failedJobsHistoryLimit',
        'reconcile.successfulJobsHistoryLimit',
        'imageRegistry',
      ],
    },
  },
  {
    input: {
      type: 'object',
      title: 'DagsterUserDeploymentsHelmValues',
      required: ['deployments'],
      properties: {
        deployments: {
          type: 'array',
          items: {
            type: 'object',
            title: 'UserDeployment',
            required: ['name', 'image', 'dagsterApiGrpcArgs', 'port'],
            properties: {
              env: { type: 'object', title: 'Env', additionalProperties: { type: 'string' } },
              name: { type: 'string', title: 'Name' },
              port: { type: 'integer', title: 'Port' },
              image: {
                type: 'object',
                title: 'Image',
                required: ['repository', 'tag', 'pullPolicy'],
                properties: {
                  tag: { type: 'string', title: 'Tag' },
                  pullPolicy: {
                    enum: ['Always', 'IfNotPresent', 'Never'],
                    type: 'string',
                    title: 'PullPolicy',
                    description: 'An enumeration.',
                  },
                  repository: { type: 'string', title: 'Repository' },
                },
              },
              affinity: {
                type: 'object',
                title: 'Affinity',
                description: 'Affinity is a group of affinity scheduling rules.',
                properties: { nodeAffinity: false, podAffinity: false, podAntiAffinity: false },
              },
              resources: {
                type: 'object',
                title: 'Resources',
                description: 'ResourceRequirements describes the compute resource requirements.',
                properties: {
                  limits: {
                    additionalProperties: false,
                    description:
                      'Limits describes the maximum amount of compute resources allowed. More info: https://kubernetes.io/docs/concepts/configuration/manage-compute-resources-container/',
                    type: 'object',
                  },
                  requests: {
                    additionalProperties: false,
                    description:
                      'Requests describes the minimum amount of compute resources required. If Requests is omitted for a container, it defaults to Limits if that is explicitly specified, otherwise to an implementation-defined value. More info: https://kubernetes.io/docs/concepts/configuration/manage-compute-resources-container/',
                    type: 'object',
                  },
                },
              },
              envSecrets: {
                type: 'array',
                items: {
                  type: 'object',
                  title: 'SecretEnvSource',
                  properties: {},
                  description:
                    "SecretEnvSource selects a Secret to populate the environment variables with.\n\nThe contents of the target Secret's Data field will represent the key-value pairs as environment variables.",
                },
                title: 'Envsecrets',
              },
              annotations: {
                type: 'object',
                title: 'Annotations',
                additionalProperties: { type: 'string' },
                description:
                  'Annotations is an unstructured key value map stored with a resource that may be set by external tools to store and retrieve arbitrary metadata. They are not queryable and should be preserved when modifying objects. More info: http://kubernetes.io/docs/user-guide/annotations',
              },
              tolerations: {
                type: 'array',
                items: { type: 'object' },
                title: 'Tolerations',
                description: "If specified, the pod's tolerations.",
              },
              nodeSelector: {
                type: 'object',
                title: 'NodeSelector',
                additionalProperties: { type: 'string' },
                description:
                  "NodeSelector is a selector which must be true for the pod to fit on a node. Selector which must match a node's labels for the pod to be scheduled on that node. More info: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/",
              },
              replicaCount: { type: 'integer', title: 'Replicacount', default: 1 },
              startupProbe: {
                type: 'object',
                title: 'StartupProbe',
                properties: {},
                description:
                  'Probe describes a health check to be performed against a container to determine whether it is alive or ready to receive traffic.',
              },
              envConfigMaps: {
                type: 'array',
                items: {
                  type: 'object',
                  title: 'ConfigMapEnvSource',
                  properties: {},
                  description:
                    "ConfigMapEnvSource selects a ConfigMap to populate the environment variables with.\n\nThe contents of the target ConfigMap's Data field will represent the key-value pairs as environment variables.",
                },
                title: 'Envconfigmaps',
              },
              livenessProbe: {
                type: 'object',
                title: 'LivenessProbe',
                properties: {},
                description:
                  'Probe describes a health check to be performed against a container to determine whether it is alive or ready to receive traffic.',
              },
              securityContext: {
                type: 'object',
                title: 'SecurityContext',
                description:
                  'SecurityContext holds security configuration that will be applied to a container. Some fields are present in both SecurityContext and PodSecurityContext.  When both are set, the values in SecurityContext take precedence.',
                properties: {
                  allowPrivilegeEscalation: {
                    description:
                      'AllowPrivilegeEscalation controls whether a process can gain more privileges than its parent process. This bool directly controls if the no_new_privs flag will be set on the container process. AllowPrivilegeEscalation is true always when the container is: 1) run as Privileged 2) has CAP_SYS_ADMIN',
                    type: 'boolean',
                  },
                  capabilities: false,
                  privileged: {
                    description:
                      'Run container in privileged mode. Processes in privileged containers are essentially equivalent to root on the host. Defaults to false.',
                    type: 'boolean',
                  },
                  procMount: {
                    description:
                      'procMount denotes the type of proc mount to use for the containers. The default is DefaultProcMount which uses the container runtime defaults for readonly paths and masked paths. This requires the ProcMountType feature flag to be enabled.',
                    type: 'string',
                  },
                  readOnlyRootFilesystem: {
                    description: 'Whether this container has a read-only root filesystem. Default is false.',
                    type: 'boolean',
                  },
                  runAsGroup: {
                    description:
                      'The GID to run the entrypoint of the container process. Uses runtime default if unset. May also be set in PodSecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence.',
                    format: 'int64',
                    type: 'integer',
                  },
                  runAsNonRoot: {
                    description:
                      'Indicates that the container must run as a non-root user. If true, the Kubelet will validate the image at runtime to ensure that it does not run as UID 0 (root) and fail to start the container if it does. If unset or false, no such validation will be performed. May also be set in PodSecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence.',
                    type: 'boolean',
                  },
                  runAsUser: {
                    description:
                      'The UID to run the entrypoint of the container process. Defaults to user specified in image metadata if unspecified. May also be set in PodSecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence.',
                    format: 'int64',
                    type: 'integer',
                  },
                  seLinuxOptions: false,
                  windowsOptions: false,
                },
              },
              dagsterApiGrpcArgs: { type: 'array', items: { type: 'string' }, title: 'Dagsterapigrpcargs' },
              podSecurityContext: {
                type: 'object',
                title: 'PodSecurityContext',
                description:
                  'PodSecurityContext holds pod-level security attributes and common container settings. Some fields are also present in container.securityContext.  Field values of container.securityContext take precedence over field values of PodSecurityContext.',
                properties: {
                  fsGroup: {
                    description:
                      "A special supplemental group that applies to all containers in a pod. Some volume types allow the Kubelet to change the ownership of that volume to be owned by the pod:\n\n1. The owning GID will be the FSGroup 2. The setgid bit is set (new files created in the volume will be owned by FSGroup) 3. The permission bits are OR'd with rw-rw----\n\nIf unset, the Kubelet will not modify the ownership and permissions of any volume.",
                    format: 'int64',
                    type: 'integer',
                  },
                  runAsGroup: {
                    description:
                      'The GID to run the entrypoint of the container process. Uses runtime default if unset. May also be set in SecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence for that container.',
                    format: 'int64',
                    type: 'integer',
                  },
                  runAsNonRoot: {
                    description:
                      'Indicates that the container must run as a non-root user. If true, the Kubelet will validate the image at runtime to ensure that it does not run as UID 0 (root) and fail to start the container if it does. If unset or false, no such validation will be performed. May also be set in SecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence.',
                    type: 'boolean',
                  },
                  runAsUser: {
                    description:
                      'The UID to run the entrypoint of the container process. Defaults to user specified in image metadata if unspecified. May also be set in SecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence for that container.',
                    format: 'int64',
                    type: 'integer',
                  },
                  seLinuxOptions: false,
                  supplementalGroups: {
                    description:
                      "A list of groups applied to the first process run in each container, in addition to the container's primary GID.  If unspecified, no groups will be added to any container.",
                    items: { format: 'int64', type: 'integer' },
                    type: 'array',
                  },
                  sysctls: {
                    description:
                      'Sysctls hold a list of namespaced sysctls used for the pod. Pods with unsupported sysctls (by the container runtime) might fail to launch.',
                    items: false,
                    type: 'array',
                  },
                  windowsOptions: false,
                },
              },
            },
          },
          title: 'Deployments',
        },
      },
      definitions: {
        Image: {
          type: 'object',
          title: 'Image',
          required: ['repository', 'tag', 'pullPolicy'],
          properties: {
            tag: { type: 'string', title: 'Tag' },
            pullPolicy: {
              enum: ['Always', 'IfNotPresent', 'Never'],
              type: 'string',
              title: 'PullPolicy',
              description: 'An enumeration.',
            },
            repository: { type: 'string', title: 'Repository' },
          },
        },
        Affinity: {
          type: 'object',
          title: 'Affinity',
          description: 'Affinity is a group of affinity scheduling rules.',
          properties: { nodeAffinity: false, podAffinity: false, podAntiAffinity: false },
        },
        Resources: {
          type: 'object',
          title: 'Resources',
          description: 'ResourceRequirements describes the compute resource requirements.',
          properties: {
            limits: {
              additionalProperties: false,
              description:
                'Limits describes the maximum amount of compute resources allowed. More info: https://kubernetes.io/docs/concepts/configuration/manage-compute-resources-container/',
              type: 'object',
            },
            requests: {
              additionalProperties: false,
              description:
                'Requests describes the minimum amount of compute resources required. If Requests is omitted for a container, it defaults to Limits if that is explicitly specified, otherwise to an implementation-defined value. More info: https://kubernetes.io/docs/concepts/configuration/manage-compute-resources-container/',
              type: 'object',
            },
          },
        },
        PullPolicy: {
          enum: ['Always', 'IfNotPresent', 'Never'],
          type: 'string',
          title: 'PullPolicy',
          description: 'An enumeration.',
        },
        Annotations: {
          type: 'object',
          title: 'Annotations',
          additionalProperties: { type: 'string' },
          description:
            'Annotations is an unstructured key value map stored with a resource that may be set by external tools to store and retrieve arbitrary metadata. They are not queryable and should be preserved when modifying objects. More info: http://kubernetes.io/docs/user-guide/annotations',
        },
        Tolerations: {
          type: 'array',
          items: { type: 'object' },
          title: 'Tolerations',
          description: "If specified, the pod's tolerations.",
        },
        NodeSelector: {
          type: 'object',
          title: 'NodeSelector',
          additionalProperties: { type: 'string' },
          description:
            "NodeSelector is a selector which must be true for the pod to fit on a node. Selector which must match a node's labels for the pod to be scheduled on that node. More info: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/",
        },
        StartupProbe: {
          type: 'object',
          title: 'StartupProbe',
          properties: {},
          description:
            'Probe describes a health check to be performed against a container to determine whether it is alive or ready to receive traffic.',
        },
        LivenessProbe: {
          type: 'object',
          title: 'LivenessProbe',
          properties: {},
          description:
            'Probe describes a health check to be performed against a container to determine whether it is alive or ready to receive traffic.',
        },
        UserDeployment: {
          type: 'object',
          title: 'UserDeployment',
          required: ['name', 'image', 'dagsterApiGrpcArgs', 'port'],
          properties: {
            env: { type: 'object', title: 'Env', additionalProperties: { type: 'string' } },
            name: { type: 'string', title: 'Name' },
            port: { type: 'integer', title: 'Port' },
            image: {
              type: 'object',
              title: 'Image',
              required: ['repository', 'tag', 'pullPolicy'],
              properties: {
                tag: { type: 'string', title: 'Tag' },
                pullPolicy: {
                  enum: ['Always', 'IfNotPresent', 'Never'],
                  type: 'string',
                  title: 'PullPolicy',
                  description: 'An enumeration.',
                },
                repository: { type: 'string', title: 'Repository' },
              },
            },
            affinity: {
              type: 'object',
              title: 'Affinity',
              description: 'Affinity is a group of affinity scheduling rules.',
              properties: { nodeAffinity: false, podAffinity: false, podAntiAffinity: false },
            },
            resources: {
              type: 'object',
              title: 'Resources',
              description: 'ResourceRequirements describes the compute resource requirements.',
              properties: {
                limits: {
                  additionalProperties: false,
                  description:
                    'Limits describes the maximum amount of compute resources allowed. More info: https://kubernetes.io/docs/concepts/configuration/manage-compute-resources-container/',
                  type: 'object',
                },
                requests: {
                  additionalProperties: false,
                  description:
                    'Requests describes the minimum amount of compute resources required. If Requests is omitted for a container, it defaults to Limits if that is explicitly specified, otherwise to an implementation-defined value. More info: https://kubernetes.io/docs/concepts/configuration/manage-compute-resources-container/',
                  type: 'object',
                },
              },
            },
            envSecrets: {
              type: 'array',
              items: {
                type: 'object',
                title: 'SecretEnvSource',
                properties: {},
                description:
                  "SecretEnvSource selects a Secret to populate the environment variables with.\n\nThe contents of the target Secret's Data field will represent the key-value pairs as environment variables.",
              },
              title: 'Envsecrets',
            },
            annotations: {
              type: 'object',
              title: 'Annotations',
              additionalProperties: { type: 'string' },
              description:
                'Annotations is an unstructured key value map stored with a resource that may be set by external tools to store and retrieve arbitrary metadata. They are not queryable and should be preserved when modifying objects. More info: http://kubernetes.io/docs/user-guide/annotations',
            },
            tolerations: {
              type: 'array',
              items: { type: 'object' },
              title: 'Tolerations',
              description: "If specified, the pod's tolerations.",
            },
            nodeSelector: {
              type: 'object',
              title: 'NodeSelector',
              additionalProperties: { type: 'string' },
              description:
                "NodeSelector is a selector which must be true for the pod to fit on a node. Selector which must match a node's labels for the pod to be scheduled on that node. More info: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/",
            },
            replicaCount: { type: 'integer', title: 'Replicacount', default: 1 },
            startupProbe: {
              type: 'object',
              title: 'StartupProbe',
              properties: {},
              description:
                'Probe describes a health check to be performed against a container to determine whether it is alive or ready to receive traffic.',
            },
            envConfigMaps: {
              type: 'array',
              items: {
                type: 'object',
                title: 'ConfigMapEnvSource',
                properties: {},
                description:
                  "ConfigMapEnvSource selects a ConfigMap to populate the environment variables with.\n\nThe contents of the target ConfigMap's Data field will represent the key-value pairs as environment variables.",
              },
              title: 'Envconfigmaps',
            },
            livenessProbe: {
              type: 'object',
              title: 'LivenessProbe',
              properties: {},
              description:
                'Probe describes a health check to be performed against a container to determine whether it is alive or ready to receive traffic.',
            },
            securityContext: {
              type: 'object',
              title: 'SecurityContext',
              description:
                'SecurityContext holds security configuration that will be applied to a container. Some fields are present in both SecurityContext and PodSecurityContext.  When both are set, the values in SecurityContext take precedence.',
              properties: {
                allowPrivilegeEscalation: {
                  description:
                    'AllowPrivilegeEscalation controls whether a process can gain more privileges than its parent process. This bool directly controls if the no_new_privs flag will be set on the container process. AllowPrivilegeEscalation is true always when the container is: 1) run as Privileged 2) has CAP_SYS_ADMIN',
                  type: 'boolean',
                },
                capabilities: false,
                privileged: {
                  description:
                    'Run container in privileged mode. Processes in privileged containers are essentially equivalent to root on the host. Defaults to false.',
                  type: 'boolean',
                },
                procMount: {
                  description:
                    'procMount denotes the type of proc mount to use for the containers. The default is DefaultProcMount which uses the container runtime defaults for readonly paths and masked paths. This requires the ProcMountType feature flag to be enabled.',
                  type: 'string',
                },
                readOnlyRootFilesystem: {
                  description: 'Whether this container has a read-only root filesystem. Default is false.',
                  type: 'boolean',
                },
                runAsGroup: {
                  description:
                    'The GID to run the entrypoint of the container process. Uses runtime default if unset. May also be set in PodSecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence.',
                  format: 'int64',
                  type: 'integer',
                },
                runAsNonRoot: {
                  description:
                    'Indicates that the container must run as a non-root user. If true, the Kubelet will validate the image at runtime to ensure that it does not run as UID 0 (root) and fail to start the container if it does. If unset or false, no such validation will be performed. May also be set in PodSecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence.',
                  type: 'boolean',
                },
                runAsUser: {
                  description:
                    'The UID to run the entrypoint of the container process. Defaults to user specified in image metadata if unspecified. May also be set in PodSecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence.',
                  format: 'int64',
                  type: 'integer',
                },
                seLinuxOptions: false,
                windowsOptions: false,
              },
            },
            dagsterApiGrpcArgs: { type: 'array', items: { type: 'string' }, title: 'Dagsterapigrpcargs' },
            podSecurityContext: {
              type: 'object',
              title: 'PodSecurityContext',
              description:
                'PodSecurityContext holds pod-level security attributes and common container settings. Some fields are also present in container.securityContext.  Field values of container.securityContext take precedence over field values of PodSecurityContext.',
              properties: {
                fsGroup: {
                  description:
                    "A special supplemental group that applies to all containers in a pod. Some volume types allow the Kubelet to change the ownership of that volume to be owned by the pod:\n\n1. The owning GID will be the FSGroup 2. The setgid bit is set (new files created in the volume will be owned by FSGroup) 3. The permission bits are OR'd with rw-rw----\n\nIf unset, the Kubelet will not modify the ownership and permissions of any volume.",
                  format: 'int64',
                  type: 'integer',
                },
                runAsGroup: {
                  description:
                    'The GID to run the entrypoint of the container process. Uses runtime default if unset. May also be set in SecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence for that container.',
                  format: 'int64',
                  type: 'integer',
                },
                runAsNonRoot: {
                  description:
                    'Indicates that the container must run as a non-root user. If true, the Kubelet will validate the image at runtime to ensure that it does not run as UID 0 (root) and fail to start the container if it does. If unset or false, no such validation will be performed. May also be set in SecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence.',
                  type: 'boolean',
                },
                runAsUser: {
                  description:
                    'The UID to run the entrypoint of the container process. Defaults to user specified in image metadata if unspecified. May also be set in SecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence for that container.',
                  format: 'int64',
                  type: 'integer',
                },
                seLinuxOptions: false,
                supplementalGroups: {
                  description:
                    "A list of groups applied to the first process run in each container, in addition to the container's primary GID.  If unspecified, no groups will be added to any container.",
                  items: { format: 'int64', type: 'integer' },
                  type: 'array',
                },
                sysctls: {
                  description:
                    'Sysctls hold a list of namespaced sysctls used for the pod. Pods with unsupported sysctls (by the container runtime) might fail to launch.',
                  items: false,
                  type: 'array',
                },
                windowsOptions: false,
              },
            },
          },
        },
        SecretEnvSource: {
          type: 'object',
          title: 'SecretEnvSource',
          properties: {},
          description:
            "SecretEnvSource selects a Secret to populate the environment variables with.\n\nThe contents of the target Secret's Data field will represent the key-value pairs as environment variables.",
        },
        SecurityContext: {
          type: 'object',
          title: 'SecurityContext',
          description:
            'SecurityContext holds security configuration that will be applied to a container. Some fields are present in both SecurityContext and PodSecurityContext.  When both are set, the values in SecurityContext take precedence.',
          properties: {
            allowPrivilegeEscalation: {
              description:
                'AllowPrivilegeEscalation controls whether a process can gain more privileges than its parent process. This bool directly controls if the no_new_privs flag will be set on the container process. AllowPrivilegeEscalation is true always when the container is: 1) run as Privileged 2) has CAP_SYS_ADMIN',
              type: 'boolean',
            },
            capabilities: false,
            privileged: {
              description:
                'Run container in privileged mode. Processes in privileged containers are essentially equivalent to root on the host. Defaults to false.',
              type: 'boolean',
            },
            procMount: {
              description:
                'procMount denotes the type of proc mount to use for the containers. The default is DefaultProcMount which uses the container runtime defaults for readonly paths and masked paths. This requires the ProcMountType feature flag to be enabled.',
              type: 'string',
            },
            readOnlyRootFilesystem: {
              description: 'Whether this container has a read-only root filesystem. Default is false.',
              type: 'boolean',
            },
            runAsGroup: {
              description:
                'The GID to run the entrypoint of the container process. Uses runtime default if unset. May also be set in PodSecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence.',
              format: 'int64',
              type: 'integer',
            },
            runAsNonRoot: {
              description:
                'Indicates that the container must run as a non-root user. If true, the Kubelet will validate the image at runtime to ensure that it does not run as UID 0 (root) and fail to start the container if it does. If unset or false, no such validation will be performed. May also be set in PodSecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence.',
              type: 'boolean',
            },
            runAsUser: {
              description:
                'The UID to run the entrypoint of the container process. Defaults to user specified in image metadata if unspecified. May also be set in PodSecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence.',
              format: 'int64',
              type: 'integer',
            },
            seLinuxOptions: false,
            windowsOptions: false,
          },
        },
        ConfigMapEnvSource: {
          type: 'object',
          title: 'ConfigMapEnvSource',
          properties: {},
          description:
            "ConfigMapEnvSource selects a ConfigMap to populate the environment variables with.\n\nThe contents of the target ConfigMap's Data field will represent the key-value pairs as environment variables.",
        },
        PodSecurityContext: {
          type: 'object',
          title: 'PodSecurityContext',
          description:
            'PodSecurityContext holds pod-level security attributes and common container settings. Some fields are also present in container.securityContext.  Field values of container.securityContext take precedence over field values of PodSecurityContext.',
          properties: {
            fsGroup: {
              description:
                "A special supplemental group that applies to all containers in a pod. Some volume types allow the Kubelet to change the ownership of that volume to be owned by the pod:\n\n1. The owning GID will be the FSGroup 2. The setgid bit is set (new files created in the volume will be owned by FSGroup) 3. The permission bits are OR'd with rw-rw----\n\nIf unset, the Kubelet will not modify the ownership and permissions of any volume.",
              format: 'int64',
              type: 'integer',
            },
            runAsGroup: {
              description:
                'The GID to run the entrypoint of the container process. Uses runtime default if unset. May also be set in SecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence for that container.',
              format: 'int64',
              type: 'integer',
            },
            runAsNonRoot: {
              description:
                'Indicates that the container must run as a non-root user. If true, the Kubelet will validate the image at runtime to ensure that it does not run as UID 0 (root) and fail to start the container if it does. If unset or false, no such validation will be performed. May also be set in SecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence.',
              type: 'boolean',
            },
            runAsUser: {
              description:
                'The UID to run the entrypoint of the container process. Defaults to user specified in image metadata if unspecified. May also be set in SecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence for that container.',
              format: 'int64',
              type: 'integer',
            },
            seLinuxOptions: false,
            supplementalGroups: {
              description:
                "A list of groups applied to the first process run in each container, in addition to the container's primary GID.  If unspecified, no groups will be added to any container.",
              items: { format: 'int64', type: 'integer' },
              type: 'array',
            },
            sysctls: {
              description:
                'Sysctls hold a list of namespaced sysctls used for the pod. Pods with unsupported sysctls (by the container runtime) might fail to launch.',
              items: false,
              type: 'array',
            },
            windowsOptions: false,
          },
        },
      },
      description: '@generated',
    },
    output: {
      yamlContent: undefined,
      paths: [
        'deployments[0]',
        'deployments[0].env',
        'deployments[0].name',
        'deployments[0].port',
        'deployments[0].image',
        'deployments[0].image.tag',
        'deployments[0].image.pullPolicy',
        'deployments[0].image.repository',
        'deployments[0].affinity',
        'deployments[0].affinity.nodeAffinity',
        'deployments[0].affinity.podAffinity',
        'deployments[0].affinity.podAntiAffinity',
        'deployments[0].resources',
        'deployments[0].resources.limits',
        'deployments[0].resources.requests',
        'deployments[0].envSecrets[0]',
        'deployments[0].annotations',
        'deployments[0].tolerations',
        'deployments[0].nodeSelector',
        'deployments[0].replicaCount',
        'deployments[0].startupProbe',
        'deployments[0].envConfigMaps[0]',
        'deployments[0].livenessProbe',
        'deployments[0].securityContext',
        'deployments[0].securityContext.allowPrivilegeEscalation',
        'deployments[0].securityContext.capabilities',
        'deployments[0].securityContext.privileged',
        'deployments[0].securityContext.procMount',
        'deployments[0].securityContext.readOnlyRootFilesystem',
        'deployments[0].securityContext.runAsGroup',
        'deployments[0].securityContext.runAsNonRoot',
        'deployments[0].securityContext.runAsUser',
        'deployments[0].securityContext.seLinuxOptions',
        'deployments[0].securityContext.windowsOptions',
        'deployments[0].dagsterApiGrpcArgs',
        'deployments[0].podSecurityContext',
        'deployments[0].podSecurityContext.fsGroup',
        'deployments[0].podSecurityContext.runAsGroup',
        'deployments[0].podSecurityContext.runAsNonRoot',
        'deployments[0].podSecurityContext.runAsUser',
        'deployments[0].podSecurityContext.seLinuxOptions',
        'deployments[0].podSecurityContext.supplementalGroups',
        'deployments[0].podSecurityContext.sysctls',
        'deployments[0].podSecurityContext.windowsOptions',
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
