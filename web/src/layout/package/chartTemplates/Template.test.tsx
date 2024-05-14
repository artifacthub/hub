import { render, screen } from '@testing-library/react';

import Template from './Template';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('react-markdown', () => (props: any) => {
  return <>{props.children}</>;
});
jest.mock('remark-gfm', () => () => <div />);

const setIsChangingTemplateMock = jest.fn();

const defaultProps = {
  template: {
    name: 'hub_ingress.yaml',
    fileName: 'hub_ingress',
    resourceKinds: ['Ingress'],
    data: '{{- if .Values.hub.ingress.enabled -}}\napiVersion: networking.k8s.io/v1beta1\nkind: Ingress\nmetadata:\n  name: {{ include "chart.resourceNamePrefix" . }}hub\n  labels:\n    app.kubernetes.io/component: hub\n    {{- include "chart.labels" . | nindent 4 }}\n  {{- with .Values.hub.ingress.annotations }}\n  annotations:\n    {{- toYaml . | nindent 4 }}\n  {{- end }}\nspec:\n  backend:\n    serviceName: {{ include "chart.resourceNamePrefix" . }}hub\n    servicePort: {{ .Values.hub.service.port }}\n  {{- with .Values.hub.ingress.rules }}\n  rules:\n    {{- toYaml . | nindent 4 }}\n  {{- end }}\n  {{- with .Values.hub.ingress.tls }}\n  tls:\n    {{- toYaml . | nindent 4 }}\n  {{- end }}\n{{- end }}\n',
    type: 0,
  },
  setIsChangingTemplate: setIsChangingTemplateMock,
  onDefinedTemplateClick: jest.fn(),
  templatesInHelpers: {},
  values: {
    Values: {
      fullnameOverride: '',
      hub: {
        analytics: {
          gaTrackingID: '',
        },
        deploy: {
          image: {
            repository: 'artifacthub/hub',
          },
          readinessGates: [],
          replicaCount: 1,
          resources: {},
        },
        email: {
          from: '',
          fromName: '',
          replyTo: '',
          smtp: {
            host: '',
            password: '',
            port: 587,
            username: '',
          },
        },
        ingress: {
          annotations: {
            'kubernetes.io/ingress.class': 'nginx',
          },
          enabled: true,
          rules: [],
          tls: [],
        },
        server: {
          allowPrivateRepositories: false,
          allowUserSignUp: true,
          baseURL: '',
          basicAuth: {
            enabled: false,
            password: 'changeme',
            username: 'hub',
          },
          cacheDir: '',
          configDir: '/home/hub/.cfg',
          cookie: {
            hashKey: 'default-unsafe-key',
            secure: false,
          },
          csrf: {
            authKey: 'default-unsafe-key',
            secure: false,
          },
          motd: '',
          motdSeverity: 'info',
          oauth: {
            github: {
              clientID: '',
              clientSecret: '',
              enabled: false,
              redirectURL: '',
              scopes: ['read:user', 'user:email'],
            },
            google: {
              clientID: '',
              clientSecret: '',
              enabled: false,
              redirectURL: '',
              scopes: [
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile',
              ],
            },
            oidc: {
              clientID: '',
              clientSecret: '',
              enabled: false,
              issuerURL: '',
              redirectURL: '',
              scopes: ['openid', 'profile', 'email'],
            },
          },
          shutdownTimeout: '10s',
          xffIndex: 0,
        },
        service: {
          port: 80,
          type: 'NodePort',
        },
      },
    },
  },
};

describe('Template', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<Template {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<Template {...defaultProps} />);

      const betweenBrackets = screen.getAllByTestId('betweenBracketsContent');
      expect(betweenBrackets).toHaveLength(15);
      expect(betweenBrackets[0]).toHaveTextContent('{{- if DEFAULT:true.Values.hub.ingress.enabled -}}');
      expect(betweenBrackets[1]).toHaveTextContent('{{ include "chart.resourceNamePrefix" . }}');
      expect(betweenBrackets[2]).toHaveTextContent(
        '{{- include "chart.labels" . | # nindent function [iconLink](https://helm.sh/docs/chart_template_guide/function_list/#nindent) The **nindent** function is the same as the indent function, but prepends a new line to the beginning of the string.nindent 4 }}'
      );
      expect(betweenBrackets[3]).toHaveTextContent(
        '{{- with DEFAULT:{ "kubernetes.io/ingress.class": "nginx" }.Values.hub.ingress.annotations }}'
      );
      expect(betweenBrackets[4]).toHaveTextContent(
        '{{- toYaml . | # nindent function [iconLink](https://helm.sh/docs/chart_template_guide/function_list/#nindent) The **nindent** function is the same as the indent function, but prepends a new line to the beginning of the string.nindent 4 }}'
      );
      expect(betweenBrackets[5]).toHaveTextContent('{{- end }}');
      expect(betweenBrackets[6]).toHaveTextContent('{{ include "chart.resourceNamePrefix" . }}');
      expect(betweenBrackets[7]).toHaveTextContent('{{ DEFAULT:80.Values.hub.service.port }}');
      expect(betweenBrackets[8]).toHaveTextContent('{{- with DEFAULT:[].Values.hub.ingress.rules }}');
      expect(betweenBrackets[9]).toHaveTextContent(
        '{{- toYaml . | # nindent function [iconLink](https://helm.sh/docs/chart_template_guide/function_list/#nindent) The **nindent** function is the same as the indent function, but prepends a new line to the beginning of the string.nindent 4 }}'
      );
      expect(betweenBrackets[10]).toHaveTextContent('{{- end }}');
      expect(betweenBrackets[11]).toHaveTextContent('{{- with DEFAULT:[].Values.hub.ingress.tls }}');
      expect(betweenBrackets[12]).toHaveTextContent(
        '{{- toYaml . | # nindent function [iconLink](https://helm.sh/docs/chart_template_guide/function_list/#nindent) The **nindent** function is the same as the indent function, but prepends a new line to the beginning of the string.nindent 4 }}'
      );
      expect(betweenBrackets[13]).toHaveTextContent('{{- end }}');
      expect(betweenBrackets[14]).toHaveTextContent('{{- end }}');
    });

    it('renders component', () => {
      render(
        <Template
          {...defaultProps}
          template={{
            name: 'hub_deployment.yaml',
            fileName: 'hub_deployment',
            resourceKinds: ['Deployment'],
            data: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: {{ include "chart.resourceNamePrefix" . }}hub\n  labels:\n    app.kubernetes.io/component: hub\n    {{- include "chart.labels" . | nindent 4 }}\nspec:\n  replicas: {{ .Values.hub.deploy.replicaCount }}\n  selector:\n    matchLabels:\n      app.kubernetes.io/component: hub\n      {{- include "chart.selectorLabels" . | nindent 6 }}\n  template:\n    metadata:\n      annotations:\n        prometheus.io/scrape: "true"\n        prometheus.io/path: "/metrics"\n        prometheus.io/port: "8001"\n      labels:\n        app.kubernetes.io/component: hub\n        {{- include "chart.selectorLabels" . | nindent 8 }}\n    spec:\n    {{- with .Values.hub.deploy.readinessGates }}\n      readinessGates:\n        {{- toYaml . | nindent 8 }}\n    {{- end }}\n    {{- with .Values.imagePullSecrets }}\n      imagePullSecrets:\n        {{- toYaml . | nindent 8 }}\n    {{- end }}\n      {{- if .Release.IsInstall }}\n      serviceAccountName: {{ include "chart.resourceNamePrefix" . }}hub\n      {{- end }}\n      initContainers:\n      - name: check-db-ready\n        image: {{ .Values.postgresql.image.repository }}:{{ .Values.postgresql.image.tag }}\n        imagePullPolicy: {{ .Values.pullPolicy }}\n        env:\n          - name: PGHOST\n            value: {{ default (printf "%s-postgresql.%s" .Release.Name .Release.Namespace) .Values.db.host }}\n          - name: PGPORT\n            value: "{{ .Values.db.port }}"\n        command: [\'sh\', \'-c\', \'until pg_isready; do echo waiting for database; sleep 2; done;\']\n      {{- if .Release.IsInstall }}\n      - name: check-db-migrator-run\n        image: "bitnami/kubectl:{{ template "chart.KubernetesVersion" . }}"\n        imagePullPolicy: IfNotPresent\n        command: [\'kubectl\', \'wait\', \'--namespace={{ .Release.Namespace }}\', \'--for=condition=complete\', \'job/{{ include "chart.resourceNamePrefix" . }}db-migrator-install\', \'--timeout=60s\']\n      {{- end }}\n      containers:\n        - name: hub\n          image: {{ .Values.hub.deploy.image.repository }}:{{ .Values.imageTag | default (printf "v%s" .Chart.AppVersion) }}\n          imagePullPolicy: {{ .Values.pullPolicy }}\n          {{- if .Values.hub.server.cacheDir }}\n          env:\n            - name: XDG_CACHE_HOME\n              value: {{ .Values.hub.server.cacheDir | quote }}\n          {{- end }}\n          volumeMounts:\n          - name: hub-config\n            mountPath: {{ .Values.hub.server.configDir | quote }}\n            readOnly: true\n          {{- if .Values.hub.server.cacheDir }}\n          - name: cache-dir\n            mountPath: {{ .Values.hub.server.cacheDir | quote }}\n          {{- end }}\n          ports:\n            - name: http\n              containerPort: 8000\n              protocol: TCP\n          resources:\n            {{- toYaml .Values.hub.deploy.resources | nindent 12 }}\n      volumes:\n      - name: hub-config\n        secret:\n          secretName: {{ include "chart.resourceNamePrefix" . }}hub-config\n      {{- if .Values.hub.server.cacheDir }}\n      - name: cache-dir\n        emptyDir: {}\n      {{ $variable }}\n      {{- end }}\n',
            type: 0,
          }}
        />
      );

      // Functions
      const functionsSample = screen.getAllByText('nindent');
      expect(functionsSample).toHaveLength(6);
      expect(functionsSample[1]).toHaveClass('tmplFunction');

      // Built-in
      const builtInSample = screen.getAllByText('.Release.Namespace');
      expect(builtInSample).toHaveLength(2);
      expect(builtInSample[1]).toHaveClass('tmplBuiltIn');

      // Values
      const valuesSample = screen.getAllByText('.Values.pullPolicy');
      expect(valuesSample).toHaveLength(2);
      expect(valuesSample[0]).toHaveClass('tmplValue');

      // Flow Control
      const flowControlSample = screen.getAllByText('include');
      expect(flowControlSample).toHaveLength(7);
      expect(flowControlSample[0]).toHaveClass('tmplFlowControl');

      // Variable
      const variableSample = screen.getAllByText('$variable');
      expect(variableSample).toHaveLength(1);
      expect(variableSample[0]).toHaveClass('tmplVariable');
    });

    it('calls setIsChangingTemplateMock when a new template is rendered', () => {
      const { rerender } = render(<Template {...defaultProps} />);

      rerender(
        <Template
          {...defaultProps}
          template={{
            name: 'hub_deployment.yaml',
            fileName: 'hub_deployment',
            resourceKinds: ['Deployment'],
            data: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: {{ include "chart.resourceNamePrefix" . }}hub\n  labels:\n    app.kubernetes.io/component: hub\n    {{- include "chart.labels" . | nindent 4 }}\nspec:\n  replicas: {{ .Values.hub.deploy.replicaCount }}\n  selector:\n    matchLabels:\n      app.kubernetes.io/component: hub\n      {{- include "chart.selectorLabels" . | nindent 6 }}\n  template:\n    metadata:\n      annotations:\n        prometheus.io/scrape: "true"\n        prometheus.io/path: "/metrics"\n        prometheus.io/port: "8001"\n      labels:\n        app.kubernetes.io/component: hub\n        {{- include "chart.selectorLabels" . | nindent 8 }}\n    spec:\n    {{- with .Values.hub.deploy.readinessGates }}\n      readinessGates:\n        {{- toYaml . | nindent 8 }}\n    {{- end }}\n    {{- with .Values.imagePullSecrets }}\n      imagePullSecrets:\n        {{- toYaml . | nindent 8 }}\n    {{- end }}\n      {{- if .Release.IsInstall }}\n      serviceAccountName: {{ include "chart.resourceNamePrefix" . }}hub\n      {{- end }}\n      initContainers:\n      - name: check-db-ready\n        image: {{ .Values.postgresql.image.repository }}:{{ .Values.postgresql.image.tag }}\n        imagePullPolicy: {{ .Values.pullPolicy }}\n        env:\n          - name: PGHOST\n            value: {{ default (printf "%s-postgresql.%s" .Release.Name .Release.Namespace) .Values.db.host }}\n          - name: PGPORT\n            value: "{{ .Values.db.port }}"\n        command: [\'sh\', \'-c\', \'until pg_isready; do echo waiting for database; sleep 2; done;\']\n      {{- if .Release.IsInstall }}\n      - name: check-db-migrator-run\n        image: "bitnami/kubectl:{{ template "chart.KubernetesVersion" . }}"\n        imagePullPolicy: IfNotPresent\n        command: [\'kubectl\', \'wait\', \'--namespace={{ .Release.Namespace }}\', \'--for=condition=complete\', \'job/{{ include "chart.resourceNamePrefix" . }}db-migrator-install\', \'--timeout=60s\']\n      {{- end }}\n      containers:\n        - name: hub\n          image: {{ .Values.hub.deploy.image.repository }}:{{ .Values.imageTag | default (printf "v%s" .Chart.AppVersion) }}\n          imagePullPolicy: {{ .Values.pullPolicy }}\n          {{- if .Values.hub.server.cacheDir }}\n          env:\n            - name: XDG_CACHE_HOME\n              value: {{ .Values.hub.server.cacheDir | quote }}\n          {{- end }}\n          volumeMounts:\n          - name: hub-config\n            mountPath: {{ .Values.hub.server.configDir | quote }}\n            readOnly: true\n          {{- if .Values.hub.server.cacheDir }}\n          - name: cache-dir\n            mountPath: {{ .Values.hub.server.cacheDir | quote }}\n          {{- end }}\n          ports:\n            - name: http\n              containerPort: 8000\n              protocol: TCP\n          resources:\n            {{- toYaml .Values.hub.deploy.resources | nindent 12 }}\n      volumes:\n      - name: hub-config\n        secret:\n          secretName: {{ include "chart.resourceNamePrefix" . }}hub-config\n      {{- if .Values.hub.server.cacheDir }}\n      - name: cache-dir\n        emptyDir: {}\n      {{ $variable }}\n      {{- end }}\n',
            type: 0,
          }}
        />
      );

      expect(setIsChangingTemplateMock).toHaveBeenCalledTimes(2);
      expect(setIsChangingTemplateMock).toHaveBeenCalledWith(false);
    });
  });
});
