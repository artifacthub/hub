import { ChartTemplate } from '../types';
import formatChartTemplates from './formatChartTemplates';

interface Test {
  input: {
    name: string;
    data: string;
  }[];
  output: ChartTemplate[];
}

const tests: Test[] = [
  { input: [], output: [] },
  {
    input: [
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
    output: [
      {
        name: 'configmap.yaml',
        fileName: 'configmap',
        resourceKinds: ['ConfigMap'],
        data: '---\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n  name: argocd-image-updater-config\ndata:\n  registries.conf: |\n    {{- with .Values.config.registries }}\n      registries:\n        {{- toYaml . | nindent 6 }}\n    {{- end }}\n',
        type: 0,
      },
      {
        name: 'rbac.yaml',
        fileName: 'rbac',
        resourceKinds: ['Role', 'RoleBinding'],
        data: '{{- if .Values.rbac.enabled }}\n---\napiVersion: rbac.authorization.k8s.io/v1\nkind: Role\nmetadata:\n  labels:\n    {{ include "argocd-image-updater.labels" . | nindent 4 }}\n  name: {{ include "argocd-image-updater.fullname" . }} \nrules:\n  - apiGroups:\n      - \'\'\n    resources:\n      - secrets\n      - configmaps\n    verbs:\n      - get\n      - list\n      - watch\n  - apiGroups:\n      - argoproj.io\n    resources:\n      - applications\n    verbs:\n      - get\n      - list\n      - update\n      - patch\n  - apiGroups:\n      - ""\n    resources:\n      - events\n    verbs:\n      - create\n---\napiVersion: rbac.authorization.k8s.io/v1\nkind: RoleBinding\nmetadata:\n  labels:\n    {{ include "argocd-image-updater.labels" . | nindent 4 }}\n  name: {{ include "argocd-image-updater.fullname" . }}\nroleRef:\n  apiGroup: rbac.authorization.k8s.io\n  kind: Role\n  name: {{ include "argocd-image-updater.fullname" . }}\nsubjects:\n- kind: ServiceAccount\n  name: {{ include "argocd-image-updater.serviceAccountName" . }}\n{{- end }}\n',
        type: 0,
      },
      {
        name: 'serviceaccount.yaml',
        fileName: 'serviceaccount',
        resourceKinds: ['ServiceAccount'],
        data: '{{- if .Values.serviceAccount.create -}}\napiVersion: v1\nkind: ServiceAccount\nmetadata:\n  name: {{ include "argocd-image-updater.serviceAccountName" . }}\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n  {{- with .Values.serviceAccount.annotations }}\n  annotations:\n    {{- toYaml . | nindent 4 }}\n  {{- end }}\n{{- end }}\n',
        type: 0,
      },
      {
        name: '_helpers.tpl',
        fileName: '_helpers',
        resourceKinds: [],
        data: '{{/* vim: set filetype=mustache: */}}\n{{/*\nExpand the name of the chart.\n*/}}\n{{- define "argocd-image-updater.name" -}}\n{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}\n{{- end }}\n\n{{/*\nCreate a default fully qualified app name.\nWe truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).\nIf release name contains chart name it will be used as a full name.\n*/}}\n{{- define "argocd-image-updater.fullname" -}}\n{{- if .Values.fullnameOverride }}\n{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}\n{{- else }}\n{{- $name := default .Chart.Name .Values.nameOverride }}\n{{- if contains $name .Release.Name }}\n{{- .Release.Name | trunc 63 | trimSuffix "-" }}\n{{- else }}\n{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}\n{{- end }}\n{{- end }}\n{{- end }}\n\n{{/*\nCreate chart name and version as used by the chart label.\n*/}}\n{{- define "argocd-image-updater.chart" -}}\n{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}\n{{- end }}\n\n{{/*\nCommon labels\n*/}}\n{{- define "argocd-image-updater.labels" -}}\nhelm.sh/chart: {{ include "argocd-image-updater.chart" . }}\n{{ include "argocd-image-updater.selectorLabels" . }}\n{{- if .Chart.AppVersion }}\napp.kubernetes.io/version: {{ .Chart.AppVersion | quote }}\n{{- end }}\napp.kubernetes.io/managed-by: {{ .Release.Service }}\n{{- end }}\n\n{{/*\nSelector labels\n*/}}\n{{- define "argocd-image-updater.selectorLabels" -}}\napp.kubernetes.io/name: {{ include "argocd-image-updater.name" . }}\napp.kubernetes.io/instance: {{ .Release.Name }}\n{{- end }}\n\n{{/*\nCreate the name of the service account to use\n*/}}\n{{- define "argocd-image-updater.serviceAccountName" -}}\n{{- if .Values.serviceAccount.create }}\n{{- default (include "argocd-image-updater.fullname" .) .Values.serviceAccount.name }}\n{{- else }}\n{{- default "default" .Values.serviceAccount.name }}\n{{- end }}\n{{- end }}\n',
        type: 1,
      },
    ],
  },
  {
    input: [
      {
        name: 'templates/_helpers.tpl',
        data: 'e3svKiB2aW06IHNldCBmaWxldHlwZT1tdXN0YWNoZTogKi99fQp7ey8qCkV4cGFuZCB0aGUgbmFtZSBvZiB0aGUgY2hhcnQuCiovfX0Ke3stIGRlZmluZSAiYXJnb2NkLWltYWdlLXVwZGF0ZXIubmFtZSIgLX19Cnt7LSBkZWZhdWx0IC5DaGFydC5OYW1lIC5WYWx1ZXMubmFtZU92ZXJyaWRlIHwgdHJ1bmMgNjMgfCB0cmltU3VmZml4ICItIiB9fQp7ey0gZW5kIH19Cgp7ey8qCkNyZWF0ZSBhIGRlZmF1bHQgZnVsbHkgcXVhbGlmaWVkIGFwcCBuYW1lLgpXZSB0cnVuY2F0ZSBhdCA2MyBjaGFycyBiZWNhdXNlIHNvbWUgS3ViZXJuZXRlcyBuYW1lIGZpZWxkcyBhcmUgbGltaXRlZCB0byB0aGlzIChieSB0aGUgRE5TIG5hbWluZyBzcGVjKS4KSWYgcmVsZWFzZSBuYW1lIGNvbnRhaW5zIGNoYXJ0IG5hbWUgaXQgd2lsbCBiZSB1c2VkIGFzIGEgZnVsbCBuYW1lLgoqL319Cnt7LSBkZWZpbmUgImFyZ29jZC1pbWFnZS11cGRhdGVyLmZ1bGxuYW1lIiAtfX0Ke3stIGlmIC5WYWx1ZXMuZnVsbG5hbWVPdmVycmlkZSB9fQp7ey0gLlZhbHVlcy5mdWxsbmFtZU92ZXJyaWRlIHwgdHJ1bmMgNjMgfCB0cmltU3VmZml4ICItIiB9fQp7ey0gZWxzZSB9fQp7ey0gJG5hbWUgOj0gZGVmYXVsdCAuQ2hhcnQuTmFtZSAuVmFsdWVzLm5hbWVPdmVycmlkZSB9fQp7ey0gaWYgY29udGFpbnMgJG5hbWUgLlJlbGVhc2UuTmFtZSB9fQp7ey0gLlJlbGVhc2UuTmFtZSB8IHRydW5jIDYzIHwgdHJpbVN1ZmZpeCAiLSIgfX0Ke3stIGVsc2UgfX0Ke3stIHByaW50ZiAiJXMtJXMiIC5SZWxlYXNlLk5hbWUgJG5hbWUgfCB0cnVuYyA2MyB8IHRyaW1TdWZmaXggIi0iIH19Cnt7LSBlbmQgfX0Ke3stIGVuZCB9fQp7ey0gZW5kIH19Cgp7ey8qCkNyZWF0ZSBjaGFydCBuYW1lIGFuZCB2ZXJzaW9uIGFzIHVzZWQgYnkgdGhlIGNoYXJ0IGxhYmVsLgoqL319Cnt7LSBkZWZpbmUgImFyZ29jZC1pbWFnZS11cGRhdGVyLmNoYXJ0IiAtfX0Ke3stIHByaW50ZiAiJXMtJXMiIC5DaGFydC5OYW1lIC5DaGFydC5WZXJzaW9uIHwgcmVwbGFjZSAiKyIgIl8iIHwgdHJ1bmMgNjMgfCB0cmltU3VmZml4ICItIiB9fQp7ey0gZW5kIH19Cgp7ey8qCkNvbW1vbiBsYWJlbHMKKi99fQp7ey0gZGVmaW5lICJhcmdvY2QtaW1hZ2UtdXBkYXRlci5sYWJlbHMiIC19fQpoZWxtLnNoL2NoYXJ0OiB7eyBpbmNsdWRlICJhcmdvY2QtaW1hZ2UtdXBkYXRlci5jaGFydCIgLiB9fQp7eyBpbmNsdWRlICJhcmdvY2QtaW1hZ2UtdXBkYXRlci5zZWxlY3RvckxhYmVscyIgLiB9fQp7ey0gaWYgLkNoYXJ0LkFwcFZlcnNpb24gfX0KYXBwLmt1YmVybmV0ZXMuaW8vdmVyc2lvbjoge3sgLkNoYXJ0LkFwcFZlcnNpb24gfCBxdW90ZSB9fQp7ey0gZW5kIH19CmFwcC5rdWJlcm5ldGVzLmlvL21hbmFnZWQtYnk6IHt7IC5SZWxlYXNlLlNlcnZpY2UgfX0Ke3stIGVuZCB9fQoKe3svKgpTZWxlY3RvciBsYWJlbHMKKi99fQp7ey0gZGVmaW5lICJhcmdvY2QtaW1hZ2UtdXBkYXRlci5zZWxlY3RvckxhYmVscyIgLX19CmFwcC5rdWJlcm5ldGVzLmlvL25hbWU6IHt7IGluY2x1ZGUgImFyZ29jZC1pbWFnZS11cGRhdGVyLm5hbWUiIC4gfX0KYXBwLmt1YmVybmV0ZXMuaW8vaW5zdGFuY2U6IHt7IC5SZWxlYXNlLk5hbWUgfX0Ke3stIGVuZCB9fQoKe3svKgpDcmVhdGUgdGhlIG5hbWUgb2YgdGhlIHNlcnZpY2UgYWNjb3VudCB0byB1c2UKKi99fQp7ey0gZGVmaW5lICJhcmdvY2QtaW1hZ2UtdXBkYXRlci5zZXJ2aWNlQWNjb3VudE5hbWUiIC19fQp7ey0gaWYgLlZhbHVlcy5zZXJ2aWNlQWNjb3VudC5jcmVhdGUgfX0Ke3stIGRlZmF1bHQgKGluY2x1ZGUgImFyZ29jZC1pbWFnZS11cGRhdGVyLmZ1bGxuYW1lIiAuKSAuVmFsdWVzLnNlcnZpY2VBY2NvdW50Lm5hbWUgfX0Ke3stIGVsc2UgfX0Ke3stIGRlZmF1bHQgImRlZmF1bHQiIC5WYWx1ZXMuc2VydmljZUFjY291bnQubmFtZSB9fQp7ey0gZW5kIH19Cnt7LSBlbmQgfX0K',
      },
      {
        name: 'templates/serviceaccount.yaml',
        data: 'e3stIGlmIC5WYWx1ZXMuc2VydmljZUFjY291bnQuY3JlYXRlIC19fQphcGlWZXJzaW9uOiB2MQpraW5kOiBTZXJ2aWNlQWNjb3VudAptZXRhZGF0YToKICBuYW1lOiB7eyBpbmNsdWRlICJhcmdvY2QtaW1hZ2UtdXBkYXRlci5zZXJ2aWNlQWNjb3VudE5hbWUiIC4gfX0KICBsYWJlbHM6CiAgICB7ey0gaW5jbHVkZSAiYXJnb2NkLWltYWdlLXVwZGF0ZXIubGFiZWxzIiAuIHwgbmluZGVudCA0IH19CiAge3stIHdpdGggLlZhbHVlcy5zZXJ2aWNlQWNjb3VudC5hbm5vdGF0aW9ucyB9fQogIGFubm90YXRpb25zOgogICAge3stIHRvWWFtbCAuIHwgbmluZGVudCA0IH19CiAge3stIGVuZCB9fQp7ey0gZW5kIH19Cg==',
      },
    ],
    output: [
      {
        name: 'serviceaccount.yaml',
        fileName: 'serviceaccount',
        resourceKinds: ['ServiceAccount'],
        data: '{{- if .Values.serviceAccount.create -}}\napiVersion: v1\nkind: ServiceAccount\nmetadata:\n  name: {{ include "argocd-image-updater.serviceAccountName" . }}\n  labels:\n    {{- include "argocd-image-updater.labels" . | nindent 4 }}\n  {{- with .Values.serviceAccount.annotations }}\n  annotations:\n    {{- toYaml . | nindent 4 }}\n  {{- end }}\n{{- end }}\n',
        type: 0,
      },
      {
        name: '_helpers.tpl',
        fileName: '_helpers',
        resourceKinds: [],
        data: '{{/* vim: set filetype=mustache: */}}\n{{/*\nExpand the name of the chart.\n*/}}\n{{- define "argocd-image-updater.name" -}}\n{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}\n{{- end }}\n\n{{/*\nCreate a default fully qualified app name.\nWe truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).\nIf release name contains chart name it will be used as a full name.\n*/}}\n{{- define "argocd-image-updater.fullname" -}}\n{{- if .Values.fullnameOverride }}\n{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}\n{{- else }}\n{{- $name := default .Chart.Name .Values.nameOverride }}\n{{- if contains $name .Release.Name }}\n{{- .Release.Name | trunc 63 | trimSuffix "-" }}\n{{- else }}\n{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}\n{{- end }}\n{{- end }}\n{{- end }}\n\n{{/*\nCreate chart name and version as used by the chart label.\n*/}}\n{{- define "argocd-image-updater.chart" -}}\n{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}\n{{- end }}\n\n{{/*\nCommon labels\n*/}}\n{{- define "argocd-image-updater.labels" -}}\nhelm.sh/chart: {{ include "argocd-image-updater.chart" . }}\n{{ include "argocd-image-updater.selectorLabels" . }}\n{{- if .Chart.AppVersion }}\napp.kubernetes.io/version: {{ .Chart.AppVersion | quote }}\n{{- end }}\napp.kubernetes.io/managed-by: {{ .Release.Service }}\n{{- end }}\n\n{{/*\nSelector labels\n*/}}\n{{- define "argocd-image-updater.selectorLabels" -}}\napp.kubernetes.io/name: {{ include "argocd-image-updater.name" . }}\napp.kubernetes.io/instance: {{ .Release.Name }}\n{{- end }}\n\n{{/*\nCreate the name of the service account to use\n*/}}\n{{- define "argocd-image-updater.serviceAccountName" -}}\n{{- if .Values.serviceAccount.create }}\n{{- default (include "argocd-image-updater.fullname" .) .Values.serviceAccount.name }}\n{{- else }}\n{{- default "default" .Values.serviceAccount.name }}\n{{- end }}\n{{- end }}\n',
        type: 1,
      },
    ],
  },
];

describe('formatChartTemplates', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns formatted templates', () => {
      const actual = formatChartTemplates(tests[i].input);
      expect(actual).toEqual(tests[i].output);
    });
  }
});
