import { waitFor } from '@testing-library/react';
import { mocked } from 'jest-mock';

import API from '../api';
import { JSONSchema } from '../jsonschema';
import dereferenceJSONSchema from './dereference';
jest.mock('../api');

interface Test {
  input: JSONSchema;
  output: JSONSchema;
  externalRefs: boolean;
}

const DEFS = {
  definitions: {
    'io.k8s.api.core.v1.ResourceRequirements': {
      description: 'ResourceRequirements describes the compute resource requirements.',
      properties: {
        limits: {
          additionalProperties: {
            $ref: '#/definitions/io.k8s.apimachinery.pkg.api.resource.Quantity',
          },
          description:
            'Limits describes the maximum amount of compute resources allowed. More info: https://kubernetes.io/docs/concepts/configuration/manage-compute-resources-container/',
          type: 'object',
        },
        requests: {
          additionalProperties: {
            $ref: '#/definitions/io.k8s.apimachinery.pkg.api.resource.Quantity',
          },
          description:
            'Requests describes the minimum amount of compute resources required. If Requests is omitted for a container, it defaults to Limits if that is explicitly specified, otherwise to an implementation-defined value. More info: https://kubernetes.io/docs/concepts/configuration/manage-compute-resources-container/',
          type: 'object',
        },
      },
      type: 'object',
    },
    'io.k8s.api.core.v1.Probe': {
      description:
        'Probe describes a health check to be performed against a container to determine whether it is alive or ready to receive traffic.',
      properties: {
        exec: {
          $ref: '#/definitions/io.k8s.api.core.v1.ExecAction',
          description: 'One and only one of the following should be specified. Exec specifies the action to take.',
        },
        failureThreshold: {
          description:
            'Minimum consecutive failures for the probe to be considered failed after having succeeded. Defaults to 3. Minimum value is 1.',
          format: 'int32',
          type: 'integer',
        },
        httpGet: {
          $ref: '#/definitions/io.k8s.api.core.v1.HTTPGetAction',
          description: 'HTTPGet specifies the http request to perform.',
        },
        initialDelaySeconds: {
          description:
            'Number of seconds after the container has started before liveness probes are initiated. More info: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle#container-probes',
          format: 'int32',
          type: 'integer',
        },
        periodSeconds: {
          description: 'How often (in seconds) to perform the probe. Default to 10 seconds. Minimum value is 1.',
          format: 'int32',
          type: 'integer',
        },
        successThreshold: {
          description:
            'Minimum consecutive successes for the probe to be considered successful after having failed. Defaults to 1. Must be 1 for liveness and startup. Minimum value is 1.',
          format: 'int32',
          type: 'integer',
        },
        tcpSocket: {
          $ref: '#/definitions/io.k8s.api.core.v1.TCPSocketAction',
          description: 'TCPSocket specifies an action involving a TCP port. TCP hooks not yet supported',
        },
        timeoutSeconds: {
          description:
            'Number of seconds after which the probe times out. Defaults to 1 second. Minimum value is 1. More info: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle#container-probes',
          format: 'int32',
          type: 'integer',
        },
      },
      type: 'object',
    },
    'io.k8s.api.core.v1.PodReadinessGate': {
      description: 'PodReadinessGate contains the reference to a pod condition',
      properties: {
        conditionType: {
          description: "ConditionType refers to a condition in the pod's condition list with matching type.",
          type: 'string',
        },
      },
      required: ['conditionType'],
      type: 'object',
    },
    'io.k8s.api.networking.v1.IngressTLS': {
      description: 'IngressTLS describes the transport layer security associated with an Ingress.',
      properties: {
        hosts: {
          description:
            'Hosts are a list of hosts included in the TLS certificate. The values in this list must match the name/s used in the tlsSecret. Defaults to the wildcard host setting for the loadbalancer controller fulfilling this Ingress, if left unspecified.',
          items: {
            type: 'string',
          },
          type: 'array',
          'x-kubernetes-list-type': 'atomic',
        },
        secretName: {
          description:
            'SecretName is the name of the secret used to terminate TLS traffic on port 443. Field is left optional to allow TLS routing based on SNI hostname alone. If the SNI host in a listener conflicts with the "Host" header field used by an IngressRule, the SNI host is used for termination and value of the Host header is used for routing.',
          type: 'string',
        },
      },
      type: 'object',
    },
    'io.k8s.api.networking.v1beta1.IngressRule': {
      description:
        'IngressRule represents the rules mapping the paths under a specified host to the related backend services. Incoming requests are first evaluated for a host match, then routed to the backend associated with the matching IngressRuleValue.',
      properties: {
        host: {
          description:
            'Host is the fully qualified domain name of a network host, as defined by RFC 3986. Note the following deviations from the "host" part of the URI as defined in RFC 3986: 1. IPs are not allowed. Currently an IngressRuleValue can only apply to\n   the IP in the Spec of the parent Ingress.\n2. The `:` delimiter is not respected because ports are not allowed.\n\t  Currently the port of an Ingress is implicitly :80 for http and\n\t  :443 for https.\nBoth these may change in the future. Incoming requests are matched against the host before the IngressRuleValue. If the host is unspecified, the Ingress routes all traffic based on the specified IngressRuleValue.\n\nHost can be "precise" which is a domain name without the terminating dot of a network host (e.g. "foo.bar.com") or "wildcard", which is a domain name prefixed with a single wildcard label (e.g. "*.foo.com"). The wildcard character \'*\' must appear by itself as the first DNS label and matches only a single label. You cannot have a wildcard label by itself (e.g. Host == "*"). Requests will be matched against the Host field in the following way: 1. If Host is precise, the request matches this rule if the http host header is equal to Host. 2. If Host is a wildcard, then the request matches this rule if the http host header is to equal to the suffix (removing the first label) of the wildcard rule.',
          type: 'string',
        },
        http: {
          $ref: '#/definitions/io.k8s.api.networking.v1beta1.HTTPIngressRuleValue',
        },
      },
      type: 'object',
    },
  },
};

const tests: Test[] = [
  { externalRefs: false, input: {}, output: {} },
  {
    externalRefs: false,
    input: {
      $id: 'https://github.com/eshepelyuk/cmak-operator/',
      type: 'object',
      title: 'CMAK operator Helm values',
      $schema: 'http://json-schema.org/draft-07/schema#',
      required: ['cmak', 'reconcile', 'ui', 'zk'],
      properties: {
        ui: {
          type: 'object',
          title: 'ui container k8s settings',
          required: ['image'],
          properties: {
            port: { type: 'integer', default: 9000 },
            image: { $ref: '#/definitions/image' },
            extraEnv: {
              type: 'array',
              items: { type: 'object' },
              title: 'optional environment variables',
              default: [],
            },
            extraArgs: { type: 'array', items: { type: 'string' }, title: 'extra cmd line arguments', default: [] },
            resources: { $ref: '#/definitions/resources' },
            consumerProperties: {
              type: 'object',
              title: 'provide key value base pairs for consumer properties according to java docs',
              default: {},
            },
            consumerPropertiesSsl: { $ref: '#/definitions/consumerSsl' },
          },
          additionalProperties: false,
        },
        zk: {
          type: 'object',
          title: 'zk container k8s settings',
          required: ['image'],
          properties: { image: { $ref: '#/definitions/image' }, resources: { $ref: '#/definitions/resources' } },
          additionalProperties: false,
        },
        cmak: {
          type: 'object',
          title: 'cmak instance settings',
          required: ['clustersCommon', 'clusters'],
          properties: {
            clusters: {
              type: 'array',
              items: { $ref: '#/definitions/clusterConfig' },
              title: 'list of configured clusters',
            },
            clustersCommon: { $ref: '#/definitions/clusterConfigCommon' },
          },
          description: 'Those settings are mirroring CMAK UI preferences.',
          additionalProperties: false,
        },
        ingress: {
          type: ['null', 'object'],
          title: 'ingress configuration',
          default: null,
          required: ['host', 'path'],
          properties: {
            tls: { $ref: '#/definitions/tls' },
            host: { type: 'string', title: 'ingress host' },
            path: { type: 'string', title: 'ingress path' },
            labels: { type: 'object', title: 'optional ingress labels', default: {} },
            pathType: { type: 'string', title: 'ingress pathType', default: 'ImplementationSpecific' },
            annotations: { type: 'object', title: 'optional ingress annotations', default: {} },
          },
          description: 'If object not null, then Ingress resources will be created.',
          additionalProperties: false,
        },
        affinity: {
          type: 'object',
          title: 'affinity',
          default: {},
          description:
            'See https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity',
        },
        reconcile: {
          type: 'object',
          title: 'reconciliation job config',
          required: ['image', 'schedule'],
          properties: {
            image: { $ref: '#/definitions/image' },
            schedule: { type: 'string', title: 'cron expression for periodic reconciliation', default: '*/3 * * * *' },
            resources: { $ref: '#/definitions/resources' },
            annotations: {
              type: 'object',
              title: 'optional annotations to apply to the pods spun up via the job',
              default: {},
            },
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
          additionalProperties: false,
        },
        tolerations: {
          type: 'array',
          items: { type: 'object' },
          title: 'tolerations',
          default: [],
          description: 'See https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/',
        },
        nodeSelector: {
          type: 'object',
          title: 'node selector',
          default: {},
          description: 'See https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes/',
        },
      },
      definitions: {
        tls: {
          type: ['null', 'object'],
          title: 'use TLS secret',
          default: null,
          properties: { secret: { type: 'string', title: 'Secret name to attach to the ingress object' } },
        },
        image: {
          type: 'object',
          title: 'docker image configuration',
          required: ['repository', 'tag'],
          properties: {
            tag: { type: 'string' },
            pullPolicy: { type: 'string', default: 'IfNotPresent' },
            repository: { type: 'string' },
          },
        },
        resources: {
          type: 'object',
          title: 'resource requests and limits',
          required: ['limits', 'requests'],
          properties: {
            limits: { type: 'object', title: 'resource limits', default: {} },
            requests: { type: 'object', title: 'resource requests', default: {} },
          },
          description: 'See https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/',
          additionalProperties: false,
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
          allOf: [
            { $ref: '#/definitions/clusterConfigShared' },
            {
              properties: {
                name: { type: 'string', title: 'display name for the cluster' },
                curatorConfig: { $ref: '#/definitions/curatorConfig' },
              },
            },
          ],
          title: 'config for particular cluster',
          required: ['name', 'curatorConfig'],
        },
        curatorConfig: {
          type: 'object',
          allOf: [
            { $ref: '#/definitions/curatorConfigCommon' },
            {
              properties: {
                zkConnect: {
                  type: 'string',
                  title: 'zookeeper connection string',
                  description: 'Zookeeper addresses joined by , host1:port,host2:port,host3:port',
                },
              },
            },
          ],
          required: ['zkConnect'],
        },
        clusterConfigCommon: {
          type: 'object',
          allOf: [
            { $ref: '#/definitions/clusterConfigShared' },
            { properties: { curatorConfig: { $ref: '#/definitions/curatorConfigCommon' } } },
          ],
          title: 'common config for all declared clusters',
          required: ['curatorConfig'],
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
    },
    output: {
      $id: 'https://github.com/eshepelyuk/cmak-operator/',
      type: 'object',
      title: 'CMAK operator Helm values',
      $schema: 'http://json-schema.org/draft-07/schema#',
      required: ['cmak', 'reconcile', 'ui', 'zk'],
      properties: {
        ui: {
          type: 'object',
          title: 'ui container k8s settings',
          required: ['image'],
          properties: {
            port: { type: 'integer', default: 9000 },
            image: {
              type: 'object',
              title: 'docker image configuration',
              required: ['repository', 'tag'],
              properties: {
                tag: { type: 'string' },
                pullPolicy: { type: 'string', default: 'IfNotPresent' },
                repository: { type: 'string' },
              },
            },
            extraEnv: {
              type: 'array',
              items: { type: 'object' },
              title: 'optional environment variables',
              default: [],
            },
            extraArgs: { type: 'array', items: { type: 'string' }, title: 'extra cmd line arguments', default: [] },
            resources: {
              type: 'object',
              title: 'resource requests and limits',
              required: ['limits', 'requests'],
              properties: {
                limits: { type: 'object', title: 'resource limits', default: {} },
                requests: { type: 'object', title: 'resource requests', default: {} },
              },
              description: 'See https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/',
              additionalProperties: false,
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
          additionalProperties: false,
        },
        zk: {
          type: 'object',
          title: 'zk container k8s settings',
          required: ['image'],
          properties: {
            image: {
              type: 'object',
              title: 'docker image configuration',
              required: ['repository', 'tag'],
              properties: {
                tag: { type: 'string' },
                pullPolicy: { type: 'string', default: 'IfNotPresent' },
                repository: { type: 'string' },
              },
            },
            resources: {
              type: 'object',
              title: 'resource requests and limits',
              required: ['limits', 'requests'],
              properties: {
                limits: { type: 'object', title: 'resource limits', default: {} },
                requests: { type: 'object', title: 'resource requests', default: {} },
              },
              description: 'See https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/',
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
        cmak: {
          type: 'object',
          title: 'cmak instance settings',
          required: ['clustersCommon', 'clusters'],
          properties: {
            clusters: {
              type: 'array',
              items: {
                type: 'object',
                allOf: [
                  {
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
                  {
                    properties: {
                      name: { type: 'string', title: 'display name for the cluster' },
                      curatorConfig: {
                        type: 'object',
                        allOf: [
                          {
                            type: 'object',
                            title: 'curator framework settings for zookeeper',
                            properties: {
                              zkMaxRetry: { type: 'integer', default: 100 },
                              maxSleepTimeMs: { type: 'integer', default: 1000 },
                              baseSleepTimeMs: { type: 'integer', default: 100 },
                            },
                          },
                          {
                            properties: {
                              zkConnect: {
                                type: 'string',
                                title: 'zookeeper connection string',
                                description: 'Zookeeper addresses joined by , host1:port,host2:port,host3:port',
                              },
                            },
                          },
                        ],
                        required: ['zkConnect'],
                      },
                    },
                  },
                ],
                title: 'config for particular cluster',
                required: ['name', 'curatorConfig'],
              },
              title: 'list of configured clusters',
            },
            clustersCommon: {
              type: 'object',
              allOf: [
                {
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
                {
                  properties: {
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
              ],
              title: 'common config for all declared clusters',
              required: ['curatorConfig'],
            },
          },
          description: 'Those settings are mirroring CMAK UI preferences.',
          additionalProperties: false,
        },
        ingress: {
          type: ['null', 'object'],
          title: 'ingress configuration',
          default: null,
          required: ['host', 'path'],
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
            pathType: { type: 'string', title: 'ingress pathType', default: 'ImplementationSpecific' },
            annotations: { type: 'object', title: 'optional ingress annotations', default: {} },
          },
          description: 'If object not null, then Ingress resources will be created.',
          additionalProperties: false,
        },
        affinity: {
          type: 'object',
          title: 'affinity',
          default: {},
          description:
            'See https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity',
        },
        reconcile: {
          type: 'object',
          title: 'reconciliation job config',
          required: ['image', 'schedule'],
          properties: {
            image: {
              type: 'object',
              title: 'docker image configuration',
              required: ['repository', 'tag'],
              properties: {
                tag: { type: 'string' },
                pullPolicy: { type: 'string', default: 'IfNotPresent' },
                repository: { type: 'string' },
              },
            },
            schedule: { type: 'string', title: 'cron expression for periodic reconciliation', default: '*/3 * * * *' },
            resources: {
              type: 'object',
              title: 'resource requests and limits',
              required: ['limits', 'requests'],
              properties: {
                limits: { type: 'object', title: 'resource limits', default: {} },
                requests: { type: 'object', title: 'resource requests', default: {} },
              },
              description: 'See https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/',
              additionalProperties: false,
            },
            annotations: {
              type: 'object',
              title: 'optional annotations to apply to the pods spun up via the job',
              default: {},
            },
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
          additionalProperties: false,
        },
        tolerations: {
          type: 'array',
          items: { type: 'object' },
          title: 'tolerations',
          default: [],
          description: 'See https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/',
        },
        nodeSelector: {
          type: 'object',
          title: 'node selector',
          default: {},
          description: 'See https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes/',
        },
      },
      definitions: {
        tls: {
          type: ['null', 'object'],
          title: 'use TLS secret',
          default: null,
          properties: { secret: { type: 'string', title: 'Secret name to attach to the ingress object' } },
        },
        image: {
          type: 'object',
          title: 'docker image configuration',
          required: ['repository', 'tag'],
          properties: {
            tag: { type: 'string' },
            pullPolicy: { type: 'string', default: 'IfNotPresent' },
            repository: { type: 'string' },
          },
        },
        resources: {
          type: 'object',
          title: 'resource requests and limits',
          required: ['limits', 'requests'],
          properties: {
            limits: { type: 'object', title: 'resource limits', default: {} },
            requests: { type: 'object', title: 'resource requests', default: {} },
          },
          description: 'See https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/',
          additionalProperties: false,
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
          allOf: [
            { $ref: '#/definitions/clusterConfigShared' },
            {
              properties: {
                name: { type: 'string', title: 'display name for the cluster' },
                curatorConfig: { $ref: '#/definitions/curatorConfig' },
              },
            },
          ],
          title: 'config for particular cluster',
          required: ['name', 'curatorConfig'],
        },
        curatorConfig: {
          type: 'object',
          allOf: [
            { $ref: '#/definitions/curatorConfigCommon' },
            {
              properties: {
                zkConnect: {
                  type: 'string',
                  title: 'zookeeper connection string',
                  description: 'Zookeeper addresses joined by , host1:port,host2:port,host3:port',
                },
              },
            },
          ],
          required: ['zkConnect'],
        },
        clusterConfigCommon: {
          type: 'object',
          allOf: [
            { $ref: '#/definitions/clusterConfigShared' },
            { properties: { curatorConfig: { $ref: '#/definitions/curatorConfigCommon' } } },
          ],
          title: 'common config for all declared clusters',
          required: ['curatorConfig'],
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
    },
  },
  {
    externalRefs: false,
    input: {
      type: 'object',
      title: 'Values',
      $schema: 'http://json-schema.org/draft-07/schema#',
      properties: {
        name: { type: 'string', description: 'name of the deployment' },
        rbac: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'name of roles and rolebindings' },
            create: { type: 'boolean', description: 'required roles and rolebindings will be created' },
          },
        },
        image: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'image tag' },
            pullPolicy: { enum: ['Always', 'Never', 'IfNotPresent'], type: 'string', description: 'image pull policy' },
            repository: { type: 'string', description: 'image repository' },
          },
        },
        logging: {
          type: 'object',
          properties: {
            level: {
              enum: ['debug', 'info', 'error'],
              type: 'string',
              description: 'logging level of operator (debug, info, or error)',
            },
            format: {
              enum: ['console', 'json'],
              type: 'string',
              description: 'logging format of operator (console or json)',
            },
            stacktraceLevel: {
              enum: ['debug', 'info', 'error'],
              type: 'string',
              description: 'minimum log level triggers stacktrace generation',
            },
          },
        },
        service: {
          type: 'object',
          properties: {
            type: {
              enum: ['ClusterIP', 'LoadBalancer', 'NodePort'],
              type: 'string',
              description: 'service type: ClusterIP, LoadBalancer or NodePort',
            },
            labels: { type: 'object', description: 'service labels' },
            enabled: { type: 'boolean', description: 'service enabled' },
            annotations: { type: 'object', description: 'service annotations' },
            externalTrafficPolicy: {
              type: 'string',
              description:
                'external traffic policy (can be specified when service type is LoadBalancer or NodePort) : Cluster or Local',
            },
          },
        },
        affinity: { type: 'object', description: 'affinity' },
        replicas: { type: 'integer', description: 'number of replicas' },
        resources: { type: 'object', description: 'kubernetes resources of pod' },
        healthPort: { type: 'integer', description: 'port of health endpoint' },
        namespaced: {
          type: 'boolean',
          description:
            'if it is true, operator will behave as a namespace-scoped operator, if it is false, it will behave as a cluster-scoped operator.',
        },
        annotations: { type: 'object', description: 'deployment annotations' },
        metricsPort: { type: 'integer', description: 'port of metrics endpoint' },
        tolerations: { type: 'array', items: { type: 'object' }, description: 'tolerations' },
        nodeSelector: { type: 'object', description: 'node labels for pod assignment' },
        enableMetrics: { type: 'boolean', description: 'enable metrics endpoint' },
        livenessProbe: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean', description: 'enable liveness probe.' },
            httpGet: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'readiness probe path' },
                port: { type: 'string', description: 'readiness probe port' },
                scheme: { type: 'string', description: 'readiness probe scheme' },
              },
            },
            periodSeconds: { type: 'integer', description: 'liveness probe period seconds' },
            timeoutSeconds: { type: 'integer', description: 'liveness probe timeout seconds' },
            failureThreshold: { type: 'integer', description: 'liveness probe failure threshold' },
            successThreshold: { type: 'integer', description: 'liveness probe success threshold' },
            initialDelaySeconds: { type: 'integer', description: 'liveness probe initial delay seconds' },
          },
        },
        podAnnotations: { type: 'object', description: 'pod annotations' },
        readinessProbe: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean', description: 'enable readiness probe.' },
            httpGet: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'readiness probe path' },
                port: { type: 'string', description: 'readiness probe port' },
                scheme: { type: 'string', description: 'readiness probe scheme' },
              },
            },
            periodSeconds: { type: 'integer', description: 'liveness probe period seconds' },
            timeoutSeconds: { type: 'integer', description: 'liveness probe timeout seconds' },
            failureThreshold: { type: 'integer', description: 'liveness probe failure threshold' },
            successThreshold: { type: 'integer', description: 'liveness probe success threshold' },
            initialDelaySeconds: { type: 'integer', description: 'liveness probe initial delay seconds' },
          },
        },
        serviceAccount: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'name of service account' },
            create: { type: 'boolean', description: 'service account will be created' },
          },
        },
        reconcilePeriod: { type: 'string', description: 'reconcile duration of operator' },
        securityContext: { type: 'object', description: 'security context for container' },
        watchNamespaces: {
          type: 'string',
          description:
            'comma separated names of namespaces to watch, if it is empty, the namespace that the operator exists in is used.',
        },
        leaderElectionID: {
          type: 'string',
          description: 'name of the configmap that is used for holding the leader lock.',
        },
        podSecurityContext: { type: 'object', description: 'security context for pod' },
        enableLeaderElection: { type: 'boolean', description: 'enable leader election for controller manager.' },
        maxConcurrentReconciles: { type: 'integer', description: 'max number of concurrent reconciles' },
      },
    },
    output: {
      type: 'object',
      title: 'Values',
      $schema: 'http://json-schema.org/draft-07/schema#',
      properties: {
        name: { type: 'string', description: 'name of the deployment' },
        rbac: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'name of roles and rolebindings' },
            create: { type: 'boolean', description: 'required roles and rolebindings will be created' },
          },
        },
        image: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'image tag' },
            pullPolicy: { enum: ['Always', 'Never', 'IfNotPresent'], type: 'string', description: 'image pull policy' },
            repository: { type: 'string', description: 'image repository' },
          },
        },
        logging: {
          type: 'object',
          properties: {
            level: {
              enum: ['debug', 'info', 'error'],
              type: 'string',
              description: 'logging level of operator (debug, info, or error)',
            },
            format: {
              enum: ['console', 'json'],
              type: 'string',
              description: 'logging format of operator (console or json)',
            },
            stacktraceLevel: {
              enum: ['debug', 'info', 'error'],
              type: 'string',
              description: 'minimum log level triggers stacktrace generation',
            },
          },
        },
        service: {
          type: 'object',
          properties: {
            type: {
              enum: ['ClusterIP', 'LoadBalancer', 'NodePort'],
              type: 'string',
              description: 'service type: ClusterIP, LoadBalancer or NodePort',
            },
            labels: { type: 'object', description: 'service labels' },
            enabled: { type: 'boolean', description: 'service enabled' },
            annotations: { type: 'object', description: 'service annotations' },
            externalTrafficPolicy: {
              type: 'string',
              description:
                'external traffic policy (can be specified when service type is LoadBalancer or NodePort) : Cluster or Local',
            },
          },
        },
        affinity: { type: 'object', description: 'affinity' },
        replicas: { type: 'integer', description: 'number of replicas' },
        resources: { type: 'object', description: 'kubernetes resources of pod' },
        healthPort: { type: 'integer', description: 'port of health endpoint' },
        namespaced: {
          type: 'boolean',
          description:
            'if it is true, operator will behave as a namespace-scoped operator, if it is false, it will behave as a cluster-scoped operator.',
        },
        annotations: { type: 'object', description: 'deployment annotations' },
        metricsPort: { type: 'integer', description: 'port of metrics endpoint' },
        tolerations: { type: 'array', items: { type: 'object' }, description: 'tolerations' },
        nodeSelector: { type: 'object', description: 'node labels for pod assignment' },
        enableMetrics: { type: 'boolean', description: 'enable metrics endpoint' },
        livenessProbe: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean', description: 'enable liveness probe.' },
            httpGet: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'readiness probe path' },
                port: { type: 'string', description: 'readiness probe port' },
                scheme: { type: 'string', description: 'readiness probe scheme' },
              },
            },
            periodSeconds: { type: 'integer', description: 'liveness probe period seconds' },
            timeoutSeconds: { type: 'integer', description: 'liveness probe timeout seconds' },
            failureThreshold: { type: 'integer', description: 'liveness probe failure threshold' },
            successThreshold: { type: 'integer', description: 'liveness probe success threshold' },
            initialDelaySeconds: { type: 'integer', description: 'liveness probe initial delay seconds' },
          },
        },
        podAnnotations: { type: 'object', description: 'pod annotations' },
        readinessProbe: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean', description: 'enable readiness probe.' },
            httpGet: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'readiness probe path' },
                port: { type: 'string', description: 'readiness probe port' },
                scheme: { type: 'string', description: 'readiness probe scheme' },
              },
            },
            periodSeconds: { type: 'integer', description: 'liveness probe period seconds' },
            timeoutSeconds: { type: 'integer', description: 'liveness probe timeout seconds' },
            failureThreshold: { type: 'integer', description: 'liveness probe failure threshold' },
            successThreshold: { type: 'integer', description: 'liveness probe success threshold' },
            initialDelaySeconds: { type: 'integer', description: 'liveness probe initial delay seconds' },
          },
        },
        serviceAccount: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'name of service account' },
            create: { type: 'boolean', description: 'service account will be created' },
          },
        },
        reconcilePeriod: { type: 'string', description: 'reconcile duration of operator' },
        securityContext: { type: 'object', description: 'security context for container' },
        watchNamespaces: {
          type: 'string',
          description:
            'comma separated names of namespaces to watch, if it is empty, the namespace that the operator exists in is used.',
        },
        leaderElectionID: {
          type: 'string',
          description: 'name of the configmap that is used for holding the leader lock.',
        },
        podSecurityContext: { type: 'object', description: 'security context for pod' },
        enableLeaderElection: { type: 'boolean', description: 'enable leader election for controller manager.' },
        maxConcurrentReconciles: { type: 'integer', description: 'max number of concurrent reconciles' },
      },
    },
  },
  {
    externalRefs: true,
    input: {
      type: 'object',
      title: 'Artifact Hub Chart JSON Schema',
      $schema: 'http://json-schema.org/schema#',
      required: [
        'db',
        'dbMigrator',
        'hub',
        'images',
        'log',
        'postgresql',
        'pullPolicy',
        'restrictedHTTPClient',
        'tracker',
        'trivy',
        'scanner',
      ],
      properties: {
        db: {
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
        hub: {
          type: 'object',
          title: 'Hub configuration',
          required: ['ingress', 'service', 'deploy', 'server', 'theme'],
          properties: {
            theme: {
              type: 'object',
              required: ['colors', 'images', 'sampleQueries', 'siteName'],
              properties: {
                colors: {
                  type: 'object',
                  title: 'Colors used in the website',
                  required: ['primary', 'secondary'],
                  properties: {
                    primary: {
                      type: 'string',
                      title: 'Primary color',
                      default: '#417598',
                      description:
                        "Primary color used in the website. For an optimal experience, it's better to use colors that play well with white fonts.",
                    },
                    secondary: {
                      type: 'string',
                      title: 'Secondary color',
                      default: '#2D4857',
                      description:
                        "Secondary color used in the website, usually a darker version of the primary color. For an optimal experience, it's better to use colors that play well with white fonts.",
                    },
                  },
                },
                images: {
                  type: 'object',
                  title: 'Images used in the website',
                  required: ['appleTouchIcon192', 'appleTouchIcon512', 'openGraphImage', 'shortcutIcon', 'websiteLogo'],
                  properties: {
                    websiteLogo: {
                      type: 'string',
                      title: 'Website logo',
                      default: '/static/media/logo/artifacthub-brand-white.svg',
                      description:
                        "URL of the logo used in the website header. For an optimal experience, it's better to use a white logo with transparent background, with no margin around it. It'll be displayed using a maximum height of 20px and a maximum width of 185px.",
                    },
                    shortcutIcon: {
                      type: 'string',
                      title: 'Shortcut icon',
                      default: '/static/media/logo_v2.png',
                      description: 'URL of the image used for the shortcut icon (also known as favicon).',
                    },
                    openGraphImage: {
                      type: 'string',
                      title: 'Open Graph image',
                      default: '/static/media/artifactHub_v2.png',
                      description:
                        'URL of the image used in the og:image tag. This image is displayed when an Artifact Hub link is shared in Twitter or Slack, for example. The URL must use `https`.',
                    },
                    appleTouchIcon192: {
                      type: 'string',
                      title: 'Apple touch icon (192x192)',
                      default: '/static/media/logo192_v2.png',
                      description: 'URL of the image used for the Apple touch icon (192x192).',
                    },
                    appleTouchIcon512: {
                      type: 'string',
                      title: 'Apple touch icon (512x512)',
                      default: '/static/media/logo512_v2.png',
                      description: 'URL of the image used for the Apple touch icon (512x512).',
                    },
                  },
                },
                siteName: {
                  type: 'string',
                  title: 'Name of the site',
                  default: 'Artifact Hub',
                  description:
                    'This name is displayed in some places in the website and email templates. When a different value than the default one (Artifact Hub) is provided, the site enters `white label` mode. In this mode, some sections of the website are displayed in a more generic way, omitting certain parts that are unique to Artifact Hub.',
                },
                reportURL: { type: 'string', title: 'Abuse report URL', description: 'URL to report abuses.' },
                sampleQueries: {
                  type: 'array',
                  items: { $ref: '#/definitions/sampleQuery' },
                  title: 'Sample search queries used in home and no results found pages',
                  default: [],
                },
              },
            },
            deploy: {
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
                  $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.core.v1.ResourceRequirements',
                  type: 'object',
                  title: 'Hub pod resource requirements',
                  default: {},
                },
                replicaCount: { type: 'integer', title: 'Number of Hub replicas', default: 1 },
                livenessProbe: {
                  $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.core.v1.Probe',
                  type: 'object',
                  title: 'Hub pod liveness probe',
                },
                readinessGates: {
                  type: 'array',
                  items: {
                    $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.core.v1.PodReadinessGate',
                    type: 'object',
                  },
                  title: 'Hub pod readiness gates',
                  default: [],
                },
                readinessProbe: {
                  $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.core.v1.Probe',
                  type: 'object',
                  title: 'Hub pod readiness probe',
                },
              },
            },
            server: {
              type: 'object',
              required: [
                'allowPrivateRepositories',
                'baseURL',
                'basicAuth',
                'configDir',
                'cookie',
                'csrf',
                'shutdownTimeout',
                'xffIndex',
              ],
              properties: {
                csrf: {
                  type: 'object',
                  required: ['authKey', 'secure'],
                  properties: {
                    secure: { type: 'boolean', title: 'CSRF secure cookie', default: false },
                    authKey: { type: 'string', title: 'CSRF authentication key', default: 'default-unsafe-key' },
                  },
                },
                motd: {
                  type: 'string',
                  title: 'Message of the day',
                  default: '',
                  description:
                    'The message of the day will be displayed in a banner on the top of the Artifact Hub UI.',
                },
                oauth: {
                  type: 'object',
                  properties: {
                    oidc: {
                      type: 'object',
                      properties: {
                        scopes: {
                          type: 'array',
                          items: { type: 'string' },
                          title: 'OpenID connect oauth scopes',
                          default: ['openid', 'profile', 'email'],
                          uniqueItems: true,
                        },
                        enabled: { type: 'boolean', title: 'Enable OIDC', default: false },
                        clientID: { type: 'string', title: 'OpenID connect oauth client id', default: '' },
                        issuerURL: { type: 'string', title: 'OpenID connect issuer url', default: '' },
                        redirectURL: { type: 'string', title: 'OpenID connect oauth redirect url', default: '' },
                        clientSecret: { type: 'string', title: 'OpenID connect oauth client secret', default: '' },
                        skipEmailVerifiedCheck: { type: 'boolean', title: 'Skip email verified check', default: false },
                      },
                    },
                    github: {
                      type: 'object',
                      properties: {
                        scopes: {
                          type: 'array',
                          items: { type: 'string' },
                          title: 'GitHub OAuth scopes',
                          default: ['read:user', 'user:email'],
                          uniqueItems: true,
                        },
                        enabled: { type: 'boolean', title: 'Enable GitHub OAuth', default: false },
                        clientID: { type: 'string', title: 'GitHub OAuth client id', default: '' },
                        redirectURL: { type: 'string', title: 'GitHub OAuth redirect url', default: '' },
                        clientSecret: { type: 'string', title: 'GitHub OAuth client secret', default: '' },
                      },
                    },
                    google: {
                      type: 'object',
                      properties: {
                        scopes: {
                          type: 'array',
                          items: { type: 'string' },
                          title: 'Google oauth scopes',
                          default: [
                            'https://www.googleapis.com/auth/userinfo.email',
                            'https://www.googleapis.com/auth/userinfo.profile',
                          ],
                          uniqueItems: true,
                        },
                        enabled: { type: 'boolean', title: 'Enable Google oauth', default: false },
                        clientID: { type: 'string', title: 'Google oauth client id', default: '' },
                        redirectURL: { type: 'string', title: 'Google oauth redirect url', default: '' },
                        clientSecret: { type: 'string', title: 'Google oauth client secret', default: '' },
                      },
                    },
                  },
                },
                cookie: {
                  type: 'object',
                  required: ['secure'],
                  properties: {
                    secure: { type: 'boolean', title: 'Enable Hub secure cookies', default: false },
                    hashKey: { type: 'string', title: 'Hub cookie hash key', default: 'default-unsafe-key' },
                  },
                },
                baseURL: { type: 'string', title: 'Hub server base url', default: '' },
                cacheDir: {
                  type: 'string',
                  title: 'Cache directory path',
                  default: '',
                  description:
                    'If set, the cache directory for the Helm client will be explicitly set (otherwise defaults to $HOME/.cache), and the directory will be mounted as ephemeral volume (emptyDir).',
                },
                xffIndex: { type: 'integer', title: 'X-Forwarded-For IP index', default: 0 },
                basicAuth: {
                  type: 'object',
                  required: ['enabled'],
                  properties: {
                    enabled: { type: 'boolean', title: 'Enable Hub basic auth', default: false },
                    password: { type: 'string', title: 'Hub basic auth password', default: 'hub' },
                    username: { type: 'string', title: 'Hub basic auth username', default: 'changeme' },
                  },
                },
                configDir: {
                  enum: ['/home/hub/.cfg', '/artifacthub/.cfg'],
                  type: 'string',
                  title: 'Config directory path',
                  default: '/home/hub/.cfg',
                  description: 'Directory path where the configuration files should be mounted.',
                },
                motdSeverity: {
                  enum: ['info', 'warning', 'error'],
                  type: 'string',
                  title: 'Message of the day severity',
                  default: 'info',
                  description: 'The color used for the banner will be based on the severity selected.',
                },
                shutdownTimeout: { type: 'string', title: 'Hub server shutdown timeout', default: '10s' },
                allowPrivateRepositories: {
                  type: 'boolean',
                  title: 'Allow adding private repositories to the Hub',
                  default: false,
                },
                allowUserSignUp: {
                  type: 'boolean',
                  title: 'Allow new Users to Sign Up',
                  default: true,
                },
              },
            },
            ingress: {
              type: 'object',
              required: ['annotations', 'enabled'],
              properties: {
                tls: {
                  type: 'array',
                  items: {
                    $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.networking.v1.IngressTLS',
                    type: 'object',
                  },
                  title: 'Hub ingress tls',
                  default: [],
                },
                rules: {
                  type: 'array',
                  items: {
                    $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.networking.v1.IngressRule',
                    type: 'object',
                  },
                  title: 'Hub ingress rules',
                  default: [],
                },
                enabled: { type: 'boolean', title: 'Enable Hub ingress', default: true },
                annotations: {
                  type: 'object',
                  title: 'Hub ingress annotations',
                  required: ['kubernetes.io/ingress.class'],
                  properties: {
                    'kubernetes.io/ingress.class': { type: 'string', title: 'Hub ingress class', default: 'nginx' },
                  },
                },
              },
            },
            service: {
              type: 'object',
              required: ['port', 'type'],
              properties: {
                port: { type: 'integer', title: 'Hub service port', default: 80 },
                type: { type: 'string', title: 'Hub service type', default: 'NodePort' },
              },
            },
            analytics: {
              type: 'object',
              properties: { gaTrackingID: { type: 'string', title: 'Google Analytics tracking id', default: '' } },
            },
          },
        },
        log: {
          type: 'object',
          required: ['level', 'pretty'],
          properties: {
            level: {
              enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'panic'],
              type: 'string',
              title: 'Log level',
              default: 'info',
            },
            pretty: { type: 'boolean', title: 'Enable pretty logging', default: false },
          },
        },
        creds: {
          type: 'object',
          properties: {
            dockerPassword: { type: 'string', title: 'Docker registry password', default: '' },
            dockerUsername: { type: 'string', title: 'Docker registry username', default: '' },
          },
        },
        email: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              title: 'From address used in emails',
              default: '',
              description: 'This field is required if you want to enable email sending in Artifact Hub.',
            },
            smtp: {
              type: 'object',
              properties: {
                auth: { enum: ['login', 'plain'], type: 'string', title: 'Authentication mechanism', default: 'plain' },
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
                password: { type: 'string', title: 'SMTP password', default: '' },
                username: { type: 'string', title: 'SMTP username', default: '' },
              },
            },
            replyTo: { type: 'string', title: 'Reply-to address used in emails', default: '' },
            fromName: { type: 'string', title: 'From name used in emails', default: '' },
          },
        },
        trivy: {
          type: 'object',
          title: 'Trivy configuration',
          required: ['deploy', 'persistence'],
          properties: {
            deploy: {
              type: 'object',
              required: ['image', 'resources'],
              properties: {
                image: { type: 'string', title: 'Trivy container image', default: 'aquasec/trivy:0.29.2' },
                resources: {
                  $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.core.v1.ResourceRequirements',
                  type: 'object',
                  title: 'Trivy pod resource requirements',
                  default: {},
                },
              },
            },
            persistence: {
              type: 'object',
              required: ['enabled'],
              properties: {
                size: { type: 'string', title: 'Size of persistent volume claim', default: '10Gi' },
                enabled: { type: 'boolean', title: 'Use persistent volume to store data', default: false },
                storageClassName: { type: 'string', title: 'Type of persistent volume claim', default: '' },
              },
            },
          },
        },
        events: {
          type: 'object',
          required: ['scanningErrors', 'trackingErrors'],
          properties: {
            scanningErrors: { type: 'boolean', title: 'Enable repository scanning errors events', default: false },
            trackingErrors: { type: 'boolean', title: 'Enable repository tracking errors events', default: false },
          },
        },
        images: {
          type: 'object',
          required: ['store'],
          properties: { store: { enum: ['pg'], type: 'string', title: 'Store for images', default: 'pg' } },
        },
        scanner: {
          type: 'object',
          title: 'Scanner configuration',
          required: ['concurrency', 'configDir', 'cronjob', 'trivyURL'],
          properties: {
            cronjob: {
              type: 'object',
              required: ['image', 'resources'],
              properties: {
                image: {
                  type: 'object',
                  required: ['repository'],
                  properties: {
                    repository: {
                      type: 'string',
                      title: 'Scanner image repository (without the tag)',
                      default: 'artifacthub/scanner',
                    },
                  },
                },
                resources: {
                  $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.core.v1.ResourceRequirements',
                  type: 'object',
                  title: 'Scanner pod resource requirements',
                  default: {},
                },
              },
            },
            cacheDir: {
              type: 'string',
              title: 'Cache directory path',
              default: '',
              description:
                'If set, the cache directory for the Trivy client will be explicitly set (otherwise defaults to $HOME/.cache), and the directory will be mounted as ephemeral volume (emptyDir).',
            },
            trivyURL: {
              type: 'string',
              title: 'Trivy server url',
              default: '',
              description: "Defaults to the Trivy service's internal URL.",
            },
            configDir: {
              enum: ['/home/scanner/.cfg', '/artifacthub/.cfg'],
              type: 'string',
              title: 'Config directory path',
              default: '/home/scanner/.cfg',
              description: 'Directory path where the configuration files should be mounted.',
            },
            concurrency: { type: 'integer', title: 'Snapshots to process concurrently', default: 3, minimum: 1 },
          },
        },
        tracker: {
          type: 'object',
          title: 'Tracker configuration',
          required: [
            'bypassDigestCheck',
            'configDir',
            'concurrency',
            'cronjob',
            'repositoryTimeout',
            'repositoriesKinds',
            'repositoriesNames',
          ],
          properties: {
            cronjob: {
              type: 'object',
              required: ['image', 'resources'],
              properties: {
                image: {
                  type: 'object',
                  required: ['repository'],
                  properties: {
                    repository: {
                      type: 'string',
                      title: 'Tracker image repository (without the tag)',
                      default: 'artifacthub/tracker',
                    },
                  },
                },
                resources: {
                  $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.core.v1.ResourceRequirements',
                  type: 'object',
                  title: 'Tracker pod resource requirements',
                  default: {},
                },
              },
            },
            cacheDir: {
              type: 'string',
              title: 'Cache directory path',
              default: '',
              description:
                'If set, the cache directory for the Helm client will be explicitly set (otherwise defaults to $HOME/.cache), and the directory will be mounted as ephemeral volume (emptyDir).',
            },
            configDir: {
              enum: ['/home/tracker/.cfg', '/artifacthub/.cfg'],
              type: 'string',
              title: 'Config directory path',
              default: '/home/tracker/.cfg',
              description: 'Directory path where the configuration files should be mounted.',
            },
            concurrency: { type: 'integer', title: 'Repositories to process concurrently', default: 10, minimum: 1 },
            bypassDigestCheck: { type: 'boolean', title: 'Bypass digest check', default: false },
            repositoriesKinds: {
              type: 'array',
              items: { type: 'string' },
              title: 'Repositories kinds to process ([] = all)',
              default: [],
              description:
                'The following kinds are supported at the moment: falco, helm, olm, opa, tbaction, krew, helm-plugin, tekton-task, keda-scaler, coredns, keptn, tekton-pipeline, container, kubewarden',
              uniqueItems: true,
            },
            repositoriesNames: {
              type: 'array',
              items: { type: 'string' },
              title: 'Repositories names to process ([] = all)',
              default: [],
              uniqueItems: true,
            },
            repositoryTimeout: {
              type: 'string',
              title: 'Maximum duration for the tracking of a single repository',
              default: '15m',
            },
          },
        },
        imageTag: {
          type: 'string',
          title: 'Tag used when pulling images',
          default: '',
          description: "Defaults to the Chart's appVersion, prefixed with a 'v'.",
        },
        dbMigrator: {
          type: 'object',
          title: 'Database migrator configuration',
          required: ['job', 'loadSampleData', 'configDir'],
          properties: {
            job: {
              type: 'object',
              required: ['image'],
              properties: {
                image: {
                  type: 'object',
                  required: ['repository'],
                  properties: {
                    repository: {
                      type: 'string',
                      title: 'Database migrator image repository (without the tag)',
                      default: 'artifacthub/db-migrator',
                    },
                  },
                },
              },
            },
            configDir: {
              enum: ['/home/db-migrator/.cfg', '/artifacthub/.cfg'],
              type: 'string',
              title: 'Config directory path',
              default: '/home/db-migrator/.cfg',
              description: 'Directory path where the configuration files should be mounted.',
            },
            loadSampleData: { type: 'boolean', title: 'Load demo user and sample repositories', default: true },
          },
        },
        pullPolicy: { type: 'string', default: 'IfNotPresent' },
        nameOverride: { type: 'string', default: '' },
        fullnameOverride: {
          type: 'string',
          title: 'Fullname override',
          default: '',
          description: "Overwrites the installation's fullname generation (used for the dynamic resource name prefix).",
        },
        imagePullSecrets: { type: 'array', default: [] },
        restrictedHTTPClient: {
          type: 'boolean',
          title: 'Enable restricted HTTP client',
          default: false,
          description:
            "Artifact Hub makes external HTTP requests for several purposes, like getting repositories metadata, dispatching webhooks, etc. When this option is enabled, requests to the private network space as well as to some other special addresses won't be allowed.",
        },
        dynamicResourceNamePrefixEnabled: {
          type: 'boolean',
          title: 'Enable dynamic resource name prefix',
          default: false,
          description:
            "Enabling the dynamic resource name prefix ensures that the resources are named dynamically based on the Helm installation's name. This allows multiple installations of this chart in a single Kubernetes namespace. The prefix can be defined by using the `fullnameOverride`.",
        },
      },
      definitions: {
        sampleQuery: {
          type: 'object',
          required: ['name', 'queryString'],
          properties: {
            name: {
              type: 'string',
              title: 'Name of the search query. It will be displayed on the home and no results found pages.',
            },
            queryString: {
              type: 'string',
              title: 'Search query string',
              description:
                'Query string that defines the search filters to use. Example: ts_query_web=prometheus&official=true',
            },
          },
        },
      },
    },
    output: {
      type: 'object',
      title: 'Artifact Hub Chart JSON Schema',
      $schema: 'http://json-schema.org/schema#',
      required: [
        'db',
        'dbMigrator',
        'hub',
        'images',
        'log',
        'postgresql',
        'pullPolicy',
        'restrictedHTTPClient',
        'tracker',
        'trivy',
        'scanner',
      ],
      properties: {
        db: {
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
        hub: {
          type: 'object',
          title: 'Hub configuration',
          required: ['ingress', 'service', 'deploy', 'server', 'theme'],
          properties: {
            theme: {
              type: 'object',
              required: ['colors', 'images', 'sampleQueries', 'siteName'],
              properties: {
                colors: {
                  type: 'object',
                  title: 'Colors used in the website',
                  required: ['primary', 'secondary'],
                  properties: {
                    primary: {
                      type: 'string',
                      title: 'Primary color',
                      default: '#417598',
                      description:
                        "Primary color used in the website. For an optimal experience, it's better to use colors that play well with white fonts.",
                    },
                    secondary: {
                      type: 'string',
                      title: 'Secondary color',
                      default: '#2D4857',
                      description:
                        "Secondary color used in the website, usually a darker version of the primary color. For an optimal experience, it's better to use colors that play well with white fonts.",
                    },
                  },
                },
                images: {
                  type: 'object',
                  title: 'Images used in the website',
                  required: ['appleTouchIcon192', 'appleTouchIcon512', 'openGraphImage', 'shortcutIcon', 'websiteLogo'],
                  properties: {
                    websiteLogo: {
                      type: 'string',
                      title: 'Website logo',
                      default: '/static/media/logo/artifacthub-brand-white.svg',
                      description:
                        "URL of the logo used in the website header. For an optimal experience, it's better to use a white logo with transparent background, with no margin around it. It'll be displayed using a maximum height of 20px and a maximum width of 185px.",
                    },
                    shortcutIcon: {
                      type: 'string',
                      title: 'Shortcut icon',
                      default: '/static/media/logo_v2.png',
                      description: 'URL of the image used for the shortcut icon (also known as favicon).',
                    },
                    openGraphImage: {
                      type: 'string',
                      title: 'Open Graph image',
                      default: '/static/media/artifactHub_v2.png',
                      description:
                        'URL of the image used in the og:image tag. This image is displayed when an Artifact Hub link is shared in Twitter or Slack, for example. The URL must use `https`.',
                    },
                    appleTouchIcon192: {
                      type: 'string',
                      title: 'Apple touch icon (192x192)',
                      default: '/static/media/logo192_v2.png',
                      description: 'URL of the image used for the Apple touch icon (192x192).',
                    },
                    appleTouchIcon512: {
                      type: 'string',
                      title: 'Apple touch icon (512x512)',
                      default: '/static/media/logo512_v2.png',
                      description: 'URL of the image used for the Apple touch icon (512x512).',
                    },
                  },
                },
                siteName: {
                  type: 'string',
                  title: 'Name of the site',
                  default: 'Artifact Hub',
                  description:
                    'This name is displayed in some places in the website and email templates. When a different value than the default one (Artifact Hub) is provided, the site enters `white label` mode. In this mode, some sections of the website are displayed in a more generic way, omitting certain parts that are unique to Artifact Hub.',
                },
                reportURL: { type: 'string', title: 'Abuse report URL', description: 'URL to report abuses.' },
                sampleQueries: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['name', 'queryString'],
                    properties: {
                      name: {
                        type: 'string',
                        title: 'Name of the search query. It will be displayed on the home and no results found pages.',
                      },
                      queryString: {
                        type: 'string',
                        title: 'Search query string',
                        description:
                          'Query string that defines the search filters to use. Example: ts_query_web=prometheus&official=true',
                      },
                    },
                  },
                  title: 'Sample search queries used in home and no results found pages',
                  default: [],
                },
              },
            },
            deploy: {
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
                  $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.core.v1.ResourceRequirements',
                  type: 'object',
                  title: 'Hub pod resource requirements',
                  default: {},
                },
                replicaCount: { type: 'integer', title: 'Number of Hub replicas', default: 1 },
                livenessProbe: {
                  $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.core.v1.Probe',
                  type: 'object',
                  title: 'Hub pod liveness probe',
                },
                readinessGates: {
                  type: 'array',
                  items: {
                    $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.core.v1.PodReadinessGate',
                    type: 'object',
                  },
                  title: 'Hub pod readiness gates',
                  default: [],
                },
                readinessProbe: {
                  $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.core.v1.Probe',
                  type: 'object',
                  title: 'Hub pod readiness probe',
                },
              },
            },
            server: {
              type: 'object',
              required: [
                'allowPrivateRepositories',
                'baseURL',
                'basicAuth',
                'configDir',
                'cookie',
                'csrf',
                'shutdownTimeout',
                'xffIndex',
              ],
              properties: {
                csrf: {
                  type: 'object',
                  required: ['authKey', 'secure'],
                  properties: {
                    secure: { type: 'boolean', title: 'CSRF secure cookie', default: false },
                    authKey: { type: 'string', title: 'CSRF authentication key', default: 'default-unsafe-key' },
                  },
                },
                motd: {
                  type: 'string',
                  title: 'Message of the day',
                  default: '',
                  description:
                    'The message of the day will be displayed in a banner on the top of the Artifact Hub UI.',
                },
                oauth: {
                  type: 'object',
                  properties: {
                    oidc: {
                      type: 'object',
                      properties: {
                        scopes: {
                          type: 'array',
                          items: { type: 'string' },
                          title: 'OpenID connect oauth scopes',
                          default: ['openid', 'profile', 'email'],
                          uniqueItems: true,
                        },
                        enabled: { type: 'boolean', title: 'Enable OIDC', default: false },
                        clientID: { type: 'string', title: 'OpenID connect oauth client id', default: '' },
                        issuerURL: { type: 'string', title: 'OpenID connect issuer url', default: '' },
                        redirectURL: { type: 'string', title: 'OpenID connect oauth redirect url', default: '' },
                        clientSecret: { type: 'string', title: 'OpenID connect oauth client secret', default: '' },
                        skipEmailVerifiedCheck: { type: 'boolean', title: 'Skip email verified check', default: false },
                      },
                    },
                    github: {
                      type: 'object',
                      properties: {
                        scopes: {
                          type: 'array',
                          items: { type: 'string' },
                          title: 'GitHub OAuth scopes',
                          default: ['read:user', 'user:email'],
                          uniqueItems: true,
                        },
                        enabled: { type: 'boolean', title: 'Enable GitHub OAuth', default: false },
                        clientID: { type: 'string', title: 'GitHub OAuth client id', default: '' },
                        redirectURL: { type: 'string', title: 'GitHub OAuth redirect url', default: '' },
                        clientSecret: { type: 'string', title: 'GitHub OAuth client secret', default: '' },
                      },
                    },
                    google: {
                      type: 'object',
                      properties: {
                        scopes: {
                          type: 'array',
                          items: { type: 'string' },
                          title: 'Google oauth scopes',
                          default: [
                            'https://www.googleapis.com/auth/userinfo.email',
                            'https://www.googleapis.com/auth/userinfo.profile',
                          ],
                          uniqueItems: true,
                        },
                        enabled: { type: 'boolean', title: 'Enable Google oauth', default: false },
                        clientID: { type: 'string', title: 'Google oauth client id', default: '' },
                        redirectURL: { type: 'string', title: 'Google oauth redirect url', default: '' },
                        clientSecret: { type: 'string', title: 'Google oauth client secret', default: '' },
                      },
                    },
                  },
                },
                cookie: {
                  type: 'object',
                  required: ['secure'],
                  properties: {
                    secure: { type: 'boolean', title: 'Enable Hub secure cookies', default: false },
                    hashKey: { type: 'string', title: 'Hub cookie hash key', default: 'default-unsafe-key' },
                  },
                },
                baseURL: { type: 'string', title: 'Hub server base url', default: '' },
                cacheDir: {
                  type: 'string',
                  title: 'Cache directory path',
                  default: '',
                  description:
                    'If set, the cache directory for the Helm client will be explicitly set (otherwise defaults to $HOME/.cache), and the directory will be mounted as ephemeral volume (emptyDir).',
                },
                xffIndex: { type: 'integer', title: 'X-Forwarded-For IP index', default: 0 },
                basicAuth: {
                  type: 'object',
                  required: ['enabled'],
                  properties: {
                    enabled: { type: 'boolean', title: 'Enable Hub basic auth', default: false },
                    password: { type: 'string', title: 'Hub basic auth password', default: 'hub' },
                    username: { type: 'string', title: 'Hub basic auth username', default: 'changeme' },
                  },
                },
                configDir: {
                  enum: ['/home/hub/.cfg', '/artifacthub/.cfg'],
                  type: 'string',
                  title: 'Config directory path',
                  default: '/home/hub/.cfg',
                  description: 'Directory path where the configuration files should be mounted.',
                },
                motdSeverity: {
                  enum: ['info', 'warning', 'error'],
                  type: 'string',
                  title: 'Message of the day severity',
                  default: 'info',
                  description: 'The color used for the banner will be based on the severity selected.',
                },
                shutdownTimeout: { type: 'string', title: 'Hub server shutdown timeout', default: '10s' },
                allowPrivateRepositories: {
                  type: 'boolean',
                  title: 'Allow adding private repositories to the Hub',
                  default: false,
                },
                allowUserSignUp: {
                  type: 'boolean',
                  title: 'Allow new Users to Sign Up',
                  default: true,
                },
              },
            },
            ingress: {
              type: 'object',
              required: ['annotations', 'enabled'],
              properties: {
                tls: {
                  type: 'array',
                  items: {
                    $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.networking.v1.IngressTLS',
                    type: 'object',
                  },
                  title: 'Hub ingress tls',
                  default: [],
                },
                rules: {
                  type: 'array',
                  items: {
                    $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.networking.v1.IngressRule',
                    type: 'object',
                  },
                  title: 'Hub ingress rules',
                  default: [],
                },
                enabled: { type: 'boolean', title: 'Enable Hub ingress', default: true },
                annotations: {
                  type: 'object',
                  title: 'Hub ingress annotations',
                  required: ['kubernetes.io/ingress.class'],
                  properties: {
                    'kubernetes.io/ingress.class': { type: 'string', title: 'Hub ingress class', default: 'nginx' },
                  },
                },
              },
            },
            service: {
              type: 'object',
              required: ['port', 'type'],
              properties: {
                port: { type: 'integer', title: 'Hub service port', default: 80 },
                type: { type: 'string', title: 'Hub service type', default: 'NodePort' },
              },
            },
            analytics: {
              type: 'object',
              properties: { gaTrackingID: { type: 'string', title: 'Google Analytics tracking id', default: '' } },
            },
          },
        },
        log: {
          type: 'object',
          required: ['level', 'pretty'],
          properties: {
            level: {
              enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'panic'],
              type: 'string',
              title: 'Log level',
              default: 'info',
            },
            pretty: { type: 'boolean', title: 'Enable pretty logging', default: false },
          },
        },
        creds: {
          type: 'object',
          properties: {
            dockerPassword: { type: 'string', title: 'Docker registry password', default: '' },
            dockerUsername: { type: 'string', title: 'Docker registry username', default: '' },
          },
        },
        email: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              title: 'From address used in emails',
              default: '',
              description: 'This field is required if you want to enable email sending in Artifact Hub.',
            },
            smtp: {
              type: 'object',
              properties: {
                auth: { enum: ['login', 'plain'], type: 'string', title: 'Authentication mechanism', default: 'plain' },
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
                password: { type: 'string', title: 'SMTP password', default: '' },
                username: { type: 'string', title: 'SMTP username', default: '' },
              },
            },
            replyTo: { type: 'string', title: 'Reply-to address used in emails', default: '' },
            fromName: { type: 'string', title: 'From name used in emails', default: '' },
          },
        },
        trivy: {
          type: 'object',
          title: 'Trivy configuration',
          required: ['deploy', 'persistence'],
          properties: {
            deploy: {
              type: 'object',
              required: ['image', 'resources'],
              properties: {
                image: { type: 'string', title: 'Trivy container image', default: 'aquasec/trivy:0.29.2' },
                resources: {
                  $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.core.v1.ResourceRequirements',
                  type: 'object',
                  title: 'Trivy pod resource requirements',
                  default: {},
                },
              },
            },
            persistence: {
              type: 'object',
              required: ['enabled'],
              properties: {
                size: { type: 'string', title: 'Size of persistent volume claim', default: '10Gi' },
                enabled: { type: 'boolean', title: 'Use persistent volume to store data', default: false },
                storageClassName: { type: 'string', title: 'Type of persistent volume claim', default: '' },
              },
            },
          },
        },
        events: {
          type: 'object',
          required: ['scanningErrors', 'trackingErrors'],
          properties: {
            scanningErrors: { type: 'boolean', title: 'Enable repository scanning errors events', default: false },
            trackingErrors: { type: 'boolean', title: 'Enable repository tracking errors events', default: false },
          },
        },
        images: {
          type: 'object',
          required: ['store'],
          properties: { store: { enum: ['pg'], type: 'string', title: 'Store for images', default: 'pg' } },
        },
        scanner: {
          type: 'object',
          title: 'Scanner configuration',
          required: ['concurrency', 'configDir', 'cronjob', 'trivyURL'],
          properties: {
            cronjob: {
              type: 'object',
              required: ['image', 'resources'],
              properties: {
                image: {
                  type: 'object',
                  required: ['repository'],
                  properties: {
                    repository: {
                      type: 'string',
                      title: 'Scanner image repository (without the tag)',
                      default: 'artifacthub/scanner',
                    },
                  },
                },
                resources: {
                  $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.core.v1.ResourceRequirements',
                  type: 'object',
                  title: 'Scanner pod resource requirements',
                  default: {},
                },
              },
            },
            cacheDir: {
              type: 'string',
              title: 'Cache directory path',
              default: '',
              description:
                'If set, the cache directory for the Trivy client will be explicitly set (otherwise defaults to $HOME/.cache), and the directory will be mounted as ephemeral volume (emptyDir).',
            },
            trivyURL: {
              type: 'string',
              title: 'Trivy server url',
              default: '',
              description: "Defaults to the Trivy service's internal URL.",
            },
            configDir: {
              enum: ['/home/scanner/.cfg', '/artifacthub/.cfg'],
              type: 'string',
              title: 'Config directory path',
              default: '/home/scanner/.cfg',
              description: 'Directory path where the configuration files should be mounted.',
            },
            concurrency: { type: 'integer', title: 'Snapshots to process concurrently', default: 3, minimum: 1 },
          },
        },
        tracker: {
          type: 'object',
          title: 'Tracker configuration',
          required: [
            'bypassDigestCheck',
            'configDir',
            'concurrency',
            'cronjob',
            'repositoryTimeout',
            'repositoriesKinds',
            'repositoriesNames',
          ],
          properties: {
            cronjob: {
              type: 'object',
              required: ['image', 'resources'],
              properties: {
                image: {
                  type: 'object',
                  required: ['repository'],
                  properties: {
                    repository: {
                      type: 'string',
                      title: 'Tracker image repository (without the tag)',
                      default: 'artifacthub/tracker',
                    },
                  },
                },
                resources: {
                  $ref: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.19.0/_definitions.json#/definitions/io.k8s.api.core.v1.ResourceRequirements',
                  type: 'object',
                  title: 'Tracker pod resource requirements',
                  default: {},
                },
              },
            },
            cacheDir: {
              type: 'string',
              title: 'Cache directory path',
              default: '',
              description:
                'If set, the cache directory for the Helm client will be explicitly set (otherwise defaults to $HOME/.cache), and the directory will be mounted as ephemeral volume (emptyDir).',
            },
            configDir: {
              enum: ['/home/tracker/.cfg', '/artifacthub/.cfg'],
              type: 'string',
              title: 'Config directory path',
              default: '/home/tracker/.cfg',
              description: 'Directory path where the configuration files should be mounted.',
            },
            concurrency: { type: 'integer', title: 'Repositories to process concurrently', default: 10, minimum: 1 },
            bypassDigestCheck: { type: 'boolean', title: 'Bypass digest check', default: false },
            repositoriesKinds: {
              type: 'array',
              items: { type: 'string' },
              title: 'Repositories kinds to process ([] = all)',
              default: [],
              description:
                'The following kinds are supported at the moment: falco, helm, olm, opa, tbaction, krew, helm-plugin, tekton-task, keda-scaler, coredns, keptn, tekton-pipeline, container, kubewarden',
              uniqueItems: true,
            },
            repositoriesNames: {
              type: 'array',
              items: { type: 'string' },
              title: 'Repositories names to process ([] = all)',
              default: [],
              uniqueItems: true,
            },
            repositoryTimeout: {
              type: 'string',
              title: 'Maximum duration for the tracking of a single repository',
              default: '15m',
            },
          },
        },
        imageTag: {
          type: 'string',
          title: 'Tag used when pulling images',
          default: '',
          description: "Defaults to the Chart's appVersion, prefixed with a 'v'.",
        },
        dbMigrator: {
          type: 'object',
          title: 'Database migrator configuration',
          required: ['job', 'loadSampleData', 'configDir'],
          properties: {
            job: {
              type: 'object',
              required: ['image'],
              properties: {
                image: {
                  type: 'object',
                  required: ['repository'],
                  properties: {
                    repository: {
                      type: 'string',
                      title: 'Database migrator image repository (without the tag)',
                      default: 'artifacthub/db-migrator',
                    },
                  },
                },
              },
            },
            configDir: {
              enum: ['/home/db-migrator/.cfg', '/artifacthub/.cfg'],
              type: 'string',
              title: 'Config directory path',
              default: '/home/db-migrator/.cfg',
              description: 'Directory path where the configuration files should be mounted.',
            },
            loadSampleData: { type: 'boolean', title: 'Load demo user and sample repositories', default: true },
          },
        },
        pullPolicy: { type: 'string', default: 'IfNotPresent' },
        nameOverride: { type: 'string', default: '' },
        fullnameOverride: {
          type: 'string',
          title: 'Fullname override',
          default: '',
          description: "Overwrites the installation's fullname generation (used for the dynamic resource name prefix).",
        },
        imagePullSecrets: { type: 'array', default: [] },
        restrictedHTTPClient: {
          type: 'boolean',
          title: 'Enable restricted HTTP client',
          default: false,
          description:
            "Artifact Hub makes external HTTP requests for several purposes, like getting repositories metadata, dispatching webhooks, etc. When this option is enabled, requests to the private network space as well as to some other special addresses won't be allowed.",
        },
        dynamicResourceNamePrefixEnabled: {
          type: 'boolean',
          title: 'Enable dynamic resource name prefix',
          default: false,
          description:
            "Enabling the dynamic resource name prefix ensures that the resources are named dynamically based on the Helm installation's name. This allows multiple installations of this chart in a single Kubernetes namespace. The prefix can be defined by using the `fullnameOverride`.",
        },
      },
      definitions: {
        sampleQuery: {
          type: 'object',
          required: ['name', 'queryString'],
          properties: {
            name: {
              type: 'string',
              title: 'Name of the search query. It will be displayed on the home and no results found pages.',
            },
            queryString: {
              type: 'string',
              title: 'Search query string',
              description:
                'Query string that defines the search filters to use. Example: ts_query_web=prometheus&official=true',
            },
          },
        },
      },
    },
  },
  {
    externalRefs: true,
    input: {
      $ref: '#/$defs/helm-values',
      $defs: {
        'helm-values': {
          type: 'object',
          properties: {
            app: {
              $ref: '#/$defs/helm-values.app',
            },
            image: {
              $ref: '#/$defs/helm-values.image',
            },
            global: {
              $ref: '#/$defs/helm-values.global',
            },
            affinity: {
              $ref: '#/$defs/helm-values.affinity',
            },
            podLabels: {
              $ref: '#/$defs/helm-values.podLabels',
            },
            resources: {
              $ref: '#/$defs/helm-values.resources',
            },
            tolerations: {
              $ref: '#/$defs/helm-values.tolerations',
            },
            commonLabels: {
              $ref: '#/$defs/helm-values.commonLabels',
            },
            nodeSelector: {
              $ref: '#/$defs/helm-values.nodeSelector',
            },
            podAnnotations: {
              $ref: '#/$defs/helm-values.podAnnotations',
            },
            imagePullSecrets: {
              $ref: '#/$defs/helm-values.imagePullSecrets',
            },
            priorityClassName: {
              $ref: '#/$defs/helm-values.priorityClassName',
            },
            livenessProbeImage: {
              $ref: '#/$defs/helm-values.livenessProbeImage',
            },
            daemonSetAnnotations: {
              $ref: '#/$defs/helm-values.daemonSetAnnotations',
            },
            nodeDriverRegistrarImage: {
              $ref: '#/$defs/helm-values.nodeDriverRegistrarImage',
            },
          },
          additionalProperties: false,
        },
        'helm-values.app': {
          type: 'object',
          properties: {
            driver: {
              $ref: '#/$defs/helm-values.app.driver',
            },
            logLevel: {
              $ref: '#/$defs/helm-values.app.logLevel',
            },
            livenessProbe: {
              $ref: '#/$defs/helm-values.app.livenessProbe',
            },
            kubeletRootDir: {
              $ref: '#/$defs/helm-values.app.kubeletRootDir',
            },
          },
          additionalProperties: false,
        },
        'helm-values.image': {
          type: 'object',
          properties: {
            tag: {
              $ref: '#/$defs/helm-values.image.tag',
            },
            digest: {
              $ref: '#/$defs/helm-values.image.digest',
            },
            registry: {
              $ref: '#/$defs/helm-values.image.registry',
            },
            pullPolicy: {
              $ref: '#/$defs/helm-values.image.pullPolicy',
            },
            repository: {
              $ref: '#/$defs/helm-values.image.repository',
            },
          },
          additionalProperties: false,
        },
        'helm-values.global': {
          description: 'Global values shared across all (sub)charts',
        },
        'helm-values.affinity': {
          type: 'object',
          default: {},
          description:
            'Kubernetes affinity: constraints for pod assignment.\n\nFor example:\naffinity:\n  nodeAffinity:\n   requiredDuringSchedulingIgnoredDuringExecution:\n     nodeSelectorTerms:\n     - matchExpressions:\n       - key: foo.bar.com/role\n         operator: In\n         values:\n         - master',
        },
        'helm-values.image.tag': {
          type: 'string',
          description:
            "Override the image tag to deploy by setting this variable. If no value is set, the chart's appVersion is used.",
        },
        'helm-values.podLabels': {
          type: 'object',
          default: {},
          description: 'Optional additional labels to add to the csi-driver pods.',
        },
        'helm-values.resources': {
          type: 'object',
          default: {},
          description:
            'Kubernetes pod resources requests/limits for cert-manager-csi-driver.\n\nFor example:\nresources:\n  limits:\n    cpu: 100m\n    memory: 128Mi\n  requests:\n    cpu: 100m\n    memory: 128Mi',
        },
        'helm-values.app.driver': {
          type: 'object',
          properties: {
            name: {
              $ref: '#/$defs/helm-values.app.driver.name',
            },
            csiDataDir: {
              $ref: '#/$defs/helm-values.app.driver.csiDataDir',
            },
            useTokenRequest: {
              $ref: '#/$defs/helm-values.app.driver.useTokenRequest',
            },
          },
          additionalProperties: false,
        },
        'helm-values.tolerations': {
          type: 'array',
          items: {},
          default: [],
          description:
            'Kubernetes pod tolerations for cert-manager-csi-driver.\n\nFor example:\ntolerations:\n- operator: "Exists"',
        },
        'helm-values.app.logLevel': {
          type: 'number',
          default: 1,
          description: 'Verbosity of cert-manager-csi-driver logging.',
        },
        'helm-values.commonLabels': {
          type: 'object',
          default: {},
          description: 'Labels to apply to all resources.',
        },
        'helm-values.image.digest': {
          type: 'string',
          description:
            'Target image digest. Override any tag, if set.\nFor example:\ndigest: sha256:0e072dddd1f7f8fc8909a2ca6f65e76c5f0d2fcfb8be47935ae3457e8bbceb20',
        },
        'helm-values.nodeSelector': {
          type: 'object',
          default: {},
          description:
            'Kubernetes node selector: node labels for pod assignment. For example, use this to allow scheduling of DaemonSet on linux nodes only:\nnodeSelector:\n  kubernetes.io/os: linux',
        },
        'helm-values.image.registry': {
          type: 'string',
          description:
            'Target image registry. This value is prepended to the target image repository, if set.\nFor example:\nregistry: quay.io\nrepository: jetstack/cert-manager-csi-driver',
        },
        'helm-values.podAnnotations': {
          type: 'object',
          default: {},
          description: 'Optional additional annotations to add to the csi-driver pods.',
        },
        'helm-values.app.driver.name': {
          type: 'string',
          default: 'csi.cert-manager.io',
          description: 'Name of the driver to be registered with Kubernetes.',
        },
        'helm-values.image.pullPolicy': {
          type: 'string',
          default: 'IfNotPresent',
          description: 'Kubernetes imagePullPolicy on Deployment.',
        },
        'helm-values.image.repository': {
          type: 'string',
          default: 'quay.io/jetstack/cert-manager-csi-driver',
          description: 'Target image repository.',
        },
        'helm-values.imagePullSecrets': {
          type: 'array',
          items: {},
          default: [],
          description:
            'Optional secrets used for pulling the csi-driver container image.\n\nFor example:\nimagePullSecrets:\n- name: secret-name',
        },
        'helm-values.app.livenessProbe': {
          type: 'object',
          properties: {
            port: {
              $ref: '#/$defs/helm-values.app.livenessProbe.port',
            },
          },
          additionalProperties: false,
        },
        'helm-values.priorityClassName': {
          type: 'string',
          default: '',
          description: 'Optional priority class to be used for the csi-driver pods.',
        },
        'helm-values.app.kubeletRootDir': {
          type: 'string',
          default: '/var/lib/kubelet',
          description: 'Overrides the path to root kubelet directory in case of a non-standard Kubernetes install.',
        },
        'helm-values.livenessProbeImage': {
          type: 'object',
          properties: {
            tag: {
              $ref: '#/$defs/helm-values.livenessProbeImage.tag',
            },
            digest: {
              $ref: '#/$defs/helm-values.livenessProbeImage.digest',
            },
            registry: {
              $ref: '#/$defs/helm-values.livenessProbeImage.registry',
            },
            pullPolicy: {
              $ref: '#/$defs/helm-values.livenessProbeImage.pullPolicy',
            },
            repository: {
              $ref: '#/$defs/helm-values.livenessProbeImage.repository',
            },
          },
          additionalProperties: false,
        },
        'helm-values.daemonSetAnnotations': {
          type: 'object',
          default: {},
          description: 'Optional additional annotations to add to the csi-driver DaemonSet.',
        },
        'helm-values.app.driver.csiDataDir': {
          type: 'string',
          default: '/tmp/cert-manager-csi-driver',
          description: 'Configures the hostPath directory that the driver writes and mounts volumes from.',
        },
        'helm-values.app.livenessProbe.port': {
          type: 'number',
          default: 9809,
          description: 'The port that will expose the liveness of the csi-driver.',
        },
        'helm-values.livenessProbeImage.tag': {
          type: 'string',
          default: 'v2.12.0',
          description:
            "Override the image tag to deploy by setting this variable. If no value is set, the chart's appVersion is used.",
        },
        'helm-values.nodeDriverRegistrarImage': {
          type: 'object',
          properties: {
            tag: {
              $ref: '#/$defs/helm-values.nodeDriverRegistrarImage.tag',
            },
            digest: {
              $ref: '#/$defs/helm-values.nodeDriverRegistrarImage.digest',
            },
            registry: {
              $ref: '#/$defs/helm-values.nodeDriverRegistrarImage.registry',
            },
            pullPolicy: {
              $ref: '#/$defs/helm-values.nodeDriverRegistrarImage.pullPolicy',
            },
            repository: {
              $ref: '#/$defs/helm-values.nodeDriverRegistrarImage.repository',
            },
          },
          additionalProperties: false,
        },
        'helm-values.livenessProbeImage.digest': {
          type: 'string',
          description:
            'Target image digest. Override any tag, if set.\nFor example:\ndigest: sha256:0e072dddd1f7f8fc8909a2ca6f65e76c5f0d2fcfb8be47935ae3457e8bbceb20',
        },
        'helm-values.app.driver.useTokenRequest': {
          type: 'boolean',
          default: false,
          description:
            "If enabled, this uses a CSI token request for creating. CertificateRequests. CertificateRequests are created by mounting the pod's service accounts.",
        },
        'helm-values.livenessProbeImage.registry': {
          type: 'string',
          description:
            'Target image registry. This value is prepended to the target image repository, if set.\nFor example:\nregistry: registry.k8s.io\nrepository: sig-storage/livenessprobe',
        },
        'helm-values.nodeDriverRegistrarImage.tag': {
          type: 'string',
          default: 'v2.10.0',
          description:
            "Override the image tag to deploy by setting this variable. If no value is set, the chart's appVersion is used.",
        },
        'helm-values.livenessProbeImage.pullPolicy': {
          type: 'string',
          default: 'IfNotPresent',
          description: 'Kubernetes imagePullPolicy on Deployment.',
        },
        'helm-values.livenessProbeImage.repository': {
          type: 'string',
          default: 'registry.k8s.io/sig-storage/livenessprobe',
          description: 'Target image repository.',
        },
        'helm-values.nodeDriverRegistrarImage.digest': {
          type: 'string',
          description:
            'Target image digest. Override any tag, if set.\nFor example:\ndigest: sha256:0e072dddd1f7f8fc8909a2ca6f65e76c5f0d2fcfb8be47935ae3457e8bbceb20',
        },
        'helm-values.nodeDriverRegistrarImage.registry': {
          type: 'string',
          description:
            'Target image registry. This value is prepended to the target image repository, if set.\nFor example:\nregistry: registry.k8s.io\nrepository: sig-storage/csi-node-driver-registrar',
        },
        'helm-values.nodeDriverRegistrarImage.pullPolicy': {
          type: 'string',
          default: 'IfNotPresent',
          description: 'Kubernetes imagePullPolicy on Deployment.',
        },
        'helm-values.nodeDriverRegistrarImage.repository': {
          type: 'string',
          default: 'registry.k8s.io/sig-storage/csi-node-driver-registrar',
          description: 'Target image repository.',
        },
      },
      $schema: 'http://json-schema.org/draft-07/schema#',
    },
    output: {
      type: 'object',
      properties: {
        app: {
          type: 'object',
          properties: {
            driver: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  default: 'csi.cert-manager.io',
                  description: 'Name of the driver to be registered with Kubernetes.',
                },
                csiDataDir: {
                  type: 'string',
                  default: '/tmp/cert-manager-csi-driver',
                  description: 'Configures the hostPath directory that the driver writes and mounts volumes from.',
                },
                useTokenRequest: {
                  type: 'boolean',
                  default: false,
                  description:
                    "If enabled, this uses a CSI token request for creating. CertificateRequests. CertificateRequests are created by mounting the pod's service accounts.",
                },
              },
              additionalProperties: false,
            },
            logLevel: {
              type: 'number',
              default: 1,
              description: 'Verbosity of cert-manager-csi-driver logging.',
            },
            livenessProbe: {
              type: 'object',
              properties: {
                port: {
                  type: 'number',
                  default: 9809,
                  description: 'The port that will expose the liveness of the csi-driver.',
                },
              },
              additionalProperties: false,
            },
            kubeletRootDir: {
              type: 'string',
              default: '/var/lib/kubelet',
              description: 'Overrides the path to root kubelet directory in case of a non-standard Kubernetes install.',
            },
          },
          additionalProperties: false,
        },
        image: {
          type: 'object',
          properties: {
            tag: {
              type: 'string',
              description:
                "Override the image tag to deploy by setting this variable. If no value is set, the chart's appVersion is used.",
            },
            digest: {
              type: 'string',
              description:
                'Target image digest. Override any tag, if set.\nFor example:\ndigest: sha256:0e072dddd1f7f8fc8909a2ca6f65e76c5f0d2fcfb8be47935ae3457e8bbceb20',
            },
            registry: {
              type: 'string',
              description:
                'Target image registry. This value is prepended to the target image repository, if set.\nFor example:\nregistry: quay.io\nrepository: jetstack/cert-manager-csi-driver',
            },
            pullPolicy: {
              type: 'string',
              default: 'IfNotPresent',
              description: 'Kubernetes imagePullPolicy on Deployment.',
            },
            repository: {
              type: 'string',
              default: 'quay.io/jetstack/cert-manager-csi-driver',
              description: 'Target image repository.',
            },
          },
          additionalProperties: false,
        },
        global: {
          description: 'Global values shared across all (sub)charts',
        },
        affinity: {
          type: 'object',
          default: {},
          description:
            'Kubernetes affinity: constraints for pod assignment.\n\nFor example:\naffinity:\n  nodeAffinity:\n   requiredDuringSchedulingIgnoredDuringExecution:\n     nodeSelectorTerms:\n     - matchExpressions:\n       - key: foo.bar.com/role\n         operator: In\n         values:\n         - master',
        },
        podLabels: {
          type: 'object',
          default: {},
          description: 'Optional additional labels to add to the csi-driver pods.',
        },
        resources: {
          type: 'object',
          default: {},
          description:
            'Kubernetes pod resources requests/limits for cert-manager-csi-driver.\n\nFor example:\nresources:\n  limits:\n    cpu: 100m\n    memory: 128Mi\n  requests:\n    cpu: 100m\n    memory: 128Mi',
        },
        tolerations: {
          type: 'array',
          items: {},
          default: [],
          description:
            'Kubernetes pod tolerations for cert-manager-csi-driver.\n\nFor example:\ntolerations:\n- operator: "Exists"',
        },
        commonLabels: {
          type: 'object',
          default: {},
          description: 'Labels to apply to all resources.',
        },
        nodeSelector: {
          type: 'object',
          default: {},
          description:
            'Kubernetes node selector: node labels for pod assignment. For example, use this to allow scheduling of DaemonSet on linux nodes only:\nnodeSelector:\n  kubernetes.io/os: linux',
        },
        podAnnotations: {
          type: 'object',
          default: {},
          description: 'Optional additional annotations to add to the csi-driver pods.',
        },
        imagePullSecrets: {
          type: 'array',
          items: {},
          default: [],
          description:
            'Optional secrets used for pulling the csi-driver container image.\n\nFor example:\nimagePullSecrets:\n- name: secret-name',
        },
        priorityClassName: {
          type: 'string',
          default: '',
          description: 'Optional priority class to be used for the csi-driver pods.',
        },
        livenessProbeImage: {
          type: 'object',
          properties: {
            tag: {
              type: 'string',
              default: 'v2.12.0',
              description:
                "Override the image tag to deploy by setting this variable. If no value is set, the chart's appVersion is used.",
            },
            digest: {
              type: 'string',
              description:
                'Target image digest. Override any tag, if set.\nFor example:\ndigest: sha256:0e072dddd1f7f8fc8909a2ca6f65e76c5f0d2fcfb8be47935ae3457e8bbceb20',
            },
            registry: {
              type: 'string',
              description:
                'Target image registry. This value is prepended to the target image repository, if set.\nFor example:\nregistry: registry.k8s.io\nrepository: sig-storage/livenessprobe',
            },
            pullPolicy: {
              type: 'string',
              default: 'IfNotPresent',
              description: 'Kubernetes imagePullPolicy on Deployment.',
            },
            repository: {
              type: 'string',
              default: 'registry.k8s.io/sig-storage/livenessprobe',
              description: 'Target image repository.',
            },
          },
          additionalProperties: false,
        },
        daemonSetAnnotations: {
          type: 'object',
          default: {},
          description: 'Optional additional annotations to add to the csi-driver DaemonSet.',
        },
        nodeDriverRegistrarImage: {
          type: 'object',
          properties: {
            tag: {
              type: 'string',
              default: 'v2.10.0',
              description:
                "Override the image tag to deploy by setting this variable. If no value is set, the chart's appVersion is used.",
            },
            digest: {
              type: 'string',
              description:
                'Target image digest. Override any tag, if set.\nFor example:\ndigest: sha256:0e072dddd1f7f8fc8909a2ca6f65e76c5f0d2fcfb8be47935ae3457e8bbceb20',
            },
            registry: {
              type: 'string',
              description:
                'Target image registry. This value is prepended to the target image repository, if set.\nFor example:\nregistry: registry.k8s.io\nrepository: sig-storage/csi-node-driver-registrar',
            },
            pullPolicy: {
              type: 'string',
              default: 'IfNotPresent',
              description: 'Kubernetes imagePullPolicy on Deployment.',
            },
            repository: {
              type: 'string',
              default: 'registry.k8s.io/sig-storage/csi-node-driver-registrar',
              description: 'Target image repository.',
            },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
];

describe('dereferenceJSONSchema', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns dereferenced schema', async () => {
      mocked(API).getSchemaDef.mockResolvedValue(DEFS);
      const actual = dereferenceJSONSchema(tests[i].input);

      await waitFor(() => {
        expect(API.getSchemaDef).toBeCalledTimes(tests[i].externalRefs ? 1 : 0);
      });

      expect(actual).toEqual(tests[i].output);
    });
  }
});
