{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "chart.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "chart.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "chart.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "chart.labels" -}}
helm.sh/chart: {{ include "chart.chart" . }}
{{ include "chart.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Selector labels
*/}}
{{- define "chart.selectorLabels" -}}
app.kubernetes.io/name: {{ include "chart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Kubernetes version
Built-in object .Capabilities.KubeVersion.Minor can provide non-number output
For example on GKE it returns "15+" instead of "15"
*/}}
{{- define "chart.KubernetesVersion" -}}
{{- $minorVersion := .Capabilities.KubeVersion.Minor | regexFind "[0-9]+" -}}
{{- printf "%s.%s" .Capabilities.KubeVersion.Major $minorVersion -}}
{{- end -}}

{{/*
Kubernetes resource name prefix
Using the prefix allows deploying multiple instances of the Chart in a single Kubernetes namespace.
If the dynamic resource name prefix is disabled, this template results in an empty string.
As described in `chart.fullname`, the length limit for some resource names is 63.
Therefore, we truncate the prefix to have a max-length of 44 to respect this limit considering the
longest resource name ("db-migrator-install" = 19 chars).
*/}}
{{- define "chart.resourceNamePrefix" -}}
{{- if .Values.dynamicResourceNamePrefixEnabled -}}
{{- (include "chart.fullname" .) | trunc 43 | trimSuffix "-" | printf "%s-" -}}
{{- end -}}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "chart.serviceAccountName" -}}
{{- if .Values.hub.serviceAccount.create -}}
  {{- .Values.hub.serviceAccount.name | default (printf "%s%s" (include "chart.resourceNamePrefix" .) "hub") -}}
{{- else -}}
  {{- .Values.hub.serviceAccount.name | default "default" -}}
{{- end -}}
{{- end -}}

{{/*
Provide an init container to verify the database is accessible
*/}}
{{- define "chart.checkDbIsReadyInitContainer" -}}
name: check-db-ready
{{ if .Values.postgresql.image.registry -}}
image: {{ .Values.postgresql.image.registry }}/{{ .Values.postgresql.image.repository }}:{{ .Values.postgresql.image.tag }}
{{- else -}}
image: {{ .Values.postgresql.image.repository }}:{{ .Values.postgresql.image.tag }}
{{- end }}
imagePullPolicy: {{ .Values.pullPolicy }}
{{- with .Values.hub.deploy.initContainers.checkDbIsReady.resources }}
resources:
  {{-  toYaml . | nindent 2 }}
{{- end }}
env:
  - name: PGHOST
    value: {{ default (printf "%s-postgresql.%s" .Release.Name .Release.Namespace) .Values.db.host }}
  - name: PGPORT
    value: "{{ .Values.db.port }}"
  - name: PGUSER
    value: "{{ .Values.db.user }}"
command: ['sh', '-c', 'until pg_isready; do echo waiting for database; sleep 2; done;']
{{- end -}}

{{/*
Renders a value that contains template.
Usage:
{{ include "chart.tplvalues.render" ( dict "value" .Values.path.to.the.Value "context" $) }}
*/}}
{{- define "chart.tplvalues.render" -}}
{{- if typeIs "string" .value }}
  {{- tpl .value .context }}
{{- else }}
  {{- tpl (.value | toYaml) .context }}
{{- end }}
{{- end -}}
