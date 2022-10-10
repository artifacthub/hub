import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../../api';
import { ChartTmplTypeFile } from '../../../types';
import CompareView from './CompareView';

jest.mock('../../../api');
jest.mock('react-markdown', () => () => <div />);

const updateUrlMock = jest.fn();
const itemScrollMock = jest.fn();

Object.defineProperty(HTMLElement.prototype, 'scroll', { configurable: true, value: itemScrollMock });

const defaultProps = {
  packageId: 'id',
  templates: [
    {
      name: 'configmap-authscripts.yaml',
      fileName: 'configmap-authscripts',
      resourceKinds: ['ConfigMap'],
      data: '{{- if .Values.authScripts.enabled }}\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n  name: argocd-image-updater-authscripts\ndata:\n  {{- toYaml .Values.authScripts.scripts | nindent 2}}\n{{- end }}\n',
      type: ChartTmplTypeFile.Template,
    },
    {
      name: 'configmap-sshconfig.yaml',
      fileName: 'configmap-sshconfig',
      resourceKinds: ['ConfigMap'],
      data: 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n  name: argocd-image-updater-ssh-config\ndata:\n  {{- with .Values.config.sshConfig }}\n  {{- toYaml . | nindent 2 }}\n  {{- end }}\n',
      type: ChartTmplTypeFile.Template,
    },
    {
      name: 'configmap.yaml',
      fileName: 'configmap',
      resourceKinds: ['ConfigMap'],
      data: '---\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n  name: argocd-image-updater-config\ndata:\n  {{- with .Values.config.applicationsAPIKind }}\n  applications_api: {{ . }}\n  {{- end }}\n  argocd.grpc_web: {{ .Values.config.argocd.grpcWeb | quote }}\n  {{- with .Values.config.argocd.serverAddress }}\n  argocd.server_addr: {{ . }}\n  {{- end }}\n  argocd.insecure: {{ .Values.config.argocd.insecure | quote }}\n  argocd.plaintext: {{ .Values.config.argocd.plaintext | quote }}\n  {{- with .Values.config.logLevel }}\n  log.level: {{ . }}\n  {{- end }}\n  {{- with .Values.config.gitCommitUser }}\n  git.user: {{ . }}\n  {{- end }}\n  {{- with .Values.config.gitCommitMail }}\n  git.email: {{ . }}\n  {{- end }}\n  {{- with .Values.config.gitCommitTemplate }}\n  git.commit-message-template: |\n    {{- nindent 4 . }}\n  {{- end }}\n  kube.events: {{ .Values.config.disableKubeEvents | quote }}\n  registries.conf: |\n    {{- with .Values.config.registries }}\n      registries:\n        {{- toYaml . | nindent 6 }}\n    {{- end }}\n',
      type: ChartTmplTypeFile.Template,
    },
    {
      name: 'deployment.yaml',
      fileName: 'deployment',
      resourceKinds: ['Deployment'],
      data: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: {{ include "argocd-image-updater.fullname" . }}\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\nspec:\n  replicas: {{ .Values.replicaCount }}\n  selector:\n    matchLabels:\n      {{- include "argocd-image-updater.selectorLabels" . | nindent 6 }}\n  strategy:\n    {{- .Values.updateStrategy | toYaml | nindent 4 }}\n  template:\n    metadata:\n      annotations:\n      {{- with .Values.podAnnotations }}\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}\n      labels:\n        {{- include "argocd-image-updater.selectorLabels" . | nindent 8 }}\n    spec:\n      {{- with .Values.imagePullSecrets }}\n      imagePullSecrets:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n      serviceAccountName: {{ include "argocd-image-updater.serviceAccountName" . }}\n      securityContext:\n        {{- toYaml .Values.podSecurityContext | nindent 8 }}\n      containers:\n        - name: {{ .Chart.Name }}\n          command:\n            - /usr/local/bin/argocd-image-updater\n            - run\n            {{- with .Values.extraArgs }}\n              {{- toYaml . | nindent 12 }}\n            {{- end }}\n          env:\n          - name: APPLICATIONS_API\n            valueFrom:\n              configMapKeyRef:\n                key: applications_api\n                name: argocd-image-updater-config\n                optional: true\n          - name: ARGOCD_GRPC_WEB\n            valueFrom:\n              configMapKeyRef:\n                key: argocd.grpc_web\n                name: argocd-image-updater-config\n                optional: true\n          - name: ARGOCD_SERVER\n            valueFrom:\n              configMapKeyRef:\n                key: argocd.server_addr\n                name: argocd-image-updater-config\n                optional: true\n          - name: ARGOCD_INSECURE\n            valueFrom:\n              configMapKeyRef:\n                key: argocd.insecure\n                name: argocd-image-updater-config\n                optional: true\n          - name: ARGOCD_PLAINTEXT\n            valueFrom:\n              configMapKeyRef:\n                key: argocd.plaintext\n                name: argocd-image-updater-config\n                optional: true\n          - name: ARGOCD_TOKEN\n            valueFrom:\n              secretKeyRef:\n                key: argocd.token\n                name: argocd-image-updater-secret\n                optional: true\n          - name: IMAGE_UPDATER_LOGLEVEL\n            valueFrom:\n              configMapKeyRef:\n                key: log.level\n                name: argocd-image-updater-config\n                optional: true\n          - name: GIT_COMMIT_USER\n            valueFrom:\n              configMapKeyRef:\n                key: git.user\n                name: argocd-image-updater-config\n                optional: true\n          - name: GIT_COMMIT_EMAIL\n            valueFrom:\n              configMapKeyRef:\n                key: git.email\n                name: argocd-image-updater-config\n                optional: true\n          - name: IMAGE_UPDATER_KUBE_EVENTS\n            valueFrom:\n              configMapKeyRef:\n                key: kube.events\n                name: argocd-image-updater-config\n                optional: true\n          {{- with .Values.extraEnv }}\n            {{- toYaml . | nindent 10 }}\n          {{- end }}\n          securityContext:\n            {{- toYaml .Values.securityContext | nindent 12 }}\n          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"\n          imagePullPolicy: {{ .Values.image.pullPolicy }}\n          ports:\n            - containerPort: 8080\n            {{ if .Values.metrics.enabled }}\n            - name: metrics\n              containerPort: 8081\n              protocol: TCP\n            {{- end }}\n          readinessProbe:\n            httpGet:\n              path: /healthz\n              port: 8080\n            initialDelaySeconds: 3\n            periodSeconds: 30\n          livenessProbe:\n            httpGet:\n              path: /healthz\n              port: 8080\n            initialDelaySeconds: 3\n            periodSeconds: 30\n          resources:\n            {{- toYaml .Values.resources | nindent 12 }}\n          volumeMounts:\n          - mountPath: /app/config\n            name: image-updater-conf\n          - mountPath: /tmp\n            name: tmp-dir\n          - mountPath: /app/config/ssh\n            name: ssh-known-hosts\n          - mountPath: /app/.ssh\n            name: ssh-config\n          {{- if .Values.authScripts.enabled }}\n          - mountPath: /scripts\n            name: authscripts\n          {{- end }}\n      volumes:\n      - configMap:\n          items:\n          - key: registries.conf\n            path: registries.conf\n          - key: git.commit-message-template\n            path: commit.template\n          name: argocd-image-updater-config\n          optional: true\n        name: image-updater-conf\n      {{- if .Values.authScripts.enabled }}\n      - configMap:\n          defaultMode: 0777\n          name: argocd-image-updater-authscripts\n        name: authscripts\n      {{- end }}\n      - emptyDir: {}\n        name: tmp-dir\n      - configMap:\n          name: argocd-ssh-known-hosts-cm\n          optional: true\n        name: ssh-known-hosts\n      - configMap:\n          name: argocd-image-updater-ssh-config\n          optional: true\n        name: ssh-config\n      {{- with .Values.nodeSelector }}\n      nodeSelector:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n      {{- with .Values.affinity }}\n      affinity:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n      {{- with .Values.tolerations }}\n      tolerations:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n',
      type: ChartTmplTypeFile.Template,
    },
    {
      name: 'metrics-service.yaml',
      fileName: 'metrics-service',
      resourceKinds: ['Service'],
      data: '{{- if .Values.metrics.enabled }}\napiVersion: v1\nkind: Service\nmetadata:\n  {{- if .Values.metrics.service.annotations }}\n  annotations:\n    {{- range $key, $value := .Values.metrics.service.annotations }}\n    {{ $key }}: {{ $value | quote }}\n    {{- end }}\n  {{- end }}\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n    {{- with .Values.metrics.service.labels }}\n      {{- toYaml . | nindent 4 }}\n    {{- end }}\n  name: {{ include "argocd-image-updater.fullname" . }}-metrics\nspec:\n  ports:\n    - name: metrics\n      protocol: TCP\n      port: {{ .Values.metrics.service.servicePort }}\n      targetPort: metrics\n  selector:\n    {{- include "argocd-image-updater.selectorLabels" . | nindent 4 }}\n{{- end }}\n',
      type: ChartTmplTypeFile.Template,
    },
    {
      name: 'rbac.yaml',
      fileName: 'rbac',
      resourceKinds: ['Role', 'RoleBinding'],
      data: '{{- if .Values.rbac.enabled }}\n---\napiVersion: rbac.authorization.k8s.io/v1\nkind: Role\nmetadata:\n  labels:\n    {{ include "argocd-image-updater.labels" . | nindent 4 }}\n  name: {{ include "argocd-image-updater.fullname" . }} \nrules:\n  - apiGroups:\n      - \'\'\n    resources:\n      - secrets\n      - configmaps\n    verbs:\n      - get\n      - list\n      - watch\n  - apiGroups:\n      - argoproj.io\n    resources:\n      - applications\n    verbs:\n      - get\n      - list\n      - update\n      - patch\n  - apiGroups:\n      - ""\n    resources:\n      - events\n    verbs:\n      - create\n---\napiVersion: rbac.authorization.k8s.io/v1\nkind: RoleBinding\nmetadata:\n  labels:\n    {{ include "argocd-image-updater.labels" . | nindent 4 }}\n  name: {{ include "argocd-image-updater.fullname" . }}\nroleRef:\n  apiGroup: rbac.authorization.k8s.io\n  kind: Role\n  name: {{ include "argocd-image-updater.fullname" . }}\nsubjects:\n- kind: ServiceAccount\n  name: {{ include "argocd-image-updater.serviceAccountName" . }}\n{{- end }}\n',
      type: ChartTmplTypeFile.Template,
    },
    {
      name: 'secret.yaml',
      fileName: 'secret',
      resourceKinds: ['Secret'],
      data: '{{- if .Values.config.argocd.token }}\napiVersion: v1\nkind: Secret\nmetadata:\n  name: argocd-image-updater-secret\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\ntype: Opaque\ndata: \n  argocd.token: {{ .Values.config.argocd.token | b64enc }}\n{{- end }}\n',
      type: ChartTmplTypeFile.Template,
    },
    {
      name: 'serviceaccount.yaml',
      fileName: 'serviceaccount',
      resourceKinds: ['ServiceAccount'],
      data: '{{- if .Values.serviceAccount.create -}}\napiVersion: v1\nkind: ServiceAccount\nmetadata:\n  name: {{ include "argocd-image-updater.serviceAccountName" . }}\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n  {{- with .Values.serviceAccount.annotations }}\n  annotations:\n    {{- toYaml . | nindent 4 }}\n  {{- end }}\n{{- end }}\n',
      type: ChartTmplTypeFile.Template,
    },
    {
      name: 'servicemonitor.yaml',
      fileName: 'servicemonitor',
      resourceKinds: ['ServiceMonitor'],
      data: '{{- if and .Values.metrics.enabled .Values.metrics.serviceMonitor.enabled }}\napiVersion: monitoring.coreos.com/v1\nkind: ServiceMonitor\nmetadata:\n  name: {{ include "argocd-image-updater.fullname" . }}-metrics\n  {{- with .Values.metrics.serviceMonitor.namespace }}\n  namespace: {{ . }}\n  {{- end }}\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n    {{- with .Values.metrics.serviceMonitor.selector }}\n      {{- toYaml . | nindent 4 }}\n    {{- end }}\n    {{- with .Values.metrics.serviceMonitor.additionalLabels }}\n      {{- toYaml . | nindent 4 }}\n    {{- end }}\nspec:\n  endpoints:\n    - port: metrics\n      {{- with .Values.metrics.serviceMonitor.interval }}\n      interval: {{ . }}\n      {{- end }}\n      path: /metrics\n      {{- with .Values.metrics.serviceMonitor.relabelings }}\n      relabelings:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n      {{- with .Values.metrics.serviceMonitor.metricRelabelings }}\n      metricRelabelings:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}\n  namespaceSelector:\n    matchNames:\n      - {{ .Release.Namespace }}\n  selector:\n    matchLabels:\n      {{- include "argocd-image-updater.selectorLabels" . | nindent 6 }}\n{{- end }}\n',
      type: ChartTmplTypeFile.Template,
    },
    {
      name: '_helpers.tpl',
      fileName: '_helpers',
      resourceKinds: [],
      data: '{{/* vim: set filetype=mustache: */}}\n{{/*\nExpand the name of the chart.\n*/}}\n{{- define "argocd-image-updater.name" -}}\n{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}\n{{- end }}\n\n{{/*\nCreate a default fully qualified app name.\nWe truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).\nIf release name contains chart name it will be used as a full name.\n*/}}\n{{- define "argocd-image-updater.fullname" -}}\n{{- if .Values.fullnameOverride }}\n{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}\n{{- else }}\n{{- $name := default .Chart.Name .Values.nameOverride }}\n{{- if contains $name .Release.Name }}\n{{- .Release.Name | trunc 63 | trimSuffix "-" }}\n{{- else }}\n{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}\n{{- end }}\n{{- end }}\n{{- end }}\n\n{{/*\nCreate chart name and version as used by the chart label.\n*/}}\n{{- define "argocd-image-updater.chart" -}}\n{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}\n{{- end }}\n\n{{/*\nCommon labels\n*/}}\n{{- define "argocd-image-updater.labels" -}}\nhelm.sh/chart: {{ include "argocd-image-updater.chart" . }}\n{{ include "argocd-image-updater.selectorLabels" . }}\n{{- if .Chart.AppVersion }}\napp.kubernetes.io/version: {{ .Chart.AppVersion | quote }}\n{{- end }}\napp.kubernetes.io/managed-by: {{ .Release.Service }}\n{{- end }}\n\n{{/*\nSelector labels\n*/}}\n{{- define "argocd-image-updater.selectorLabels" -}}\napp.kubernetes.io/name: {{ include "argocd-image-updater.name" . }}\napp.kubernetes.io/instance: {{ .Release.Name }}\n{{- end }}\n\n{{/*\nCreate the name of the service account to use\n*/}}\n{{- define "argocd-image-updater.serviceAccountName" -}}\n{{- if .Values.serviceAccount.create }}\n{{- default (include "argocd-image-updater.fullname" .) .Values.serviceAccount.name }}\n{{- else }}\n{{- default "default" .Values.serviceAccount.name }}\n{{- end }}\n{{- end }}\n',
      type: ChartTmplTypeFile.Helper,
    },
  ],
  currentVersion: '0.8.0',
  comparedVersion: '0.1.0',
  visibleTemplate: 'configmap-authscripts.yaml',
  updateUrl: updateUrlMock,
};

const APIData = {
  templates: [
    {
      name: 'templates/_helpers.tpl',
      data: 'e3svKiB2aW06IHNldCBmaWxldHlwZT1tdXN0YWNoZTogKi99fQp7ey8qCkV4cGFuZCB0aGUgbmFtZSBvZiB0aGUgY2hhcnQuCiovfX0Ke3stIGRlZmluZSAiYXJnb2NkLWltYWdlLXVwZGF0ZXIubmFtZSIgLX19Cnt7LSBkZWZhdWx0IC5DaGFydC5OYW1lIC5WYWx1ZXMubmFtZU92ZXJyaWRlIHwgdHJ1bmMgNjMgfCB0cmltU3VmZml4ICItIiB9fQp7ey0gZW5kIH19Cgp7ey8qCkNyZWF0ZSBhIGRlZmF1bHQgZnVsbHkgcXVhbGlmaWVkIGFwcCBuYW1lLgpXZSB0cnVuY2F0ZSBhdCA2MyBjaGFycyBiZWNhdXNlIHNvbWUgS3ViZXJuZXRlcyBuYW1lIGZpZWxkcyBhcmUgbGltaXRlZCB0byB0aGlzIChieSB0aGUgRE5TIG5hbWluZyBzcGVjKS4KSWYgcmVsZWFzZSBuYW1lIGNvbnRhaW5zIGNoYXJ0IG5hbWUgaXQgd2lsbCBiZSB1c2VkIGFzIGEgZnVsbCBuYW1lLgoqL319Cnt7LSBkZWZpbmUgImFyZ29jZC1pbWFnZS11cGRhdGVyLmZ1bGxuYW1lIiAtfX0Ke3stIGlmIC5WYWx1ZXMuZnVsbG5hbWVPdmVycmlkZSB9fQp7ey0gLlZhbHVlcy5mdWxsbmFtZU92ZXJyaWRlIHwgdHJ1bmMgNjMgfCB0cmltU3VmZml4ICItIiB9fQp7ey0gZWxzZSB9fQp7ey0gJG5hbWUgOj0gZGVmYXVsdCAuQ2hhcnQuTmFtZSAuVmFsdWVzLm5hbWVPdmVycmlkZSB9fQp7ey0gaWYgY29udGFpbnMgJG5hbWUgLlJlbGVhc2UuTmFtZSB9fQp7ey0gLlJlbGVhc2UuTmFtZSB8IHRydW5jIDYzIHwgdHJpbVN1ZmZpeCAiLSIgfX0Ke3stIGVsc2UgfX0Ke3stIHByaW50ZiAiJXMtJXMiIC5SZWxlYXNlLk5hbWUgJG5hbWUgfCB0cnVuYyA2MyB8IHRyaW1TdWZmaXggIi0iIH19Cnt7LSBlbmQgfX0Ke3stIGVuZCB9fQp7ey0gZW5kIH19Cgp7ey8qCkNyZWF0ZSBjaGFydCBuYW1lIGFuZCB2ZXJzaW9uIGFzIHVzZWQgYnkgdGhlIGNoYXJ0IGxhYmVsLgoqL319Cnt7LSBkZWZpbmUgImFyZ29jZC1pbWFnZS11cGRhdGVyLmNoYXJ0IiAtfX0Ke3stIHByaW50ZiAiJXMtJXMiIC5DaGFydC5OYW1lIC5DaGFydC5WZXJzaW9uIHwgcmVwbGFjZSAiKyIgIl8iIHwgdHJ1bmMgNjMgfCB0cmltU3VmZml4ICItIiB9fQp7ey0gZW5kIH19Cgp7ey8qCkNvbW1vbiBsYWJlbHMKKi99fQp7ey0gZGVmaW5lICJhcmdvY2QtaW1hZ2UtdXBkYXRlci5sYWJlbHMiIC19fQpoZWxtLnNoL2NoYXJ0OiB7eyBpbmNsdWRlICJhcmdvY2QtaW1hZ2UtdXBkYXRlci5jaGFydCIgLiB9fQp7eyBpbmNsdWRlICJhcmdvY2QtaW1hZ2UtdXBkYXRlci5zZWxlY3RvckxhYmVscyIgLiB9fQp7ey0gaWYgLkNoYXJ0LkFwcFZlcnNpb24gfX0KYXBwLmt1YmVybmV0ZXMuaW8vdmVyc2lvbjoge3sgLkNoYXJ0LkFwcFZlcnNpb24gfCBxdW90ZSB9fQp7ey0gZW5kIH19CmFwcC5rdWJlcm5ldGVzLmlvL21hbmFnZWQtYnk6IHt7IC5SZWxlYXNlLlNlcnZpY2UgfX0Ke3stIGVuZCB9fQoKe3svKgpTZWxlY3RvciBsYWJlbHMKKi99fQp7ey0gZGVmaW5lICJhcmdvY2QtaW1hZ2UtdXBkYXRlci5zZWxlY3RvckxhYmVscyIgLX19CmFwcC5rdWJlcm5ldGVzLmlvL25hbWU6IHt7IGluY2x1ZGUgImFyZ29jZC1pbWFnZS11cGRhdGVyLm5hbWUiIC4gfX0KYXBwLmt1YmVybmV0ZXMuaW8vaW5zdGFuY2U6IHt7IC5SZWxlYXNlLk5hbWUgfX0Ke3stIGVuZCB9fQoKe3svKgpDcmVhdGUgdGhlIG5hbWUgb2YgdGhlIHNlcnZpY2UgYWNjb3VudCB0byB1c2UKKi99fQp7ey0gZGVmaW5lICJhcmdvY2QtaW1hZ2UtdXBkYXRlci5zZXJ2aWNlQWNjb3VudE5hbWUiIC19fQp7ey0gaWYgLlZhbHVlcy5zZXJ2aWNlQWNjb3VudC5jcmVhdGUgfX0Ke3stIGRlZmF1bHQgKGluY2x1ZGUgImFyZ29jZC1pbWFnZS11cGRhdGVyLmZ1bGxuYW1lIiAuKSAuVmFsdWVzLnNlcnZpY2VBY2NvdW50Lm5hbWUgfX0Ke3stIGVsc2UgfX0Ke3stIGRlZmF1bHQgImRlZmF1bHQiIC5WYWx1ZXMuc2VydmljZUFjY291bnQubmFtZSB9fQp7ey0gZW5kIH19Cnt7LSBlbmQgfX0K',
    },
    {
      name: 'templates/configmap.yaml',
      data: 'LS0tCmFwaVZlcnNpb246IHYxCmtpbmQ6IENvbmZpZ01hcAptZXRhZGF0YToKICBsYWJlbHM6CiAgICB7ey0gaW5jbHVkZSAiYXJnb2NkLWltYWdlLXVwZGF0ZXIubGFiZWxzIiAuIHwgbmluZGVudCA0IH19CiAgbmFtZTogYXJnb2NkLWltYWdlLXVwZGF0ZXItY29uZmlnCmRhdGE6CiAgcmVnaXN0cmllcy5jb25mOiB8CiAgICB7ey0gd2l0aCAuVmFsdWVzLmNvbmZpZy5yZWdpc3RyaWVzIH19CiAgICAgIHJlZ2lzdHJpZXM6CiAgICAgICAge3stIHRvWWFtbCAuIHwgbmluZGVudCA2IH19CiAgICB7ey0gZW5kIH19Cg==',
    },
    {
      name: 'templates/rbac.yaml',
      data: 'e3stIGlmIC5WYWx1ZXMucmJhYy5lbmFibGVkIH19Ci0tLQphcGlWZXJzaW9uOiByYmFjLmF1dGhvcml6YXRpb24uazhzLmlvL3YxCmtpbmQ6IFJvbGUKbWV0YWRhdGE6CiAgbGFiZWxzOgogICAge3sgaW5jbHVkZSAiYXJnb2NkLWltYWdlLXVwZGF0ZXIubGFiZWxzIiAuIHwgbmluZGVudCA0IH19CiAgbmFtZToge3sgaW5jbHVkZSAiYXJnb2NkLWltYWdlLXVwZGF0ZXIuZnVsbG5hbWUiIC4gfX0gCnJ1bGVzOgogIC0gYXBpR3JvdXBzOgogICAgICAtICcnCiAgICByZXNvdXJjZXM6CiAgICAgIC0gc2VjcmV0cwogICAgICAtIGNvbmZpZ21hcHMKICAgIHZlcmJzOgogICAgICAtIGdldAogICAgICAtIGxpc3QKICAgICAgLSB3YXRjaAogIC0gYXBpR3JvdXBzOgogICAgICAtIGFyZ29wcm9qLmlvCiAgICByZXNvdXJjZXM6CiAgICAgIC0gYXBwbGljYXRpb25zCiAgICB2ZXJiczoKICAgICAgLSBnZXQKICAgICAgLSBsaXN0CiAgICAgIC0gdXBkYXRlCiAgICAgIC0gcGF0Y2gKICAtIGFwaUdyb3VwczoKICAgICAgLSAiIgogICAgcmVzb3VyY2VzOgogICAgICAtIGV2ZW50cwogICAgdmVyYnM6CiAgICAgIC0gY3JlYXRlCi0tLQphcGlWZXJzaW9uOiByYmFjLmF1dGhvcml6YXRpb24uazhzLmlvL3YxCmtpbmQ6IFJvbGVCaW5kaW5nCm1ldGFkYXRhOgogIGxhYmVsczoKICAgIHt7IGluY2x1ZGUgImFyZ29jZC1pbWFnZS11cGRhdGVyLmxhYmVscyIgLiB8IG5pbmRlbnQgNCB9fQogIG5hbWU6IHt7IGluY2x1ZGUgImFyZ29jZC1pbWFnZS11cGRhdGVyLmZ1bGxuYW1lIiAuIH19CnJvbGVSZWY6CiAgYXBpR3JvdXA6IHJiYWMuYXV0aG9yaXphdGlvbi5rOHMuaW8KICBraW5kOiBSb2xlCiAgbmFtZToge3sgaW5jbHVkZSAiYXJnb2NkLWltYWdlLXVwZGF0ZXIuZnVsbG5hbWUiIC4gfX0Kc3ViamVjdHM6Ci0ga2luZDogU2VydmljZUFjY291bnQKICBuYW1lOiB7eyBpbmNsdWRlICJhcmdvY2QtaW1hZ2UtdXBkYXRlci5zZXJ2aWNlQWNjb3VudE5hbWUiIC4gfX0Ke3stIGVuZCB9fQo=',
    },
    {
      name: 'templates/serviceaccount.yaml',
      data: 'e3stIGlmIC5WYWx1ZXMuc2VydmljZUFjY291bnQuY3JlYXRlIC19fQphcGlWZXJzaW9uOiB2MQpraW5kOiBTZXJ2aWNlQWNjb3VudAptZXRhZGF0YToKICBuYW1lOiB7eyBpbmNsdWRlICJhcmdvY2QtaW1hZ2UtdXBkYXRlci5zZXJ2aWNlQWNjb3VudE5hbWUiIC4gfX0KICBsYWJlbHM6CiAgICB7ey0gaW5jbHVkZSAiYXJnb2NkLWltYWdlLXVwZGF0ZXIubGFiZWxzIiAuIHwgbmluZGVudCA0IH19CiAge3stIHdpdGggLlZhbHVlcy5zZXJ2aWNlQWNjb3VudC5hbm5vdGF0aW9ucyB9fQogIGFubm90YXRpb25zOgogICAge3stIHRvWWFtbCAuIHwgbmluZGVudCA0IH19CiAge3stIGVuZCB9fQp7ey0gZW5kIH19Cg==',
    },
  ],
  values: {
    affinity: {},
    config: {
      argocd: { grpcWeb: true, insecure: false, plaintext: false, serverAddress: '' },
      logLevel: 'info',
      registries: [],
    },
    extraArgs: [],
    fullnameOverride: '',
    image: { pullPolicy: 'Always', repository: 'argoprojlabs/argocd-image-updater', tag: 'v0.10.1' },
    imagePullSecrets: [],
    nameOverride: '',
    nodeSelector: {},
    podAnnotations: {},
    podSecurityContext: {},
    rbac: { enabled: true },
    replicaCount: 1,
    resources: {},
    securityContext: {},
    serviceAccount: { annotations: {}, create: true, name: '' },
    tolerations: [],
  },
};
describe('CompareView', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    mocked(API).getChartTemplates.mockResolvedValue(APIData);
    const { asFragment } = render(<CompareView {...defaultProps} />);

    await waitFor(() => {
      expect(API.getChartTemplates).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByTestId('diffTemplate')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      mocked(API).getChartTemplates.mockResolvedValue(APIData);
      render(<CompareView {...defaultProps} />);

      expect(screen.getByRole('status')).toBeInTheDocument();

      await waitFor(() => {
        expect(API.getChartTemplates).toHaveBeenCalledTimes(1);
        expect(API.getChartTemplates).toHaveBeenCalledWith('id', '0.1.0');
      });

      await waitFor(() => {
        expect(screen.queryByRole('status')).toBeNull();
      });

      expect(await screen.findAllByRole('button', { name: /Show template/ })).toHaveLength(7);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Expand code' })).toBeInTheDocument();
      expect(screen.getAllByTestId('tmpl-added-icon')).toHaveLength(6);
      expect(screen.getByTestId('tmpl-modified-icon')).toBeInTheDocument();
    });

    it('search templates', async () => {
      mocked(API).getChartTemplates.mockResolvedValue(APIData);
      render(<CompareView {...defaultProps} />);

      await waitFor(() => {
        expect(API.getChartTemplates).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.queryByRole('status')).toBeNull();
      });

      expect(await screen.findAllByRole('button', { name: /Show template/ })).toHaveLength(7);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'service');

      expect(screen.getAllByRole('button', { name: /Show template/ })).toHaveLength(2);
    });

    it('search templates without result', async () => {
      mocked(API).getChartTemplates.mockResolvedValue(APIData);
      render(<CompareView {...defaultProps} />);

      await waitFor(() => {
        expect(API.getChartTemplates).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.queryByRole('status')).toBeNull();
      });

      expect(await screen.findAllByRole('button', { name: /Show template/ })).toHaveLength(7);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'no result');

      expect(screen.queryByRole('button', { name: /Show template/ })).toBeNull();
      expect(screen.getByText('Sorry, no matches found'));
    });

    it('clicks expand button', async () => {
      mocked(API).getChartTemplates.mockResolvedValue(APIData);
      render(<CompareView {...defaultProps} />);

      await waitFor(() => {
        expect(API.getChartTemplates).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.queryByRole('status')).toBeNull();
      });

      expect(await screen.findAllByRole('button', { name: /Show template/ })).toHaveLength(7);

      const btn = screen.getByRole('button', { name: 'Expand code' });
      await userEvent.click(btn);

      expect(screen.getByRole('button', { name: 'Collapse code' })).toBeInTheDocument();
    });

    it('when no changes found between versions', async () => {
      mocked(API).getChartTemplates.mockResolvedValue({ templates: [], values: {} });
      render(<CompareView {...defaultProps} templates={[]} />);

      expect(screen.getByRole('status')).toBeInTheDocument();

      await waitFor(() => {
        expect(API.getChartTemplates).toHaveBeenCalledTimes(1);
        expect(API.getChartTemplates).toHaveBeenCalledWith('id', '0.1.0');
      });

      await waitFor(() => {
        expect(screen.queryByRole('status')).toBeNull();
      });

      expect(await screen.findByText(/No changes found when comparing version/)).toBeInTheDocument();
    });
  });
});
