import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ChartTmplTypeFile, CompareChartTemplateStatus } from '../../../types';
import CompareTemplatesList from './CompareTemplatesList';

const onTemplateChangeMock = jest.fn();

const defaultProps = {
  templates: [
    {
      name: 'configmap-authscripts.yaml',
      fileName: 'configmap-authscripts',
      resourceKinds: ['ConfigMap'],
      data: '{{- if .Values.authScripts.enabled }}\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n  name: argocd-image-updater-authscripts\ndata:\n  {{- toYaml .Values.authScripts.scripts | nindent 2}}\n{{- end }}\n',
      type: ChartTmplTypeFile.Template,
      compareData: '',
      status: CompareChartTemplateStatus.Added,
    },
    {
      name: 'configmap-sshconfig.yaml',
      fileName: 'configmap-sshconfig',
      resourceKinds: ['ConfigMap'],
      data: 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n  name: argocd-image-updater-ssh-config\ndata:\n  {{- with .Values.config.sshConfig }}\n  {{- toYaml . | nindent 2 }}\n  {{- end }}\n',
      type: ChartTmplTypeFile.Template,
      compareData: '',
      status: CompareChartTemplateStatus.Added,
    },
    {
      name: 'configmap.yaml',
      fileName: 'configmap',
      resourceKinds: ['ConfigMap'],
      data: '---\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n  name: argocd-image-updater-config\ndata:\n  {{- with .Values.config.applicationsAPIKind }}\n  applications_api: {{ . }}\n  {{- end }}\n  argocd.grpc_web: {{ .Values.config.argocd.grpcWeb | quote }}\n  {{- with .Values.config.argocd.serverAddress }}\n  argocd.server_addr: {{ . }}\n  {{- end }}\n  argocd.insecure: {{ .Values.config.argocd.insecure | quote }}\n  argocd.plaintext: {{ .Values.config.argocd.plaintext | quote }}\n  {{- with .Values.config.logLevel }}\n  log.level: {{ . }}\n  {{- end }}\n  {{- with .Values.config.gitCommitUser }}\n  git.user: {{ . }}\n  {{- end }}\n  {{- with .Values.config.gitCommitMail }}\n  git.email: {{ . }}\n  {{- end }}\n  {{- with .Values.config.gitCommitTemplate }}\n  git.commit-message-template: |\n    {{- nindent 4 . }}\n  {{- end }}\n  kube.events: {{ .Values.config.disableKubeEvents | quote }}\n  registries.conf: |\n    {{- with .Values.config.registries }}\n      registries:\n        {{- toYaml . | nindent 6 }}\n    {{- end }}\n',
      type: ChartTmplTypeFile.Template,
      compareData:
        '---\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n  name: argocd-image-updater-config\ndata:\n  registries.conf: |\n    {{- with .Values.config.registries }}\n      registries:\n        {{- toYaml . | nindent 6 }}\n    {{- end }}\n',
      status: CompareChartTemplateStatus.Modified,
    },
    {
      name: 'deployment.yaml',
      fileName: 'deployment',
      resourceKinds: ['Deployment'],
      data: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: {{ include "argocd-image-updater.fullname" . }}\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\nspec:\n  replicas: {{ .Values.replicaCount }}\n  selector:\n    matchLabels:\n      {{- include "argocd-image-updater.selectorLabels" . | nindent 6 }}\n  strategy:\n    {{- .Values.updateStrategy | toYaml | nindent 4 }}\n  template:\n    metadata:\n      annotations:\n      {{- with .Values.podAnnotations }}\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}\n      labels:\n        {{- include "argocd-image-updater.selectorLabels" . | nindent 8 }}\n    spec:\n      {{- with .Values.imagePullSecrets }}\n      imagePullSecrets:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n      serviceAccountName: {{ include "argocd-image-updater.serviceAccountName" . }}\n      securityContext:\n        {{- toYaml .Values.podSecurityContext | nindent 8 }}\n      containers:\n        - name: {{ .Chart.Name }}\n          command:\n            - /usr/local/bin/argocd-image-updater\n            - run\n            {{- with .Values.extraArgs }}\n              {{- toYaml . | nindent 12 }}\n            {{- end }}\n          env:\n          - name: APPLICATIONS_API\n            valueFrom:\n              configMapKeyRef:\n                key: applications_api\n                name: argocd-image-updater-config\n                optional: true\n          - name: ARGOCD_GRPC_WEB\n            valueFrom:\n              configMapKeyRef:\n                key: argocd.grpc_web\n                name: argocd-image-updater-config\n                optional: true\n          - name: ARGOCD_SERVER\n            valueFrom:\n              configMapKeyRef:\n                key: argocd.server_addr\n                name: argocd-image-updater-config\n                optional: true\n          - name: ARGOCD_INSECURE\n            valueFrom:\n              configMapKeyRef:\n                key: argocd.insecure\n                name: argocd-image-updater-config\n                optional: true\n          - name: ARGOCD_PLAINTEXT\n            valueFrom:\n              configMapKeyRef:\n                key: argocd.plaintext\n                name: argocd-image-updater-config\n                optional: true\n          - name: ARGOCD_TOKEN\n            valueFrom:\n              secretKeyRef:\n                key: argocd.token\n                name: argocd-image-updater-secret\n                optional: true\n          - name: IMAGE_UPDATER_LOGLEVEL\n            valueFrom:\n              configMapKeyRef:\n                key: log.level\n                name: argocd-image-updater-config\n                optional: true\n          - name: GIT_COMMIT_USER\n            valueFrom:\n              configMapKeyRef:\n                key: git.user\n                name: argocd-image-updater-config\n                optional: true\n          - name: GIT_COMMIT_EMAIL\n            valueFrom:\n              configMapKeyRef:\n                key: git.email\n                name: argocd-image-updater-config\n                optional: true\n          - name: IMAGE_UPDATER_KUBE_EVENTS\n            valueFrom:\n              configMapKeyRef:\n                key: kube.events\n                name: argocd-image-updater-config\n                optional: true\n          {{- with .Values.extraEnv }}\n            {{- toYaml . | nindent 10 }}\n          {{- end }}\n          securityContext:\n            {{- toYaml .Values.securityContext | nindent 12 }}\n          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"\n          imagePullPolicy: {{ .Values.image.pullPolicy }}\n          ports:\n            - containerPort: 8080\n            {{ if .Values.metrics.enabled }}\n            - name: metrics\n              containerPort: 8081\n              protocol: TCP\n            {{- end }}\n          readinessProbe:\n            httpGet:\n              path: /healthz\n              port: 8080\n            initialDelaySeconds: 3\n            periodSeconds: 30\n          livenessProbe:\n            httpGet:\n              path: /healthz\n              port: 8080\n            initialDelaySeconds: 3\n            periodSeconds: 30\n          resources:\n            {{- toYaml .Values.resources | nindent 12 }}\n          volumeMounts:\n          - mountPath: /app/config\n            name: image-updater-conf\n          - mountPath: /tmp\n            name: tmp-dir\n          - mountPath: /app/config/ssh\n            name: ssh-known-hosts\n          - mountPath: /app/.ssh\n            name: ssh-config\n          {{- if .Values.authScripts.enabled }}\n          - mountPath: /scripts\n            name: authscripts\n          {{- end }}\n      volumes:\n      - configMap:\n          items:\n          - key: registries.conf\n            path: registries.conf\n          - key: git.commit-message-template\n            path: commit.template\n          name: argocd-image-updater-config\n          optional: true\n        name: image-updater-conf\n      {{- if .Values.authScripts.enabled }}\n      - configMap:\n          defaultMode: 0777\n          name: argocd-image-updater-authscripts\n        name: authscripts\n      {{- end }}\n      - emptyDir: {}\n        name: tmp-dir\n      - configMap:\n          name: argocd-ssh-known-hosts-cm\n          optional: true\n        name: ssh-known-hosts\n      - configMap:\n          name: argocd-image-updater-ssh-config\n          optional: true\n        name: ssh-config\n      {{- with .Values.nodeSelector }}\n      nodeSelector:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n      {{- with .Values.affinity }}\n      affinity:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n      {{- with .Values.tolerations }}\n      tolerations:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n',
      type: ChartTmplTypeFile.Template,
      compareData:
        'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: {{ include "argocd-image-updater.fullname" . }}\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\nspec:\n  replicas: {{ .Values.replicaCount }}\n  selector:\n    matchLabels:\n      {{- include "argocd-image-updater.selectorLabels" . | nindent 6 }}\n  template:\n    metadata:\n      annotations:\n      {{- with .Values.podAnnotations }}\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}\n      labels:\n        {{- include "argocd-image-updater.selectorLabels" . | nindent 8 }}\n    spec:\n      {{- with .Values.imagePullSecrets }}\n      imagePullSecrets:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n      serviceAccountName: {{ include "argocd-image-updater.serviceAccountName" . }}\n      securityContext:\n        {{- toYaml .Values.podSecurityContext | nindent 8 }}\n      containers:\n        - name: {{ .Chart.Name }}\n          command: \n            - /usr/local/bin/argocd-image-updater\n            - run\n            {{- with .Values.extraArgs }}\n              {{- toYaml . | nindent 12 }}\n            {{- end }}\n          env:\n          - name: ARGOCD_GRPC_WEB\n            value: {{ .Values.config.argocd.grpcWeb | quote }}\n          - name: ARGOCD_SERVER\n            value: {{ .Values.config.argocd.serverAddress }}\n          - name: ARGOCD_INSECURE\n            value: {{ .Values.config.argocd.insecure | quote }}\n          - name: ARGOCD_PLAINTEXT\n            value: {{ .Values.config.argocd.plaintext | quote }}\n          - name: ARGOCD_TOKEN\n            valueFrom:\n              secretKeyRef:\n                key: argocd.token\n                name: argocd-image-updater-secret\n                optional: true\n          - name: IMAGE_UPDATER_LOGLEVEL\n            value: {{ .Values.config.logLevel }}\n          securityContext:\n            {{- toYaml .Values.securityContext | nindent 12 }}\n          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"\n          imagePullPolicy: {{ .Values.image.pullPolicy }}\n          ports:\n            - containerPort: 8080\n          readinessProbe:\n            httpGet:\n              path: /healthz\n              port: 8080\n            initialDelaySeconds: 3\n            periodSeconds: 30\n          livenessProbe:\n            httpGet:\n              path: /healthz\n              port: 8080\n            initialDelaySeconds: 3\n            periodSeconds: 30\n          resources:\n            {{- toYaml .Values.resources | nindent 12 }}\n          volumeMounts:\n          - mountPath: /app/config\n            name: registries-conf\n      volumes:\n      - configMap:\n          items:\n          - key: registries.conf\n            path: registries.conf\n          name: argocd-image-updater-config\n        name: registries-conf\n      {{- with .Values.nodeSelector }}\n      nodeSelector:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n      {{- with .Values.affinity }}\n      affinity:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n      {{- with .Values.tolerations }}\n      tolerations:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n',
      status: CompareChartTemplateStatus.Modified,
    },
    {
      name: 'metrics-service.yaml',
      fileName: 'metrics-service',
      resourceKinds: ['Service'],
      data: '{{- if .Values.metrics.enabled }}\napiVersion: v1\nkind: Service\nmetadata:\n  {{- if .Values.metrics.service.annotations }}\n  annotations:\n    {{- range $key, $value := .Values.metrics.service.annotations }}\n    {{ $key }}: {{ $value | quote }}\n    {{- end }}\n  {{- end }}\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n    {{- with .Values.metrics.service.labels }}\n      {{- toYaml . | nindent 4 }}\n    {{- end }}\n  name: {{ include "argocd-image-updater.fullname" . }}-metrics\nspec:\n  ports:\n    - name: metrics\n      protocol: TCP\n      port: {{ .Values.metrics.service.servicePort }}\n      targetPort: metrics\n  selector:\n    {{- include "argocd-image-updater.selectorLabels" . | nindent 4 }}\n{{- end }}\n',
      type: ChartTmplTypeFile.Template,
      compareData: '',
      status: CompareChartTemplateStatus.Added,
    },
    {
      name: 'secret.yaml',
      fileName: 'secret',
      resourceKinds: ['Secret'],
      data: '{{- if .Values.config.argocd.token }}\napiVersion: v1\nkind: Secret\nmetadata:\n  name: argocd-image-updater-secret\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\ntype: Opaque\ndata: \n  argocd.token: {{ .Values.config.argocd.token | b64enc }}\n{{- end }}\n',
      type: ChartTmplTypeFile.Template,
      compareData: '',
      status: CompareChartTemplateStatus.Added,
    },
    {
      name: 'servicemonitor.yaml',
      fileName: 'servicemonitor',
      resourceKinds: ['ServiceMonitor'],
      data: '{{- if and .Values.metrics.enabled .Values.metrics.serviceMonitor.enabled }}\napiVersion: monitoring.coreos.com/v1\nkind: ServiceMonitor\nmetadata:\n  name: {{ include "argocd-image-updater.fullname" . }}-metrics\n  {{- with .Values.metrics.serviceMonitor.namespace }}\n  namespace: {{ . }}\n  {{- end }}\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n    {{- with .Values.metrics.serviceMonitor.selector }}\n      {{- toYaml . | nindent 4 }}\n    {{- end }}\n    {{- with .Values.metrics.serviceMonitor.additionalLabels }}\n      {{- toYaml . | nindent 4 }}\n    {{- end }}\nspec:\n  endpoints:\n    - port: metrics\n      {{- with .Values.metrics.serviceMonitor.interval }}\n      interval: {{ . }}\n      {{- end }}\n      path: /metrics\n      {{- with .Values.metrics.serviceMonitor.relabelings }}\n      relabelings:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n      {{- with .Values.metrics.serviceMonitor.metricRelabelings }}\n      metricRelabelings:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n  namespaceSelector:\n    matchNames:\n      - {{ .Release.Namespace }}\n  selector:\n    matchLabels:\n      {{- include "argocd-image-updater.selectorLabels" . | nindent 6 }}\n{{- end }}\n',
      type: ChartTmplTypeFile.Template,
      compareData: '',
      status: CompareChartTemplateStatus.Added,
    },
    {
      name: 'sample.yaml',
      fileName: 'sample',
      resourceKinds: ['Sample'],
      data: '',
      type: ChartTmplTypeFile.Template,
      compareData:
        '{{- if and .Values.metrics.enabled .Values.metrics.serviceMonitor.enabled }}\napiVersion: monitoring.coreos.com/v1\nkind: ServiceMonitor\nmetadata:\n  name: {{ include "argocd-image-updater.fullname" . }}-metrics\n  {{- with .Values.metrics.serviceMonitor.namespace }}\n  namespace: {{ . }}\n  {{- end }}\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n    {{- with .Values.metrics.serviceMonitor.selector }}\n      {{- toYaml . | nindent 4 }}\n    {{- end }}\n    {{- with .Values.metrics.serviceMonitor.additionalLabels }}\n      {{- toYaml . | nindent 4 }}\n    {{- end }}\nspec:\n  endpoints:\n    - port: metrics\n      {{- with .Values.metrics.serviceMonitor.interval }}\n      interval: {{ . }}\n      {{- end }}\n      path: /metrics\n      {{- with .Values.metrics.serviceMonitor.relabelings }}\n      relabelings:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n      {{- with .Values.metrics.serviceMonitor.metricRelabelings }}\n      metricRelabelings:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n  namespaceSelector:\n    matchNames:\n      - {{ .Release.Namespace }}\n  selector:\n    matchLabels:\n      {{- include "argocd-image-updater.selectorLabels" . | nindent 6 }}\n{{- end }}\n',
      status: CompareChartTemplateStatus.Deleted,
    },
  ],
  activeTemplateName: 'configmap-authscripts.yaml',
  onTemplateChange: onTemplateChangeMock,
};

describe('CompareTemplatesList', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<CompareTemplatesList {...defaultProps} />);

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<CompareTemplatesList {...defaultProps} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Show template/ })).toHaveLength(8);
      expect(screen.getByTestId('tmpl-deleted-icon')).toBeInTheDocument();
      expect(screen.getAllByTestId('tmpl-added-icon')).toHaveLength(5);
      expect(screen.getAllByTestId('tmpl-modified-icon')).toHaveLength(2);
    });

    it('search templates', async () => {
      render(<CompareTemplatesList {...defaultProps} />);

      expect(screen.getAllByRole('button', { name: /Show template/ })).toHaveLength(8);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'service');

      expect(screen.getAllByRole('button', { name: /Show template/ })).toHaveLength(2);
    });

    it('search templates without result', async () => {
      render(<CompareTemplatesList {...defaultProps} />);

      expect(screen.getAllByRole('button', { name: /Show template/ })).toHaveLength(8);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'no result');

      expect(screen.queryByRole('button', { name: /Show template/ })).toBeNull();
      expect(screen.getByText('Sorry, no matches found'));
    });

    it('changes activetemplate', async () => {
      render(<CompareTemplatesList {...defaultProps} />);

      const tmpBtns = screen.getAllByRole('button', { name: /Show template/ });
      await userEvent.click(tmpBtns[4]);

      expect(onTemplateChangeMock).toHaveBeenCalledTimes(1);
      expect(onTemplateChangeMock).toHaveBeenCalledWith({
        name: 'metrics-service.yaml',
        fileName: 'metrics-service',
        resourceKinds: ['Service'],
        data: '{{- if .Values.metrics.enabled }}\napiVersion: v1\nkind: Service\nmetadata:\n  {{- if .Values.metrics.service.annotations }}\n  annotations:\n    {{- range $key, $value := .Values.metrics.service.annotations }}\n    {{ $key }}: {{ $value | quote }}\n    {{- end }}\n  {{- end }}\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n    {{- with .Values.metrics.service.labels }}\n      {{- toYaml . | nindent 4 }}\n    {{- end }}\n  name: {{ include "argocd-image-updater.fullname" . }}-metrics\nspec:\n  ports:\n    - name: metrics\n      protocol: TCP\n      port: {{ .Values.metrics.service.servicePort }}\n      targetPort: metrics\n  selector:\n    {{- include "argocd-image-updater.selectorLabels" . | nindent 4 }}\n{{- end }}\n',
        type: ChartTmplTypeFile.Template,
        compareData: '',
        status: CompareChartTemplateStatus.Added,
      });
    });
  });
});
