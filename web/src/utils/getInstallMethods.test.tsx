import { HelmChartType, Package, Version } from '../types';
import getInstallMethods, { InstallMethodOutput } from './getInstallMethods';

interface Tests {
  title: string;
  input: { pkg?: Package | null; sortedVersions: Version[]; activeChannel?: string };
  output: InstallMethodOutput;
}

const tests: Tests[] = [
  {
    title: 'Not package',
    input: {
      sortedVersions: [],
    },
    output: {
      methods: [],
    },
  },
  {
    title: 'Helm package',
    input: {
      pkg: {
        packageId: 'id',
        name: 'artifact-hub',
        normalizedName: 'artifact-hub',
        displayName: 'artifact-hub',
        description: 'desc',
        logoImageId: 'img',
        deprecated: false,
        signed: false,
        ts: 1574121600,
        isOperator: false,
        version: '0.11.0',
        availableVersions: [
          { version: '0.6.0', ts: 1600841229, containsSecurityUpdates: false, prerelease: false },
          { version: '0.5.0', ts: 1599125273, containsSecurityUpdates: false, prerelease: false },
        ],
        appVersion: '0.11.0',
        contentUrl: 'https://artifacthub.github.io/hub/chart/artifact-hub-0.11.0.tgz',
        repository: {
          repositoryId: 'd2b93c16-4f70-43e7-b50c-0dccb4c82756',
          name: 'artifact-hub',
          url: 'https://artifacthub.github.io/hub/chart/',
          private: false,
          kind: 0,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
      },
      sortedVersions: [{ version: '0.11.0', ts: 1607006504, containsSecurityUpdates: false, prerelease: false }],
    },
    output: {
      methods: [
        {
          label: 'v3',
          title: 'Helm v3',
          kind: 1,
          props: {
            name: 'artifact-hub',
            version: '0.11.0',
            repository: {
              repositoryId: 'd2b93c16-4f70-43e7-b50c-0dccb4c82756',
              name: 'artifact-hub',
              url: 'https://artifacthub.github.io/hub/chart/',
              private: false,
              kind: 0,
              verifiedPublisher: false,
              official: false,
              userAlias: 'user',
            },
            contentUrl: 'https://artifacthub.github.io/hub/chart/artifact-hub-0.11.0.tgz',
          },
        },
        {
          label: 'v2',
          title: 'Helm v2',
          kind: 1,
          props: {
            name: 'artifact-hub',
            version: '0.11.0',
            repository: {
              repositoryId: 'd2b93c16-4f70-43e7-b50c-0dccb4c82756',
              name: 'artifact-hub',
              url: 'https://artifacthub.github.io/hub/chart/',
              private: false,
              kind: 0,
              verifiedPublisher: false,
              official: false,
              userAlias: 'user',
            },
            contentUrl: 'https://artifacthub.github.io/hub/chart/artifact-hub-0.11.0.tgz',
          },
        },
      ],
    },
  },
  {
    title: 'Helm OCI package',
    input: {
      pkg: {
        packageId: 'id',
        name: 'artifact-hub',
        normalizedName: 'artifact-hub',
        displayName: 'artifact-hub',
        description: 'desc',
        logoImageId: 'img',
        deprecated: false,
        signed: false,
        ts: 1574121600,
        isOperator: false,
        version: '0.11.0',
        availableVersions: [
          { version: '0.6.0', ts: 1600841229, containsSecurityUpdates: false, prerelease: false },
          { version: '0.5.0', ts: 1599125273, containsSecurityUpdates: false, prerelease: false },
        ],
        appVersion: '0.11.0',
        contentUrl: 'https://artifacthub.github.io/hub/chart/artifact-hub-0.11.0.tgz',
        repository: {
          repositoryId: '70179323-98ba-4923-b80a-284bcf30dbbf',
          name: 'artifact-hub-oci',
          url: 'oci://ghcr.io/artifacthub/artifact-hub',
          private: false,
          kind: 0,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
      },
      sortedVersions: [{ version: '0.11.0', ts: 1607006504, containsSecurityUpdates: false, prerelease: false }],
    },
    output: {
      methods: [
        {
          label: 'v3',
          title: 'Helm v3 (OCI)',
          kind: 2,
          props: {
            name: 'artifact-hub',
            version: '0.11.0',
            repository: {
              repositoryId: '70179323-98ba-4923-b80a-284bcf30dbbf',
              name: 'artifact-hub-oci',
              url: 'oci://ghcr.io/artifacthub/artifact-hub',
              private: false,
              kind: 0,
              verifiedPublisher: false,
              official: false,
              userAlias: 'user',
            },
          },
        },
      ],
    },
  },
  {
    title: 'Helm OCI package with custom install',
    input: {
      pkg: {
        packageId: 'id',
        name: 'artifact-hub',
        normalizedName: 'artifact-hub',
        displayName: 'artifact-hub',
        description: 'desc',
        logoImageId: 'img',
        deprecated: false,
        signed: false,
        ts: 1574121600,
        isOperator: false,
        version: '0.11.0',
        availableVersions: [
          { version: '0.6.0', ts: 1600841229, containsSecurityUpdates: false, prerelease: false },
          { version: '0.5.0', ts: 1599125273, containsSecurityUpdates: false, prerelease: false },
        ],
        appVersion: '0.11.0',
        contentUrl: 'https://artifacthub.github.io/hub/chart/artifact-hub-0.11.0.tgz',
        install:
          '## Install using Helm\n\n```\nhelm upgrade falco -f https://api.securityhub.dev/resources/falco-rules/apache/custom-rules.yaml stable/falco\n```\n',
        repository: {
          repositoryId: 'd2b93c16-4f70-43e7-b50c-0dccb4c82756',
          name: 'artifact-hub',
          url: 'oci://ghcr.io/artifacthub/artifact-hub',
          private: false,
          kind: 0,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
      },
      sortedVersions: [{ version: '0.11.0', ts: 1607006504, containsSecurityUpdates: false, prerelease: false }],
    },
    output: {
      methods: [
        {
          label: 'custom',
          title: 'Custom',
          kind: 0,
          props: {
            install:
              '## Install using Helm\n\n```\nhelm upgrade falco -f https://api.securityhub.dev/resources/falco-rules/apache/custom-rules.yaml stable/falco\n```\n',
          },
        },
        {
          label: 'v3',
          title: 'Helm v3 (OCI)',
          kind: 2,
          props: {
            name: 'artifact-hub',
            version: '0.11.0',
            repository: {
              repositoryId: 'd2b93c16-4f70-43e7-b50c-0dccb4c82756',
              name: 'artifact-hub',
              url: 'oci://ghcr.io/artifacthub/artifact-hub',
              private: false,
              kind: 0,
              verifiedPublisher: false,
              official: false,
              userAlias: 'user',
            },
          },
        },
      ],
    },
  },
  {
    title: 'Falco rules without custom install',
    input: {
      pkg: {
        packageId: '4da8202f-b881-4468-8db2-33fa1a77ca52',
        name: 'Admin activities',
        normalizedName: 'admin-activities',
        displayName: 'Admin',
        isOperator: false,
        logoImageId: '841e8335-f665-4451-bf6f-918129d858d5',
        description: 'Falco rules for detecting admin activities',
        keywords: ['usecase'],
        readme:
          '# Detecting admin activities Falco Rules\n\nA set of rules to detect admin activities\n\n## Detect su or sudo\nDetects su or sudo privilege escalation activity\n## Package Management Launched\nDetects when a package management process is launched in a container\n',
        links: [
          {
            url: 'https://github.com/falcosecurity/cloud-native-security-hub/blob/master/resources/falco/admin.yaml',
            name: 'source',
          },
        ],
        data: {
          rules: [
            {
              Raw:
                '- rule: Detect su or sudo\n  desc: detect sudo activities\n  condition:\n    spawned_process and proc.name in (sudo, su)\n  output: >\n    Detected sudo or su privilege escalation activity (user=%user.name command=%proc.cmdline)\n  priority: WARNING\n  tags: [process]\n- rule: Package Management Launched\n  desc: detect package management launched\n  condition: >\n    spawned_process and user.name != "_apt" and package_mgmt_procs and not package_mgmt_ancestor_procs\n  output: >\n    Package management process launched in container (user=%user.name\n    command=%proc.cmdline container_id=%container.id container_name=%container.name image=%container.image.repository:%container.image.tag)\n  priority: ERROR\n  tags: [process]\n',
            },
          ],
        },
        version: '1.0.1',
        availableVersions: [{ version: '1.0.1', ts: 1607672795, containsSecurityUpdates: false, prerelease: false }],
        deprecated: false,
        signed: false,
        provider: 'Sysdig',
        hasValuesSchema: false,
        hasChangelog: false,
        ts: 1607672795,
        repository: {
          repositoryId: '93d200c1-3443-4dd9-aeeb-869c78ff770c',
          name: 'falco-official',
          url: 'https://github.com/falcosecurity/cloud-native-security-hub/resources/falco',
          private: false,
          kind: 1,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
      },
      sortedVersions: [{ version: '1.0.1', ts: 1607672795, containsSecurityUpdates: false, prerelease: false }],
    },
    output: {
      methods: [
        { label: 'cli', title: 'Helm CLI', kind: 5, props: { normalizedName: 'admin-activities', isPrivate: false } },
      ],
    },
  },
  {
    title: 'Falco rules with custom install',
    input: {
      pkg: {
        packageId: '7628d4a4-2513-4e48-9c8c-cf089130a54e',
        name: 'apache',
        normalizedName: 'apache',
        logoImageId: '93120eaa-d1b8-4098-bfba-0db9d3d3fedd',
        isOperator: false,
        displayName: 'Apache',
        description: 'Falco rules for securing Apache HTTP Server',
        install:
          '## Install using Helm\n\n```\nhelm upgrade falco -f https://api.securityhub.dev/resources/falco-rules/apache/custom-rules.yaml stable/falco\n```\n',
        links: [
          {
            url: 'https://github.com/falcosecurity/cloud-native-security-hub/blob/master/resources/falco/apache.yaml',
            name: 'Source',
          },
        ],
        data: {},
        version: '1.0.0',
        availableVersions: [{ version: '1.0.0', ts: 1574121600, containsSecurityUpdates: false, prerelease: false }],
        deprecated: false,
        license: 'Apache-2.0',
        signed: false,
        provider: 'Apache',
        hasValuesSchema: false,
        hasChangelog: false,
        ts: 1574121600,
        repository: {
          repositoryId: 'a9e9100f-4346-496e-b164-2d8329f37293',
          name: 'falco-fork',
          url: 'https://github.com/tegioz/cloud-native-security-hub/artifact-hub/falco',
          private: false,
          kind: 1,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
      },
      sortedVersions: [{ version: '1.0.0', ts: 1574121600, containsSecurityUpdates: false, prerelease: false }],
    },
    output: {
      methods: [
        {
          label: 'custom',
          title: 'Custom',
          kind: 0,
          props: {
            install:
              '## Install using Helm\n\n```\nhelm upgrade falco -f https://api.securityhub.dev/resources/falco-rules/apache/custom-rules.yaml stable/falco\n```\n',
          },
        },
      ],
    },
  },
  {
    title: 'OLM OCI operator',
    input: {
      pkg: {
        packageId: '622fc210-47fa-4697-b263-5e55a2d19a5d',
        name: 'aimanager-operator',
        normalizedName: 'aimanager-operator',
        logoImageId: 'b02b79cd-64a5-43e7-8bd0-e625405b4391',
        isOperator: true,
        channels: [{ name: 'v1.0', version: '1.0.0' }],
        defaultChannel: 'v1.0',
        displayName: 'IBM Watson AIOps AI Manager',
        description: 'Automate how you detect, diagnose, and respond to IT incidents in real time.',
        keywords: ['AI', ''],
        readme:
          '# aimanager-operator\n\n## Introduction\n\nYou can use the aimanager-operator to install IBM Watson AIOps AI Manager either on its own, or as part of IBM Watson AIOps.\n\n## Details\n\nAI Manager collects information from all of your IT assets, such as applications, the infrastructure that they run on, and the networking systems that support them. It then uses that data to uncover hidden insights and identify root causes of events. Training your models leads to better event discovery and a more accurate understanding of your topology. With this advanced understanding of your topology, you can pinpoint where events occur (fault localization) and how far-reaching their impact is (blast radius). When AI Manager detects potential incidents, it creates a story about the incident. Then, it uses a ChatOps environment to notify, update, and provide your team with near real time potential remedies.\n\nFor more information about Watson AIOps and AI Manager, see the [IBM Knowledge Center](https://www.ibm.com/support/knowledgecenter/en/SSQLRP_2.1/kc_welcome_waiops.html).\n\n### Operator versions\n\n- 1.0.0\n  - Initial version\n\n## Prerequisites\n\nBefore you install this operator, you must complete the prerequisites.\n\nFor more information about prerequisites, see the [IBM Watson AIOps 2.1 IBM Knowledge Center](https://www.ibm.com/support/knowledgecenter/en/SSQLRP_2.1/install/waiops-install-ovr.html).\n\n### Supported platforms\n\nRed Hat OpenShift Container Platform 4.5 or 4.6 or newer installed on the following platforms:\n\n   - Linux x86_64\n\nCurrently, only `amd64` worker nodes are supported.\n\n## SecurityContextConstraints Requirements\n\nThe aimanager-operator service supports running with the following OpenShift Container Platform 4.5+ or 4.6+ Security Context Constraints (SCCs). All of the pods use this SCC. An SCC constrains pod actions.\n\n  - Privileged SCC for operands: [`ibm-privileged-scc`](https://ibm.biz/cpkspec-scc)\n  - Custom SCC for operators: [`custom-scc`](https://www.ibm.com/support/knowledgecenter/en/SSQLRP_2.1/install/aiops-prereqs.html#security)\n\nTo add an SCC to your service account, enter the following command:\n\n```\noc adm policy add-scc-to-user ibm-aimanager-scc system:serviceaccount:namespace:aimanager-service-account\n```\n\n## Resources Required\n\nThis operator has no dependencies.\n\nFor more information about sizing and storage requirements, see[AI Manager system and storage requirements](https://www.ibm.com/support/knowledgecenter/en/SSQLRP_2.1/install/aiops-prereqs.html#reqs).\n\n## Configuration\n\n### Ingress controller configuration\n\nYour OpenShift environment might need an update for network policy functionality. Enter the following command to determine whether your OpenShift environment is affected. View the default ingress controller and locate the property `endpointPublishingStrategy.type`. If it is set to `HostNetwork`, the network policy will not work against routes unless the default namespace contains the selector label.\n\n```\nkubectl get ingresscontroller default -n openshift-ingress-operator -o yaml\n\n  endpointPublishingStrategy:\n    type: HostNetwork\n```\n\nTo set the label by a patch of the default namespace, enter the following command:\n\n```\nkubectl patch namespace default --type=json -p \'[{"op":"add","path":"/metadata/labels","value":{"network.openshift.io/policy-group":"ingress"}}]\'\n```\n\nFor more information about additional configurations to AI Manager, see [Administering and configuring IBM Watson AIOps](https://www.ibm.com/support/knowledgecenter/en/SSQLRP_2.1/admin/aiops-admin-ovr.html)\n\n## Installing\n\nTo install the operator, follow the installation and configuration instructions within the IBM Knowledge Center. For more information about installing IBM Watson AIOps and its components, see [Installing Watson AIOps](https://www.ibm.com/support/knowledgecenter/en/SSQLRP_2.1/install/waiops-install-ovr.html).\n\n## Limitations\n\nThe AI Manager IBM Knowledge Center includes a list of known issues. For more information, see [AI Manager known issues](https://www.ibm.com/support/knowledgecenter/en/SSQLRP_2.1/about/aiops-trouble.html).\n\n## Documentation\n\nFull documentation on AI Manager can be found in the [IBM Watson AIOps AI Manager IBM Knowledge Center](https://ibm.biz/WatsonAIOps2).\n',
        crds: [
          {
            kind: 'AIManagerMainProd',
            name: 'aimanagermainprods.ai-manager.watson-aiops.ibm.com',
            version: 'v1beta1',
            description:
              'AIManagerMainProd is the Schema for the aimanagermainprods API.  Documentation For additional details regarding install parameters check: https://ibm.biz/WatsonAIOps2. License By installing this product you accept the license terms https://ibm.biz/WatsonAIOps2.',
            displayName: 'AI Manager Main Prod',
          },
          {
            kind: 'AIManager',
            name: 'aimanagers.ai-manager.watson-aiops.ibm.com',
            version: 'v1beta1',
            description:
              'AIManager Deploys the IBM Watson AIOps AI Manager service components of IBM Watson AIOps. Documentation For additional details regarding install parameters check: https://ibm.biz/WatsonAIOps2. License By installing this product you accept the license terms https://ibm.biz/WatsonAIOps2.',
            displayName: 'AI Manager',
          },
        ],

        capabilities: 'seamless upgrades',
        data: { isGlobalOperator: false },
        version: '1.0.0',
        availableVersions: [{ version: '1.0.0', ts: 1607672828, containsSecurityUpdates: false, prerelease: false }],
        deprecated: false,
        signed: false,
        provider: 'IBM',
        hasValuesSchema: false,
        hasChangelog: false,
        ts: 1607672828,
        maintainers: [{ name: 'IBM Support', email: 'IBM.Watson.AIOps.and.NOI.Operator@uk.ibm.com' }],
        repository: {
          repositoryId: '917e936b-ee46-4137-a0e8-033e60dc402c',
          name: 'ibm',
          url: 'oci://docker.io/ibmcom/ibm-operator-catalog:latest',
          private: false,
          kind: 3,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
      },
      sortedVersions: [{ version: '1.0.0', ts: 1607672828, containsSecurityUpdates: false, prerelease: false }],
      activeChannel: 'v1.0',
    },
    output: {
      methods: [
        {
          label: 'cli',
          title: 'OLM OCI',
          kind: 4,
          props: {
            name: 'aimanager-operator',
            repository: {
              repositoryId: '917e936b-ee46-4137-a0e8-033e60dc402c',
              name: 'ibm',
              url: 'oci://docker.io/ibmcom/ibm-operator-catalog:latest',
              private: false,
              kind: 3,
              verifiedPublisher: false,
              official: false,
              userAlias: 'user',
            },
            activeChannel: 'v1.0',
          },
        },
      ],
    },
  },
  {
    title: 'OLM OCI operator with custom install',
    input: {
      pkg: {
        packageId: '622fc210-47fa-4697-b263-5e55a2d19a5d',
        name: 'aimanager-operator',
        normalizedName: 'aimanager-operator',
        logoImageId: 'b02b79cd-64a5-43e7-8bd0-e625405b4391',
        isOperator: true,
        channels: [{ name: 'v1.0', version: '1.0.0' }],
        defaultChannel: 'v1.0',
        displayName: 'IBM Watson AIOps AI Manager',
        description: 'Automate how you detect, diagnose, and respond to IT incidents in real time.',
        keywords: ['AI', ''],
        readme:
          '# aimanager-operator\n\n## Introduction\n\nYou can use the aimanager-operator to install IBM Watson AIOps AI Manager either on its own, or as part of IBM Watson AIOps.\n\n## Details\n\nAI Manager collects information from all of your IT assets, such as applications, the infrastructure that they run on, and the networking systems that support them. It then uses that data to uncover hidden insights and identify root causes of events. Training your models leads to better event discovery and a more accurate understanding of your topology. With this advanced understanding of your topology, you can pinpoint where events occur (fault localization) and how far-reaching their impact is (blast radius). When AI Manager detects potential incidents, it creates a story about the incident. Then, it uses a ChatOps environment to notify, update, and provide your team with near real time potential remedies.\n\nFor more information about Watson AIOps and AI Manager, see the [IBM Knowledge Center](https://www.ibm.com/support/knowledgecenter/en/SSQLRP_2.1/kc_welcome_waiops.html).\n\n### Operator versions\n\n- 1.0.0\n  - Initial version\n\n## Prerequisites\n\nBefore you install this operator, you must complete the prerequisites.\n\nFor more information about prerequisites, see the [IBM Watson AIOps 2.1 IBM Knowledge Center](https://www.ibm.com/support/knowledgecenter/en/SSQLRP_2.1/install/waiops-install-ovr.html).\n\n### Supported platforms\n\nRed Hat OpenShift Container Platform 4.5 or 4.6 or newer installed on the following platforms:\n\n   - Linux x86_64\n\nCurrently, only `amd64` worker nodes are supported.\n\n## SecurityContextConstraints Requirements\n\nThe aimanager-operator service supports running with the following OpenShift Container Platform 4.5+ or 4.6+ Security Context Constraints (SCCs). All of the pods use this SCC. An SCC constrains pod actions.\n\n  - Privileged SCC for operands: [`ibm-privileged-scc`](https://ibm.biz/cpkspec-scc)\n  - Custom SCC for operators: [`custom-scc`](https://www.ibm.com/support/knowledgecenter/en/SSQLRP_2.1/install/aiops-prereqs.html#security)\n\nTo add an SCC to your service account, enter the following command:\n\n```\noc adm policy add-scc-to-user ibm-aimanager-scc system:serviceaccount:namespace:aimanager-service-account\n```\n\n## Resources Required\n\nThis operator has no dependencies.\n\nFor more information about sizing and storage requirements, see[AI Manager system and storage requirements](https://www.ibm.com/support/knowledgecenter/en/SSQLRP_2.1/install/aiops-prereqs.html#reqs).\n\n## Configuration\n\n### Ingress controller configuration\n\nYour OpenShift environment might need an update for network policy functionality. Enter the following command to determine whether your OpenShift environment is affected. View the default ingress controller and locate the property `endpointPublishingStrategy.type`. If it is set to `HostNetwork`, the network policy will not work against routes unless the default namespace contains the selector label.\n\n```\nkubectl get ingresscontroller default -n openshift-ingress-operator -o yaml\n\n  endpointPublishingStrategy:\n    type: HostNetwork\n```\n\nTo set the label by a patch of the default namespace, enter the following command:\n\n```\nkubectl patch namespace default --type=json -p \'[{"op":"add","path":"/metadata/labels","value":{"network.openshift.io/policy-group":"ingress"}}]\'\n```\n\nFor more information about additional configurations to AI Manager, see [Administering and configuring IBM Watson AIOps](https://www.ibm.com/support/knowledgecenter/en/SSQLRP_2.1/admin/aiops-admin-ovr.html)\n\n## Installing\n\nTo install the operator, follow the installation and configuration instructions within the IBM Knowledge Center. For more information about installing IBM Watson AIOps and its components, see [Installing Watson AIOps](https://www.ibm.com/support/knowledgecenter/en/SSQLRP_2.1/install/waiops-install-ovr.html).\n\n## Limitations\n\nThe AI Manager IBM Knowledge Center includes a list of known issues. For more information, see [AI Manager known issues](https://www.ibm.com/support/knowledgecenter/en/SSQLRP_2.1/about/aiops-trouble.html).\n\n## Documentation\n\nFull documentation on AI Manager can be found in the [IBM Watson AIOps AI Manager IBM Knowledge Center](https://ibm.biz/WatsonAIOps2).\n',
        crds: [
          {
            kind: 'AIManagerMainProd',
            name: 'aimanagermainprods.ai-manager.watson-aiops.ibm.com',
            version: 'v1beta1',
            description:
              'AIManagerMainProd is the Schema for the aimanagermainprods API.  Documentation For additional details regarding install parameters check: https://ibm.biz/WatsonAIOps2. License By installing this product you accept the license terms https://ibm.biz/WatsonAIOps2.',
            displayName: 'AI Manager Main Prod',
          },
          {
            kind: 'AIManager',
            name: 'aimanagers.ai-manager.watson-aiops.ibm.com',
            version: 'v1beta1',
            description:
              'AIManager Deploys the IBM Watson AIOps AI Manager service components of IBM Watson AIOps. Documentation For additional details regarding install parameters check: https://ibm.biz/WatsonAIOps2. License By installing this product you accept the license terms https://ibm.biz/WatsonAIOps2.',
            displayName: 'AI Manager',
          },
        ],
        capabilities: 'seamless upgrades',
        data: { isGlobalOperator: false },
        version: '1.0.0',
        availableVersions: [{ version: '1.0.0', ts: 1607672828, containsSecurityUpdates: false, prerelease: false }],
        deprecated: false,
        signed: false,
        provider: 'IBM',
        hasValuesSchema: false,
        hasChangelog: false,
        ts: 1607672828,
        install: '###Custom install',
        maintainers: [{ name: 'IBM Support', email: 'IBM.Watson.AIOps.and.NOI.Operator@uk.ibm.com' }],
        repository: {
          repositoryId: '917e936b-ee46-4137-a0e8-033e60dc402c',
          name: 'ibm',
          url: 'oci://docker.io/ibmcom/ibm-operator-catalog:latest',
          private: false,
          kind: 3,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
      },
      sortedVersions: [{ version: '1.0.0', ts: 1607672828, containsSecurityUpdates: false, prerelease: false }],
      activeChannel: 'v1.0',
    },
    output: {
      methods: [
        {
          label: 'custom',
          title: 'Custom',
          kind: 0,
          props: {
            install: '###Custom install',
          },
        },
        {
          label: 'cli',
          title: 'OLM OCI',
          kind: 4,
          props: {
            name: 'aimanager-operator',
            repository: {
              repositoryId: '917e936b-ee46-4137-a0e8-033e60dc402c',
              name: 'ibm',
              url: 'oci://docker.io/ibmcom/ibm-operator-catalog:latest',
              private: false,
              kind: 3,
              verifiedPublisher: false,
              official: false,
              userAlias: 'user',
            },
            activeChannel: 'v1.0',
          },
        },
      ],
    },
  },
  {
    title: 'OLM operator without active channel',
    input: {
      pkg: {
        packageId: '5623a8fc-4ef3-451a-b977-71e2fe53b7f9',
        name: 'akka-cluster-operator',
        normalizedName: 'akka-cluster-operator',
        logoImageId: 'f973c8bb-4163-4e32-9090-610917169470',
        isOperator: true,
        channels: [{ name: 'alpha', version: '1.0.0' }],
        defaultChannel: 'alpha',
        displayName: 'Akka Cluster Operator',
        description: 'Run Akka Cluster applications on Kubernetes.',
        keywords: ['Akka', 'Akka Cluster', 'Lightbend', 'Application Runtime'],
        readme:
          'The Akka Cluster Operator allows you to manage applications designed for\n[Akka Cluster](https://doc.akka.io/docs/akka/current/common/cluster.html).\nClustering with [Akka](https://doc.akka.io/docs/akka/current/guide/introduction.html) provides a\nfault-tolerant, decentralized, peer-to-peer based cluster\nfor building stateful, distributed applications with no single point of failure.\nDevelopers should use Akka Management v1.x or newer, with both Bootstrap and HTTP modules enabled.\nWhen deploying using the Akka Cluster Operator, only the `management port` needs to be defined.\nDefaults are provided by the Operator for all other required configuration.\nThe Akka Cluster Operator provides scalability control and membership status information\nfor deployed applications using Akka Cluster. As part of supervising membership of running clusters,\nthis Operator creates a pod-listing ServiceAccount, Role, and RoleBinding suitable for\neach application. See the project [Readme](https://github.com/lightbend/akka-cluster-operator/blob/master/README.md)\nfor more information and details.\n',
        links: [
          { url: 'https://github.com/lightbend/akka-cluster-operator', name: 'source' },
          { url: 'https://doc.akka.io/docs/akka/current/guide/introduction.html', name: 'Intro to Akka' },
          { url: 'https://doc.akka.io/docs/akka/current/common/cluster.html', name: 'Intro to Akka Cluster' },
          { url: 'https://github.com/lightbend/akka-java-cluster-openshift', name: 'Akka Cluster demo application' },
          {
            url: 'https://developer.lightbend.com/guides/openshift-deployment/lagom/index.html',
            name: 'Deploying a Lagom application to OpenShift',
          },
        ],
        crds: [
          {
            kind: 'AkkaCluster',
            name: 'akkaclusters.app.lightbend.com',
            version: 'v1alpha1',
            description: 'An example Akka Cluster app that provides cluster visualization.',
            displayName: 'Akka Cluster',
          },
        ],
        crdsExamples: [
          {
            kind: 'AkkaCluster',
            spec: {
              replicas: 3,
              template: {
                spec: {
                  containers: [
                    {
                      name: 'main',
                      image: 'lightbend-docker-registry.bintray.io/lightbend/akka-cluster-demo:1.1.0',
                      ports: [
                        { name: 'http', containerPort: 8080 },
                        { name: 'remoting', containerPort: 2552 },
                        { name: 'management', containerPort: 8558 },
                      ],
                      livenessProbe: {
                        httpGet: { path: '/alive', port: 'management' },
                        periodSeconds: 10,
                        failureThreshold: 10,
                        initialDelaySeconds: 20,
                      },
                      readinessProbe: {
                        httpGet: { path: '/ready', port: 'management' },
                        periodSeconds: 10,
                        failureThreshold: 10,
                        initialDelaySeconds: 20,
                      },
                    },
                  ],
                },
              },
            },
            metadata: { name: 'akka-cluster-demo' },
            apiVersion: 'app.lightbend.com/v1alpha1',
          },
        ],
        capabilities: 'seamless upgrades',
        data: { isGlobalOperator: true },
        version: '1.0.0',
        availableVersions: [
          { version: '1.0.0', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
          { version: '0.2.3', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
          { version: '0.2.0', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
          { version: '0.0.1', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
        ],
        deprecated: false,
        signed: false,
        containersImages: [
          {
            name: '',
            image: 'lightbend-docker-registry.bintray.io/lightbend/akkacluster-operator:v1.0.0',
          },
        ],
        provider: 'Lightbend, Inc.',
        hasValuesSchema: false,
        hasChangelog: false,
        ts: 1561735380,
        maintainers: [{ name: 'Lightbend, Inc.', email: 'info@lightbend.com' }],
        repository: {
          repositoryId: '693a42c8-70bd-49a3-81dc-a09153374d94',
          name: 'community-operators',
          url: 'https://github.com/operator-framework/community-operators/upstream-community-operators',
          private: false,
          kind: 3,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
      },
      sortedVersions: [
        { version: '1.0.0', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
        { version: '0.2.3', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
        { version: '0.2.0', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
        { version: '0.0.1', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
      ],
    },
    output: {
      methods: [],
    },
  },
  {
    title: 'OLM operator not from community-operators',
    input: {
      pkg: {
        packageId: '503e012a-76fa-4bc3-8fd4-5e49837f51de',
        name: 'ditto-operator',
        normalizedName: 'ditto-operator',
        logoImageId: 'e0d805b3-1802-4a66-adc6-b0b5fab6c1d1',
        isOperator: true,
        channels: [{ name: 'alpha', version: '0.2.0' }],
        defaultChannel: 'alpha',
        displayName: 'Eclipse Ditto',
        description:
          'Eclipse Ditto provides a Digital Twin platform. A digital twin is a virtual, cloud based, representation of his real world counterpart.',
        keywords: ['IoT', 'Digital Twin', 'Streaming & Messaging'],
        readme:
          'The Ditto Operator creates and maintains an Eclipse Ditto™ instance.\n\n[Eclipse Ditto](https://eclipse.org/ditto) is a "digital twin" platform.\n\n### Pre-requisites\n* A MongoDB instance\n\n### Supported Features\n* **Installation**: Deploy an instance of Eclipse Ditto.\n* **Upgrade**: Upgrade to a newer version of Eclips Ditto.\n\n### Contributing\nYou can contribute by:\n* Raising any issues you find using the Ditto Operator\n* Fixing issues by opening [Pull Requests](https://github.com/ctron/ditto-operator/pulls)\n* Improving [documentation](https://github.com/ctron/ditto-operator)\n* Talking about the Ditto Operator\n\nAll bugs, tasks or enhancements are tracked as [GitHub issues](https://github.com/ctron/ditto-operator/issues).\n### License\nDitto Operator is licensed under the [Eclipse Public License 2.0](https://github.com/ctron/ditto-operator/blob/master/LICENSE)\n',
        links: [
          { url: 'https://github.com/ctron/ditto-operator', name: 'source' },
          { url: 'https://github.com/ctron/ditto-operator', name: 'GitHub' },
          { url: 'https://github.com/eclipse/ditto', name: 'Eclipse Ditto™' },
        ],
        crds: [
          {
            kind: 'Ditto',
            name: 'dittos.iot.eclipse.org',
            version: 'v1alpha1',
            description: 'Eclipse Ditto™ is a Digital Twin platform',
            displayName: 'Eclipse Ditto',
          },
        ],
        crdsExamples: [
          {
            kind: 'Ditto',
            spec: { mongoDb: { host: 'mongodb' } },
            metadata: { name: 'example-ditto' },
            apiVersion: 'iot.eclipse.org/v1alpha1',
          },
        ],
        capabilities: 'seamless upgrades',
        data: { isGlobalOperator: false },
        version: '0.2.0',
        availableVersions: [
          { version: '0.2.0', ts: 1604681700, containsSecurityUpdates: false, prerelease: false },
          { version: '0.1.1', ts: 1595186100, containsSecurityUpdates: false, prerelease: false },
          { version: '0.1.0', ts: 1592590620, containsSecurityUpdates: false, prerelease: false },
        ],
        deprecated: false,
        signed: false,
        containersImages: [{ name: '', image: 'docker.io/ctron/ditto-operator:0.2.0' }],
        provider: 'Jens Reimann',
        hasValuesSchema: false,
        hasChangelog: false,
        ts: 1604681700,
        maintainers: [{ name: 'Jens Reimann', email: 'ctron@dentrassi.de' }],
        repository: {
          repositoryId: '72ea9baf-b8c9-4e3b-b213-a12f14ac5996',
          name: 'ditto',
          url: 'https://github.com/ctron/ditto-operator/olm',
          private: false,
          kind: 3,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
      },
      sortedVersions: [
        { version: '0.2.0', ts: 1604681700, containsSecurityUpdates: false, prerelease: false },
        { version: '0.1.1', ts: 1595186100, containsSecurityUpdates: false, prerelease: false },
        { version: '0.1.0', ts: 1592590620, containsSecurityUpdates: false, prerelease: false },
      ],
      activeChannel: 'alpha',
    },
    output: {
      methods: [],
    },
  },
  {
    title: 'OLM operator from community-operators',
    input: {
      pkg: {
        packageId: '5623a8fc-4ef3-451a-b977-71e2fe53b7f9',
        name: 'akka-cluster-operator',
        normalizedName: 'akka-cluster-operator',
        logoImageId: 'f973c8bb-4163-4e32-9090-610917169470',
        isOperator: true,
        channels: [{ name: 'alpha', version: '1.0.0' }],
        defaultChannel: 'alpha',
        displayName: 'Akka Cluster Operator',
        description: 'Run Akka Cluster applications on Kubernetes.',
        keywords: ['Akka', 'Akka Cluster', 'Lightbend', 'Application Runtime'],
        readme:
          'The Akka Cluster Operator allows you to manage applications designed for\n[Akka Cluster](https://doc.akka.io/docs/akka/current/common/cluster.html).\nClustering with [Akka](https://doc.akka.io/docs/akka/current/guide/introduction.html) provides a\nfault-tolerant, decentralized, peer-to-peer based cluster\nfor building stateful, distributed applications with no single point of failure.\nDevelopers should use Akka Management v1.x or newer, with both Bootstrap and HTTP modules enabled.\nWhen deploying using the Akka Cluster Operator, only the `management port` needs to be defined.\nDefaults are provided by the Operator for all other required configuration.\nThe Akka Cluster Operator provides scalability control and membership status information\nfor deployed applications using Akka Cluster. As part of supervising membership of running clusters,\nthis Operator creates a pod-listing ServiceAccount, Role, and RoleBinding suitable for\neach application. See the project [Readme](https://github.com/lightbend/akka-cluster-operator/blob/master/README.md)\nfor more information and details.\n',
        links: [
          { url: 'https://github.com/lightbend/akka-cluster-operator', name: 'source' },
          { url: 'https://doc.akka.io/docs/akka/current/guide/introduction.html', name: 'Intro to Akka' },
          { url: 'https://doc.akka.io/docs/akka/current/common/cluster.html', name: 'Intro to Akka Cluster' },
          { url: 'https://github.com/lightbend/akka-java-cluster-openshift', name: 'Akka Cluster demo application' },
          {
            url: 'https://developer.lightbend.com/guides/openshift-deployment/lagom/index.html',
            name: 'Deploying a Lagom application to OpenShift',
          },
        ],
        crds: [
          {
            kind: 'AkkaCluster',
            name: 'akkaclusters.app.lightbend.com',
            version: 'v1alpha1',
            description: 'An example Akka Cluster app that provides cluster visualization.',
            displayName: 'Akka Cluster',
          },
        ],
        crdsExamples: [
          {
            kind: 'AkkaCluster',
            spec: {
              replicas: 3,
              template: {
                spec: {
                  containers: [
                    {
                      name: 'main',
                      image: 'lightbend-docker-registry.bintray.io/lightbend/akka-cluster-demo:1.1.0',
                      ports: [
                        { name: 'http', containerPort: 8080 },
                        { name: 'remoting', containerPort: 2552 },
                        { name: 'management', containerPort: 8558 },
                      ],
                      livenessProbe: {
                        httpGet: { path: '/alive', port: 'management' },
                        periodSeconds: 10,
                        failureThreshold: 10,
                        initialDelaySeconds: 20,
                      },
                      readinessProbe: {
                        httpGet: { path: '/ready', port: 'management' },
                        periodSeconds: 10,
                        failureThreshold: 10,
                        initialDelaySeconds: 20,
                      },
                    },
                  ],
                },
              },
            },
            metadata: { name: 'akka-cluster-demo' },
            apiVersion: 'app.lightbend.com/v1alpha1',
          },
        ],
        capabilities: 'seamless upgrades',
        data: { isGlobalOperator: true },
        version: '1.0.0',
        availableVersions: [
          { version: '1.0.0', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
          { version: '0.2.3', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
          { version: '0.2.0', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
          { version: '0.0.1', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
        ],
        deprecated: false,
        signed: false,
        containersImages: [
          {
            name: '',
            image: 'lightbend-docker-registry.bintray.io/lightbend/akkacluster-operator:v1.0.0',
          },
        ],
        provider: 'Lightbend, Inc.',
        hasValuesSchema: false,
        hasChangelog: false,
        ts: 1561735380,
        maintainers: [{ name: 'Lightbend, Inc.', email: 'info@lightbend.com' }],
        repository: {
          repositoryId: '693a42c8-70bd-49a3-81dc-a09153374d94',
          name: 'community-operators',
          url: 'https://github.com/operator-framework/community-operators/upstream-community-operators',
          private: false,
          kind: 3,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
      },
      sortedVersions: [
        { version: '1.0.0', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
        { version: '0.2.3', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
        { version: '0.2.0', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
        { version: '0.0.1', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
      ],
      activeChannel: 'alpha',
    },
    output: {
      methods: [
        {
          label: 'cli',
          title: 'Operator Lifecycle Manager',
          shortTitle: 'OLM CLI',
          kind: 3,
          props: { name: 'akka-cluster-operator', isGlobalOperator: true, activeChannel: 'alpha', isPrivate: false },
        },
      ],
    },
  },
  {
    title: 'OLM operator with not selected latest version',
    input: {
      pkg: {
        packageId: '5623a8fc-4ef3-451a-b977-71e2fe53b7f9',
        name: 'akka-cluster-operator',
        normalizedName: 'akka-cluster-operator',
        logoImageId: 'f973c8bb-4163-4e32-9090-610917169470',
        isOperator: true,
        channels: [{ name: 'alpha', version: '1.0.0' }],
        defaultChannel: 'alpha',
        displayName: 'Akka Cluster Operator',
        description: 'Run Akka Cluster applications on Kubernetes.',
        keywords: ['Akka', 'Akka Cluster', 'Lightbend', 'Application Runtime'],
        readme:
          'The Akka Cluster Operator allows you to manage applications designed for\n[Akka Cluster](https://doc.akka.io/docs/akka/current/common/cluster.html).\nClustering with [Akka](https://doc.akka.io/docs/akka/current/guide/introduction.html) provides a\nfault-tolerant, decentralized, peer-to-peer based cluster\nfor building stateful, distributed applications with no single point of failure.\nDevelopers should use Akka Management v1.x or newer, with both Bootstrap and HTTP modules enabled.\nWhen deploying using the Akka Cluster Operator, only the `management port` needs to be defined.\nDefaults are provided by the Operator for all other required configuration.\nThe Akka Cluster Operator provides scalability control and membership status information\nfor deployed applications using Akka Cluster. As part of supervising membership of running clusters,\nthis Operator creates a pod-listing ServiceAccount, Role, and RoleBinding suitable for\neach application. See the project [Readme](https://github.com/lightbend/akka-cluster-operator/blob/master/README.md)\nfor more information and details.\n',
        links: [
          { url: 'https://github.com/lightbend/akka-cluster-operator', name: 'source' },
          { url: 'https://doc.akka.io/docs/akka/current/guide/introduction.html', name: 'Intro to Akka' },
          { url: 'https://doc.akka.io/docs/akka/current/common/cluster.html', name: 'Intro to Akka Cluster' },
          { url: 'https://github.com/lightbend/akka-java-cluster-openshift', name: 'Akka Cluster demo application' },
          {
            url: 'https://developer.lightbend.com/guides/openshift-deployment/lagom/index.html',
            name: 'Deploying a Lagom application to OpenShift',
          },
        ],
        crds: [
          {
            kind: 'AkkaCluster',
            name: 'akkaclusters.app.lightbend.com',
            version: 'v1alpha1',
            description: 'An example Akka Cluster app that provides cluster visualization.',
            displayName: 'Akka Cluster',
          },
        ],
        crdsExamples: [
          {
            kind: 'AkkaCluster',
            spec: {
              replicas: 3,
              template: {
                spec: {
                  containers: [
                    {
                      name: 'main',
                      image: 'lightbend-docker-registry.bintray.io/lightbend/akka-cluster-demo:1.1.0',
                      ports: [
                        { name: 'http', containerPort: 8080 },
                        { name: 'remoting', containerPort: 2552 },
                        { name: 'management', containerPort: 8558 },
                      ],
                      livenessProbe: {
                        httpGet: { path: '/alive', port: 'management' },
                        periodSeconds: 10,
                        failureThreshold: 10,
                        initialDelaySeconds: 20,
                      },
                      readinessProbe: {
                        httpGet: { path: '/ready', port: 'management' },
                        periodSeconds: 10,
                        failureThreshold: 10,
                        initialDelaySeconds: 20,
                      },
                    },
                  ],
                },
              },
            },
            metadata: { name: 'akka-cluster-demo' },
            apiVersion: 'app.lightbend.com/v1alpha1',
          },
        ],
        capabilities: 'seamless upgrades',
        data: { isGlobalOperator: true },
        version: '0.2.0',
        availableVersions: [
          { version: '1.0.0', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
          { version: '0.2.3', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
          { version: '0.2.0', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
          { version: '0.0.1', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
        ],
        deprecated: false,
        signed: false,
        containersImages: [
          {
            name: '',
            image: 'lightbend-docker-registry.bintray.io/lightbend/akkacluster-operator:v1.0.0',
          },
        ],
        provider: 'Lightbend, Inc.',
        hasValuesSchema: false,
        hasChangelog: false,
        ts: 1561735380,
        maintainers: [{ name: 'Lightbend, Inc.', email: 'info@lightbend.com' }],
        repository: {
          repositoryId: '693a42c8-70bd-49a3-81dc-a09153374d94',
          name: 'community-operators',
          url: 'https://github.com/operator-framework/community-operators/upstream-community-operators',
          private: false,
          kind: 3,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
      },
      sortedVersions: [
        { version: '1.0.0', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
        { version: '0.2.3', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
        { version: '0.2.0', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
        { version: '0.0.1', ts: 1561735380, containsSecurityUpdates: false, prerelease: false },
      ],
      activeChannel: 'alpha',
    },
    output: { methods: [], errorMessage: 'Only the current version can be installed' },
  },
  {
    title: 'OLM operator with not default active channel',
    input: {
      pkg: {
        packageId: '8fee91bc-2fd7-448c-9b3a-102c0eac5cee',
        name: 'appranix',
        normalizedName: 'appranix',
        logoImageId: 'b54e1861-8cb0-46e1-842c-ceee6b4285e6',
        isOperator: true,
        channels: [
          { name: 'stable', version: '2.3.0' },
          { name: 'deprecated', version: '1.0.0' },
        ],
        defaultChannel: 'stable',
        displayName: 'Appranix CPS Operator',
        description:
          'The Appranix CPS operator enables you to back up and restore your Kubernetes/OpenShift cluster resources and persistent volumes.',
        keywords: ['appranix', 'container protection service', 'application resilience service', 'aps', 'Monitoring'],
        links: [
          {
            url:
              'https://github.com/operator-framework/community-operators/tree/master/upstream-community-operators/appranix',
            name: 'source',
          },
          { url: 'https://www.appranix.com/', name: 'Website' },
          { url: 'https://twitter.com/AppranixOne/', name: 'twitter' },
          { url: 'https://www.linkedin.com/company/appranix/', name: 'LinkedIn' },
          {
            url:
              'https://github.com/operator-framework/community-operators/tree/master/upstream-community-operators/appranix',
            name: 'GitHub Repository',
          },
        ],
        crds: [
          {
            kind: 'Backup',
            name: 'backups.aps.appranix.com',
            version: 'v1',
            description:
              'Backup respresents the capture of K8s cluster state at a point in time (API objects and associated volume state).',
            displayName: 'Backup',
          },
          {
            kind: 'Schedule',
            name: 'schedules.aps.appranix.com',
            version: 'v1',
            description:
              'Schedule is an Appranix resource that represents a pre-scheduled or periodic Backup that should be run.',
            displayName: 'Schedule',
          },
          {
            kind: 'Restore',
            name: 'restores.aps.appranix.com',
            version: 'v1',
            description:
              'Restore represents the application of resources from an Appranix backup to a target K8s cluster.',
            displayName: 'Restore',
          },
          {
            kind: 'DownloadRequest',
            name: 'downloadrequests.aps.appranix.com',
            version: 'v1',
            description:
              'DownloadRequest is a request to download an artifact from backup object storage, such as a backup log file.',
            displayName: 'DownloadRequest',
          },
          {
            kind: 'DeleteBackupRequest',
            name: 'deletebackuprequests.aps.appranix.com',
            version: 'v1',
            description: 'DeleteBackupRequest is a request to delete one or more backups.',
            displayName: 'DeleteBackupRequest',
          },
          {
            kind: 'PodVolumeBackup',
            name: 'podvolumebackups.aps.appranix.com',
            version: 'v1',
            description: "PodVolumeBackup respresents the capture of the Pod's volume at a point in time.",
            displayName: 'PodVolumeBackup',
          },
          {
            kind: 'PodVolumeRestore',
            name: 'podvolumerestores.aps.appranix.com',
            version: 'v1',
            description: 'PodVolumeRestore represents the restoration of a PodVolume from a volume snapshot.',
            displayName: 'PodVolumeRestore',
          },
          {
            kind: 'ResticRepository',
            name: 'resticrepositories.aps.appranix.com',
            version: 'v1',
            description: 'ResticRepository represents the repository from where the restic tool is to be downloaded.',
            displayName: 'ResticRepository',
          },
          {
            kind: 'BackupStorageLocation',
            name: 'backupstoragelocations.aps.appranix.com',
            version: 'v1',
            description: 'BackupStorageLocation represents a storage bucket in a supported cloud provider.',
            displayName: 'BackupStorageLocation',
          },
          {
            kind: 'VolumeSnapshotLocation',
            name: 'volumesnapshotlocations.aps.appranix.com',
            version: 'v1',
            description: 'VolumeSnapshotLocation is a location where Appranix stores volume snapshots.',
            displayName: 'VolumeSnapshotLocation',
          },
          {
            kind: 'ServerStatusRequest',
            name: 'serverstatusrequests.aps.appranix.com',
            version: 'v1',
            description:
              'ServerStatusRequest is a request to access current status information about the Appranix server.',
            displayName: 'ServerStatusRequest',
          },
        ],
        capabilities: 'seamless upgrades',
        data: { isGlobalOperator: false },
        version: '2.3.0',
        availableVersions: [
          { version: '2.3.0', ts: 1581321470, containsSecurityUpdates: false, prerelease: false },
          { version: '1.0.0', ts: 1580368555, containsSecurityUpdates: false, prerelease: false },
        ],
        deprecated: false,
        signed: false,
        containersImages: [{ name: '', image: 'gcr.io/appranix-public-cr/dev/aps/apx-operator:2.3' }],
        provider: 'Appranix, Inc',
        hasValuesSchema: false,
        hasChangelog: false,
        ts: 1581321470,
        maintainers: [{ name: 'Appranix', email: 'support@appranix.com' }],
        repository: {
          repositoryId: '693a42c8-70bd-49a3-81dc-a09153374d94',
          name: 'community-operators',
          url: 'https://github.com/operator-framework/community-operators/upstream-community-operators',
          private: false,
          kind: 3,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
      },
      sortedVersions: [
        { version: '2.3.0', ts: 1581321470, containsSecurityUpdates: false, prerelease: false },
        { version: '1.0.0', ts: 1580368555, containsSecurityUpdates: false, prerelease: false },
      ],
      activeChannel: 'deprecated',
    },
    output: {
      methods: [
        {
          label: 'cli',
          title: 'Operator Lifecycle Manager',
          shortTitle: 'OLM CLI',
          kind: 3,
          props: { name: 'appranix', isGlobalOperator: false, activeChannel: 'deprecated', isPrivate: false },
        },
      ],
    },
  },
  {
    title: 'OPA policies with custom install',
    input: {
      pkg: {
        packageId: '1c400586-5f13-4d2b-91cc-6eb3813f87fb',
        name: 'deprek8ion',
        normalizedName: 'deprek8ion',
        isOperator: false,
        displayName: 'Deprek8ion',
        description: 'A set of rego policies to monitor Kubernetes APIs deprecations',
        keywords: ['monitoring', 'kubernetes', 'deprecations', 'policies', 'opa'],
        homeUrl: 'https://github.com/swade1987/deprek8ion',
        install: '###Custom install',
        readme:
          '# Deprek8ion 🕵️‍\n\nA set of rego policies to monitor Kubernetes APIs deprecations.\n\nThe Kubernetes API deprecations can be found using <https://relnotes.k8s.io/?markdown=deprecated>.\n\n## Docker image\n\nThe docker container contains the most recent version of [conftest](https://github.com/instrumenta/conftest) as well as the policies at `/policies`.\n\nImage tags can be found at [https://eu.gcr.io/swade1987/deprek8ion](https://eu.gcr.io/swade1987/deprek8ion)\n\n## Example usage\n\nAn example of how to use the docker container can be seen below:\n\n```sh\ndocker run --rm --name demo -v $(pwd)/demo:/demo eu.gcr.io/swade1987/deprek8ion:1.1.17 /demo/ingress.yaml\n```\n\nOr directly pipe some resources into the container:\n\n```sh\ncat ./demo/ingress.yaml | docker run --rm -i eu.gcr.io/swade1987/deprek8ion:1.1.17 -\n```\n',
        links: [{ url: 'https://github.com/swade1987/deprek8ion/tree/master/policies', name: 'source' }],
        data: {
          policies: {
            '_cert-manager.rego':
              'package main\n\ndeny[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _deny with input as obj\n}\n\ndeny[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _deny\n}\n\nwarn[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _warn with input as obj\n}\n\nwarn[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _warn\n}\n\n# Based on https://github.com/jetstack/cert-manager/releases/tag/v0.11.0\n\n_deny = msg {\n  kinds := ["Certificate", "Issuer", "ClusterIssuer", "CertificateRequest"]\n  input.apiVersion == "certmanager.k8s.io/v1alpha1"\n  input.kind == kinds[_]\n  msg := sprintf("%s/%s: API certmanager.k8s.io/v1alpha1 for %s is obsolete, use cert-manager.io/v1alpha2 instead.", [input.kind, input.metadata.name, input.kind])\n}\n\n_deny = msg {\n  kinds := ["Order", "Challenge"]\n  input.apiVersion == "certmanager.k8s.io/v1alpha1"\n  input.kind == kinds[_]\n  msg := sprintf("%s/%s: API certmanager.k8s.io/v1alpha1 for %s is obsolete, use acme.cert-manager.io/v1alpha2 instead.", [input.kind, input.metadata.name, input.kind])\n}',
            'kubernetes-1.16.rego':
              'package main\n\ndeny[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _deny with input as obj\n}\n\ndeny[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _deny\n}\n\n# Based on https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.16.md\n\n# All resources under apps/v1beta1 and apps/v1beta2 - use apps/v1 instead\n_deny = msg {\n  apis := ["apps/v1beta1", "apps/v1beta2"]\n  input.apiVersion == apis[_]\n  msg := sprintf("%s/%s: API %s has been deprecated, use apps/v1 instead.", [input.kind, input.metadata.name, input.apiVersion])\n}\n\n# daemonsets, deployments, replicasets resources under extensions/v1beta1 - use apps/v1 instead\n_deny = msg {\n  resources := ["DaemonSet", "Deployment", "ReplicaSet"]\n  input.apiVersion == "extensions/v1beta1"\n  input.kind == resources[_]\n  msg := sprintf("%s/%s: API extensions/v1beta1 for %s has been deprecated, use apps/v1 instead.", [input.kind, input.metadata.name, input.kind])\n}\n\n# networkpolicies resources under extensions/v1beta1 - use networking.k8s.io/v1 instead\n_deny = msg {\n  input.apiVersion == "extensions/v1beta1"\n  input.kind == "NetworkPolicy"\n  msg := sprintf("%s/%s: API extensions/v1beta1 for NetworkPolicy has been deprecated, use networking.k8s.io/v1 instead.", [input.kind, input.metadata.name])\n}\n\n# podsecuritypolicies resources under extensions/v1beta1 - use policy/v1beta1 instead\n_deny = msg {\n  input.apiVersion == "extensions/v1beta1"\n  input.kind == "PodSecurityPolicy"\n  msg := sprintf("%s/%s: API extensions/v1beta1 for PodSecurityPolicy has been deprecated, use policy/v1beta1 instead.", [input.kind, input.metadata.name])\n}\n\n# PriorityClass resources will no longer be served from scheduling.k8s.io/v1beta1 and scheduling.k8s.io/v1alpha1 in v1.17.\n_deny = msg {\n  apis := ["scheduling.k8s.io/v1beta1", "scheduling.k8s.io/v1alpha1"]\n  input.apiVersion == apis[_]\n  input.kind == "PriorityClass"\n  msg := sprintf("%s/%s: API %s for PriorityClass has been deprecated, use scheduling.k8s.io/v1 instead.", [input.kind, input.metadata.name, input.apiVersion])\n}',
            'kubernetes-1.17.rego':
              'package main\n\ndeny[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _deny with input as obj\n}\n\ndeny[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _deny\n}\n\n# Based on https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.16.md\n\n# PriorityClass resources will no longer be served from scheduling.k8s.io/v1beta1 and scheduling.k8s.io/v1alpha1 in v1.17.\n_deny = msg {\n  apis := ["scheduling.k8s.io/v1beta1", "scheduling.k8s.io/v1alpha1"]\n  input.apiVersion == apis[_]\n  input.kind == "PriorityClass"\n  msg := sprintf("%s/%s: API %s for PriorityClass has been deprecated, use scheduling.k8s.io/v1 instead.", [input.kind, input.metadata.name, input.apiVersion])\n}',
            'kubernetes-1.18.rego':
              'package main\n\ndeny[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _deny with input as obj\n}\n\ndeny[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _deny\n}\n\n# Based on https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.18.md\n\n# Within Ingress resources spec.ingressClassName replaces the deprecated kubernetes.io/ingress.class annotation.\n_deny = msg {\n  resources := ["Ingress"]\n  input.kind == resources[_]\n  input.metadata.annotations["kubernetes.io/ingress.class"]\n  msg := sprintf("%s/%s: Ingress annotation kubernetes.io/ingress.class has been deprecated in 1.18, use spec.IngressClassName instead.", [input.kind, input.metadata.name])\n}',
            'kubernetes-1.19.rego':
              'package main\n\nwarn[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _warn with input as obj\n}\n\nwarn[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _warn\n}\n\n# Based on https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.16.md\n# Based on https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.19.md\n\n# The apiextensions.k8s.io/v1beta1 version of CustomResourceDefinition is deprecated in 1.19. Migrate to use apiextensions.k8s.io/v1 instead\n_warn = msg {\n  input.apiVersion == "apiextensions.k8s.io/v1beta1"\n  input.kind == "CustomResourceDefinition"\n msg := sprintf("%s/%s: API apiextensions.k8s.io/v1beta1 for CustomResourceDefinition is deprecated in 1.19, use apiextensions.k8s.io/v1 instead.", [input.kind, input.metadata.name])\n}\n\n# The apiregistration.k8s.io/v1beta1 version is deprecated in 1.19. Migrate to use apiregistration.k8s.io/v1 instead\n_warn = msg {\n  input.apiVersion == "apiregistration.k8s.io/v1beta1"\n  msg := sprintf("%s/%s: API apiregistration.k8s.io/v1beta1 is deprecated in Kubernetes 1.19, use apiregistration.k8s.io/v1 instead.", [input.kind, input.metadata.name])\n}\n\n# The authentication.k8s.io/v1beta1 version is deprecated in 1.19. Migrate to use authentication.k8s.io/v1 instead\n_warn = msg {\n  input.apiVersion == "authentication.k8s.io/v1beta1"\n  msg := sprintf("%s/%s: API authentication.k8s.io/v1beta1 is deprecated in Kubernetes 1.19, use authentication.k8s.io/v1 instead.", [input.kind, input.metadata.name])\n}\n\n# The authorization.k8s.io/v1beta1 version is deprecated in 1.19. Migrate to use authorization.k8s.io/v1 instead\n_warn = msg {\n  input.apiVersion == "authorization.k8s.io/v1beta1"\n  msg := sprintf("%s/%s: API authorization.k8s.io/v1beta1 is deprecated in Kubernetes 1.19, use authorization.k8s.io/v1 instead.", [input.kind, input.metadata.name])\n}\n\n# The autoscaling/v2beta1 version is deprecated in 1.19. Migrate to use autoscaling/v2beta2 instead\n_warn = msg {\n  input.apiVersion == "autoscaling/v2beta1"\n  msg := sprintf("%s/%s: API autoscaling/v2beta1 is deprecated in Kubernetes 1.19, use autoscaling/v2beta2 instead.", [input.kind, input.metadata.name])\n}\n\n# The coordination.k8s.io/v1beta1 version is deprecated in 1.19. Migrate to use coordination.k8s.io/v1 instead\n_warn = msg {\n  input.apiVersion == "coordination.k8s.io/v1beta1"\n  msg := sprintf("%s/%s: API coordination.k8s.io/v1beta1 is deprecated in Kubernetes 1.19, use coordination.k8s.io/v1 instead.", [input.kind, input.metadata.name])\n}\n\n# The storage.k8s.io/v1beta1 version is deprecated in 1.19. Migrate to use storage.k8s.io/v1 instead\n_warn = msg {\n  input.apiVersion == "storage.k8s.io/v1beta1"\n  msg := sprintf("%s/%s: API storage.k8s.io/v1beta1 is deprecated in Kubernetes 1.19, use storage.k8s.io/v1 instead.", [input.kind, input.metadata.name])\n}\n',
            'kubernetes-1.20.rego':
              'package main\n\nwarn[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _warn with input as obj\n}\n\nwarn[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _warn\n}\n\n# Based on https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.16.md\n\n# Ingress resources will no longer be served from extensions/v1beta1 in v1.20. Migrate use to the networking.k8s.io/v1beta1 API, available since v1.14.\n_warn = msg {\n  input.apiVersion == "extensions/v1beta1"\n  input.kind == "Ingress"\n  msg := sprintf("%s/%s: API extensions/v1beta1 for Ingress is deprecated from Kubernetes 1.20, use networking.k8s.io/v1beta1 instead.", [input.kind, input.metadata.name])\n}\n\n# All resources will no longer be served from rbac.authorization.k8s.io/v1alpha1 and rbac.authorization.k8s.io/v1beta1 in 1.20. Migrate to use rbac.authorization.k8s.io/v1 instead\n_warn = msg {\n  apis := ["rbac.authorization.k8s.io/v1alpha1", "rbac.authorization.k8s.io/v1beta1"]\n  input.apiVersion == apis[_]\n  msg := sprintf("%s/%s: API %s is deprecated from Kubernetes 1.20, use rbac.authorization.k8s.io/v1 instead.", [input.kind, input.metadata.name, input.apiVersion])\n}\n\n# Ingress resources will no longer be served from extensions/v1beta1 in v1.20. Migrate use to the networking.k8s.io/v1beta1 API, available since v1.14.\n_warn = msg {\n  input.apiVersion == "extensions/v1beta1"\n  input.kind == "Ingress"\n  msg := sprintf("%s/%s: API extensions/v1beta1 for Ingress is deprecated from Kubernetes 1.20, use networking.k8s.io/v1beta1 instead.", [input.kind, input.metadata.name])\n}',
            'kubernetes-1.22.rego':
              'package main\n\nwarn[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _warn with input as obj\n}\n\nwarn[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _warn\n}\n\n# Based on https://github.com/kubernetes/kubernetes/issues/82021\n\n# The admissionregistration.k8s.io/v1beta1 versions of MutatingWebhookConfiguration and ValidatingWebhookConfiguration are deprecated in 1.19. Migrate to use admissionregistration.k8s.io/v1 instead\n_warn = msg {\n  kinds := ["MutatingWebhookConfiguration", "ValidatingWebhookConfiguration"]\n  input.apiVersion == "admissionregistration.k8s.io/v1beta1"\n  input.kind == kinds[_]\n  msg := sprintf("%s/%s: API admissionregistration.k8s.io/v1beta1 is deprecated in Kubernetes 1.22, use admissionregistration.k8s.io/v1 instead.", [input.kind, input.metadata.name])\n}\n',
            '_service-account.rego':
              'package main\n\nwarn[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _warn with input as obj\n}\n\nwarn[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _warn\n}\n\n# Based on https://github.com/kubernetes/kubernetes/issues/47198\n# Warn about the deprecated serviceAccount field in podSpec.\n\n_warn = msg {\n  resources := ["Pod"]\n  input.kind == resources[_]\n  input.spec.serviceAccount\n  msg := sprintf("%s/%s: The serviceAccount field in the podSpec will be deprecated soon, use serviceAccountName instead.", [input.kind, input.metadata.name])\n}\n\n_warn = msg {\n  resources := ["CronJob"]\n  input.kind == resources[_]\n  input.spec.jobTemplate.spec.template.spec.serviceAccount\n  msg := sprintf("%s/%s: The serviceAccount field in the podSpec will be deprecated soon, use serviceAccountName instead.", [input.kind, input.metadata.name])\n}\n\n_warn = msg {\n  resources := ["Deployment", "DaemonSet", "Job", "ReplicaSet", "ReplicationController", "StatefulSet"]\n  input.kind == resources[_]\n  input.spec.template.spec.serviceAccount\n  msg := sprintf("%s/%s: The serviceAccount field in the podSpec will be deprecated soon, use serviceAccountName instead.", [input.kind, input.metadata.name])\n}\n\n',
          },
        },
        version: '0.1.0',
        availableVersions: [{ version: '0.1.0', ts: 1595872800, containsSecurityUpdates: false, prerelease: false }],
        deprecated: false,
        license: 'MIT',
        signed: false,
        containersImages: [{ name: 'deprek8ion', image: 'eu.gcr.io/swade1987/deprek8ion:1.1.17' }],
        hasValuesSchema: false,
        hasChangelog: false,
        ts: 1595872800,
        maintainers: [{ name: 'Steven Wade', email: 'steven@stevenwade.co.uk' }],
        repository: {
          repositoryId: '5adf984e-ce50-4709-98f1-4e10ddb5a8f1',
          name: 'deprek8ion',
          url: 'https://github.com/swade1987/deprek8ion/policies',
          private: false,
          kind: 2,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
      },
      sortedVersions: [{ version: '0.1.0', ts: 1595872800, containsSecurityUpdates: false, prerelease: false }],
    },
    output: {
      methods: [
        {
          label: 'custom',
          title: 'Custom',
          kind: 0,
          props: {
            install: '###Custom install',
          },
        },
      ],
    },
  },
  {
    title: 'OPA policies without custom install',
    input: {
      pkg: {
        packageId: '1c400586-5f13-4d2b-91cc-6eb3813f87fb',
        name: 'deprek8ion',
        normalizedName: 'deprek8ion',
        isOperator: false,
        displayName: 'Deprek8ion',
        description: 'A set of rego policies to monitor Kubernetes APIs deprecations',
        keywords: ['monitoring', 'kubernetes', 'deprecations', 'policies', 'opa'],
        homeUrl: 'https://github.com/swade1987/deprek8ion',
        readme:
          '# Deprek8ion 🕵️‍\n\nA set of rego policies to monitor Kubernetes APIs deprecations.\n\nThe Kubernetes API deprecations can be found using <https://relnotes.k8s.io/?markdown=deprecated>.\n\n## Docker image\n\nThe docker container contains the most recent version of [conftest](https://github.com/instrumenta/conftest) as well as the policies at `/policies`.\n\nImage tags can be found at [https://eu.gcr.io/swade1987/deprek8ion](https://eu.gcr.io/swade1987/deprek8ion)\n\n## Example usage\n\nAn example of how to use the docker container can be seen below:\n\n```sh\ndocker run --rm --name demo -v $(pwd)/demo:/demo eu.gcr.io/swade1987/deprek8ion:1.1.17 /demo/ingress.yaml\n```\n\nOr directly pipe some resources into the container:\n\n```sh\ncat ./demo/ingress.yaml | docker run --rm -i eu.gcr.io/swade1987/deprek8ion:1.1.17 -\n```\n',
        links: [{ url: 'https://github.com/swade1987/deprek8ion/tree/master/policies', name: 'source' }],
        data: {
          policies: {
            '_cert-manager.rego':
              'package main\n\ndeny[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _deny with input as obj\n}\n\ndeny[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _deny\n}\n\nwarn[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _warn with input as obj\n}\n\nwarn[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _warn\n}\n\n# Based on https://github.com/jetstack/cert-manager/releases/tag/v0.11.0\n\n_deny = msg {\n  kinds := ["Certificate", "Issuer", "ClusterIssuer", "CertificateRequest"]\n  input.apiVersion == "certmanager.k8s.io/v1alpha1"\n  input.kind == kinds[_]\n  msg := sprintf("%s/%s: API certmanager.k8s.io/v1alpha1 for %s is obsolete, use cert-manager.io/v1alpha2 instead.", [input.kind, input.metadata.name, input.kind])\n}\n\n_deny = msg {\n  kinds := ["Order", "Challenge"]\n  input.apiVersion == "certmanager.k8s.io/v1alpha1"\n  input.kind == kinds[_]\n  msg := sprintf("%s/%s: API certmanager.k8s.io/v1alpha1 for %s is obsolete, use acme.cert-manager.io/v1alpha2 instead.", [input.kind, input.metadata.name, input.kind])\n}',
            'kubernetes-1.16.rego':
              'package main\n\ndeny[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _deny with input as obj\n}\n\ndeny[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _deny\n}\n\n# Based on https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.16.md\n\n# All resources under apps/v1beta1 and apps/v1beta2 - use apps/v1 instead\n_deny = msg {\n  apis := ["apps/v1beta1", "apps/v1beta2"]\n  input.apiVersion == apis[_]\n  msg := sprintf("%s/%s: API %s has been deprecated, use apps/v1 instead.", [input.kind, input.metadata.name, input.apiVersion])\n}\n\n# daemonsets, deployments, replicasets resources under extensions/v1beta1 - use apps/v1 instead\n_deny = msg {\n  resources := ["DaemonSet", "Deployment", "ReplicaSet"]\n  input.apiVersion == "extensions/v1beta1"\n  input.kind == resources[_]\n  msg := sprintf("%s/%s: API extensions/v1beta1 for %s has been deprecated, use apps/v1 instead.", [input.kind, input.metadata.name, input.kind])\n}\n\n# networkpolicies resources under extensions/v1beta1 - use networking.k8s.io/v1 instead\n_deny = msg {\n  input.apiVersion == "extensions/v1beta1"\n  input.kind == "NetworkPolicy"\n  msg := sprintf("%s/%s: API extensions/v1beta1 for NetworkPolicy has been deprecated, use networking.k8s.io/v1 instead.", [input.kind, input.metadata.name])\n}\n\n# podsecuritypolicies resources under extensions/v1beta1 - use policy/v1beta1 instead\n_deny = msg {\n  input.apiVersion == "extensions/v1beta1"\n  input.kind == "PodSecurityPolicy"\n  msg := sprintf("%s/%s: API extensions/v1beta1 for PodSecurityPolicy has been deprecated, use policy/v1beta1 instead.", [input.kind, input.metadata.name])\n}\n\n# PriorityClass resources will no longer be served from scheduling.k8s.io/v1beta1 and scheduling.k8s.io/v1alpha1 in v1.17.\n_deny = msg {\n  apis := ["scheduling.k8s.io/v1beta1", "scheduling.k8s.io/v1alpha1"]\n  input.apiVersion == apis[_]\n  input.kind == "PriorityClass"\n  msg := sprintf("%s/%s: API %s for PriorityClass has been deprecated, use scheduling.k8s.io/v1 instead.", [input.kind, input.metadata.name, input.apiVersion])\n}',
            'kubernetes-1.17.rego':
              'package main\n\ndeny[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _deny with input as obj\n}\n\ndeny[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _deny\n}\n\n# Based on https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.16.md\n\n# PriorityClass resources will no longer be served from scheduling.k8s.io/v1beta1 and scheduling.k8s.io/v1alpha1 in v1.17.\n_deny = msg {\n  apis := ["scheduling.k8s.io/v1beta1", "scheduling.k8s.io/v1alpha1"]\n  input.apiVersion == apis[_]\n  input.kind == "PriorityClass"\n  msg := sprintf("%s/%s: API %s for PriorityClass has been deprecated, use scheduling.k8s.io/v1 instead.", [input.kind, input.metadata.name, input.apiVersion])\n}',
            'kubernetes-1.18.rego':
              'package main\n\ndeny[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _deny with input as obj\n}\n\ndeny[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _deny\n}\n\n# Based on https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.18.md\n\n# Within Ingress resources spec.ingressClassName replaces the deprecated kubernetes.io/ingress.class annotation.\n_deny = msg {\n  resources := ["Ingress"]\n  input.kind == resources[_]\n  input.metadata.annotations["kubernetes.io/ingress.class"]\n  msg := sprintf("%s/%s: Ingress annotation kubernetes.io/ingress.class has been deprecated in 1.18, use spec.IngressClassName instead.", [input.kind, input.metadata.name])\n}',
            'kubernetes-1.19.rego':
              'package main\n\nwarn[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _warn with input as obj\n}\n\nwarn[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _warn\n}\n\n# Based on https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.16.md\n# Based on https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.19.md\n\n# The apiextensions.k8s.io/v1beta1 version of CustomResourceDefinition is deprecated in 1.19. Migrate to use apiextensions.k8s.io/v1 instead\n_warn = msg {\n  input.apiVersion == "apiextensions.k8s.io/v1beta1"\n  input.kind == "CustomResourceDefinition"\n msg := sprintf("%s/%s: API apiextensions.k8s.io/v1beta1 for CustomResourceDefinition is deprecated in 1.19, use apiextensions.k8s.io/v1 instead.", [input.kind, input.metadata.name])\n}\n\n# The apiregistration.k8s.io/v1beta1 version is deprecated in 1.19. Migrate to use apiregistration.k8s.io/v1 instead\n_warn = msg {\n  input.apiVersion == "apiregistration.k8s.io/v1beta1"\n  msg := sprintf("%s/%s: API apiregistration.k8s.io/v1beta1 is deprecated in Kubernetes 1.19, use apiregistration.k8s.io/v1 instead.", [input.kind, input.metadata.name])\n}\n\n# The authentication.k8s.io/v1beta1 version is deprecated in 1.19. Migrate to use authentication.k8s.io/v1 instead\n_warn = msg {\n  input.apiVersion == "authentication.k8s.io/v1beta1"\n  msg := sprintf("%s/%s: API authentication.k8s.io/v1beta1 is deprecated in Kubernetes 1.19, use authentication.k8s.io/v1 instead.", [input.kind, input.metadata.name])\n}\n\n# The authorization.k8s.io/v1beta1 version is deprecated in 1.19. Migrate to use authorization.k8s.io/v1 instead\n_warn = msg {\n  input.apiVersion == "authorization.k8s.io/v1beta1"\n  msg := sprintf("%s/%s: API authorization.k8s.io/v1beta1 is deprecated in Kubernetes 1.19, use authorization.k8s.io/v1 instead.", [input.kind, input.metadata.name])\n}\n\n# The autoscaling/v2beta1 version is deprecated in 1.19. Migrate to use autoscaling/v2beta2 instead\n_warn = msg {\n  input.apiVersion == "autoscaling/v2beta1"\n  msg := sprintf("%s/%s: API autoscaling/v2beta1 is deprecated in Kubernetes 1.19, use autoscaling/v2beta2 instead.", [input.kind, input.metadata.name])\n}\n\n# The coordination.k8s.io/v1beta1 version is deprecated in 1.19. Migrate to use coordination.k8s.io/v1 instead\n_warn = msg {\n  input.apiVersion == "coordination.k8s.io/v1beta1"\n  msg := sprintf("%s/%s: API coordination.k8s.io/v1beta1 is deprecated in Kubernetes 1.19, use coordination.k8s.io/v1 instead.", [input.kind, input.metadata.name])\n}\n\n# The storage.k8s.io/v1beta1 version is deprecated in 1.19. Migrate to use storage.k8s.io/v1 instead\n_warn = msg {\n  input.apiVersion == "storage.k8s.io/v1beta1"\n  msg := sprintf("%s/%s: API storage.k8s.io/v1beta1 is deprecated in Kubernetes 1.19, use storage.k8s.io/v1 instead.", [input.kind, input.metadata.name])\n}\n',
            'kubernetes-1.20.rego':
              'package main\n\nwarn[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _warn with input as obj\n}\n\nwarn[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _warn\n}\n\n# Based on https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.16.md\n\n# Ingress resources will no longer be served from extensions/v1beta1 in v1.20. Migrate use to the networking.k8s.io/v1beta1 API, available since v1.14.\n_warn = msg {\n  input.apiVersion == "extensions/v1beta1"\n  input.kind == "Ingress"\n  msg := sprintf("%s/%s: API extensions/v1beta1 for Ingress is deprecated from Kubernetes 1.20, use networking.k8s.io/v1beta1 instead.", [input.kind, input.metadata.name])\n}\n\n# All resources will no longer be served from rbac.authorization.k8s.io/v1alpha1 and rbac.authorization.k8s.io/v1beta1 in 1.20. Migrate to use rbac.authorization.k8s.io/v1 instead\n_warn = msg {\n  apis := ["rbac.authorization.k8s.io/v1alpha1", "rbac.authorization.k8s.io/v1beta1"]\n  input.apiVersion == apis[_]\n  msg := sprintf("%s/%s: API %s is deprecated from Kubernetes 1.20, use rbac.authorization.k8s.io/v1 instead.", [input.kind, input.metadata.name, input.apiVersion])\n}\n\n# Ingress resources will no longer be served from extensions/v1beta1 in v1.20. Migrate use to the networking.k8s.io/v1beta1 API, available since v1.14.\n_warn = msg {\n  input.apiVersion == "extensions/v1beta1"\n  input.kind == "Ingress"\n  msg := sprintf("%s/%s: API extensions/v1beta1 for Ingress is deprecated from Kubernetes 1.20, use networking.k8s.io/v1beta1 instead.", [input.kind, input.metadata.name])\n}',
            'kubernetes-1.22.rego':
              'package main\n\nwarn[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _warn with input as obj\n}\n\nwarn[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _warn\n}\n\n# Based on https://github.com/kubernetes/kubernetes/issues/82021\n\n# The admissionregistration.k8s.io/v1beta1 versions of MutatingWebhookConfiguration and ValidatingWebhookConfiguration are deprecated in 1.19. Migrate to use admissionregistration.k8s.io/v1 instead\n_warn = msg {\n  kinds := ["MutatingWebhookConfiguration", "ValidatingWebhookConfiguration"]\n  input.apiVersion == "admissionregistration.k8s.io/v1beta1"\n  input.kind == kinds[_]\n  msg := sprintf("%s/%s: API admissionregistration.k8s.io/v1beta1 is deprecated in Kubernetes 1.22, use admissionregistration.k8s.io/v1 instead.", [input.kind, input.metadata.name])\n}\n',
            '_service-account.rego':
              'package main\n\nwarn[msg] {\n  input.apiVersion == "v1"\n  input.kind == "List"\n  obj := input.items[_]\n  msg := _warn with input as obj\n}\n\nwarn[msg] {\n  input.apiVersion != "v1"\n  input.kind != "List"\n  msg := _warn\n}\n\n# Based on https://github.com/kubernetes/kubernetes/issues/47198\n# Warn about the deprecated serviceAccount field in podSpec.\n\n_warn = msg {\n  resources := ["Pod"]\n  input.kind == resources[_]\n  input.spec.serviceAccount\n  msg := sprintf("%s/%s: The serviceAccount field in the podSpec will be deprecated soon, use serviceAccountName instead.", [input.kind, input.metadata.name])\n}\n\n_warn = msg {\n  resources := ["CronJob"]\n  input.kind == resources[_]\n  input.spec.jobTemplate.spec.template.spec.serviceAccount\n  msg := sprintf("%s/%s: The serviceAccount field in the podSpec will be deprecated soon, use serviceAccountName instead.", [input.kind, input.metadata.name])\n}\n\n_warn = msg {\n  resources := ["Deployment", "DaemonSet", "Job", "ReplicaSet", "ReplicationController", "StatefulSet"]\n  input.kind == resources[_]\n  input.spec.template.spec.serviceAccount\n  msg := sprintf("%s/%s: The serviceAccount field in the podSpec will be deprecated soon, use serviceAccountName instead.", [input.kind, input.metadata.name])\n}\n\n',
          },
        },
        version: '0.1.0',
        availableVersions: [{ version: '0.1.0', ts: 1595872800, containsSecurityUpdates: false, prerelease: false }],
        deprecated: false,
        license: 'MIT',
        signed: false,
        containersImages: [{ name: 'deprek8ion', image: 'eu.gcr.io/swade1987/deprek8ion:1.1.17' }],
        hasValuesSchema: false,
        hasChangelog: false,
        ts: 1595872800,
        maintainers: [{ name: 'Steven Wade', email: 'steven@stevenwade.co.uk' }],
        repository: {
          repositoryId: '5adf984e-ce50-4709-98f1-4e10ddb5a8f1',
          name: 'deprek8ion',
          url: 'https://github.com/swade1987/deprek8ion/policies',
          private: false,
          kind: 2,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
      },
      sortedVersions: [{ version: '0.1.0', ts: 1595872800, containsSecurityUpdates: false, prerelease: false }],
    },
    output: {
      methods: [],
    },
  },
  {
    title: 'Helm package - chart API version 2',
    input: {
      pkg: {
        packageId: 'id',
        name: 'artifact-hub',
        normalizedName: 'artifact-hub',
        displayName: 'artifact-hub',
        description: 'desc',
        logoImageId: 'img',
        deprecated: false,
        signed: false,
        ts: 1574121600,
        isOperator: false,
        version: '0.11.0',
        availableVersions: [
          { version: '0.6.0', ts: 1600841229, containsSecurityUpdates: false, prerelease: false },
          { version: '0.5.0', ts: 1599125273, containsSecurityUpdates: false, prerelease: false },
        ],
        appVersion: '0.11.0',
        contentUrl: 'https://artifacthub.github.io/hub/chart/artifact-hub-0.11.0.tgz',
        repository: {
          repositoryId: 'd2b93c16-4f70-43e7-b50c-0dccb4c82756',
          name: 'artifact-hub',
          url: 'https://artifacthub.github.io/hub/chart/',
          private: false,
          kind: 0,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
        data: { apiVersion: 'v2' },
      },
      sortedVersions: [{ version: '0.11.0', ts: 1607006504, containsSecurityUpdates: false, prerelease: false }],
    },
    output: {
      methods: [
        {
          label: 'v3',
          title: 'Helm v3',
          kind: 1,
          props: {
            name: 'artifact-hub',
            version: '0.11.0',
            repository: {
              repositoryId: 'd2b93c16-4f70-43e7-b50c-0dccb4c82756',
              name: 'artifact-hub',
              url: 'https://artifacthub.github.io/hub/chart/',
              private: false,
              kind: 0,
              verifiedPublisher: false,
              official: false,
              userAlias: 'user',
            },
            contentUrl: 'https://artifacthub.github.io/hub/chart/artifact-hub-0.11.0.tgz',
          },
        },
      ],
    },
  },
  {
    title: 'Helm package - chart API version 1',
    input: {
      pkg: {
        packageId: 'id',
        name: 'artifact-hub',
        normalizedName: 'artifact-hub',
        displayName: 'artifact-hub',
        description: 'desc',
        logoImageId: 'img',
        deprecated: false,
        signed: false,
        ts: 1574121600,
        isOperator: false,
        version: '0.11.0',
        availableVersions: [
          { version: '0.6.0', ts: 1600841229, containsSecurityUpdates: false, prerelease: false },
          { version: '0.5.0', ts: 1599125273, containsSecurityUpdates: false, prerelease: false },
        ],
        appVersion: '0.11.0',
        contentUrl: 'https://artifacthub.github.io/hub/chart/artifact-hub-0.11.0.tgz',
        repository: {
          repositoryId: 'd2b93c16-4f70-43e7-b50c-0dccb4c82756',
          name: 'artifact-hub',
          url: 'https://artifacthub.github.io/hub/chart/',
          private: false,
          kind: 0,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
        data: { apiVersion: 'v1' },
      },
      sortedVersions: [{ version: '0.11.0', ts: 1607006504, containsSecurityUpdates: false, prerelease: false }],
    },
    output: {
      methods: [
        {
          label: 'v3',
          title: 'Helm v3',
          kind: 1,
          props: {
            name: 'artifact-hub',
            version: '0.11.0',
            repository: {
              repositoryId: 'd2b93c16-4f70-43e7-b50c-0dccb4c82756',
              name: 'artifact-hub',
              url: 'https://artifacthub.github.io/hub/chart/',
              private: false,
              kind: 0,
              verifiedPublisher: false,
              official: false,
              userAlias: 'user',
            },
            contentUrl: 'https://artifacthub.github.io/hub/chart/artifact-hub-0.11.0.tgz',
          },
        },
        {
          label: 'v2',
          title: 'Helm v2',
          kind: 1,
          props: {
            name: 'artifact-hub',
            version: '0.11.0',
            repository: {
              repositoryId: 'd2b93c16-4f70-43e7-b50c-0dccb4c82756',
              name: 'artifact-hub',
              url: 'https://artifacthub.github.io/hub/chart/',
              private: false,
              kind: 0,
              verifiedPublisher: false,
              official: false,
              userAlias: 'user',
            },
            contentUrl: 'https://artifacthub.github.io/hub/chart/artifact-hub-0.11.0.tgz',
          },
        },
      ],
    },
  },
  {
    title: 'Helm package - library type',
    input: {
      pkg: {
        packageId: 'id',
        name: 'artifact-hub',
        normalizedName: 'artifact-hub',
        displayName: 'artifact-hub',
        description: 'desc',
        logoImageId: 'img',
        deprecated: false,
        signed: false,
        ts: 1574121600,
        isOperator: false,
        version: '0.11.0',
        availableVersions: [
          { version: '0.6.0', ts: 1600841229, containsSecurityUpdates: false, prerelease: false },
          { version: '0.5.0', ts: 1599125273, containsSecurityUpdates: false, prerelease: false },
        ],
        appVersion: '0.11.0',
        contentUrl: 'https://artifacthub.github.io/hub/chart/artifact-hub-0.11.0.tgz',
        repository: {
          repositoryId: 'd2b93c16-4f70-43e7-b50c-0dccb4c82756',
          name: 'artifact-hub',
          url: 'https://artifacthub.github.io/hub/chart/',
          private: false,
          kind: 0,
          verifiedPublisher: false,
          official: false,
          userAlias: 'user',
        },
        data: { apiVersion: 'v2', type: HelmChartType.Library },
      },
      sortedVersions: [{ version: '0.11.0', ts: 1607006504, containsSecurityUpdates: false, prerelease: false }],
    },
    output: { methods: [], errorMessage: 'A library chart is not installable' },
  },
];

describe('getInstallMethods', () => {
  for (let i = 0; i < tests.length; i++) {
    it(tests[i].title, () => {
      const actual = getInstallMethods(tests[i].input);
      expect(actual).toEqual(tests[i].output);
    });
  }
});
