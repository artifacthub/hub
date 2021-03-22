import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { ChartTemplate } from '../../../types';
import TemplatesList from './TemplatesList';

const onTemplateChangeMock = jest.fn();

const defaultProps = {
  activeTemplateName: 'test',
  onTemplateChange: onTemplateChangeMock,
};

interface ChartTmpl {
  templates: ChartTemplate[];
}

const getMockChartTemplates = (fixtureId: string): ChartTmpl => {
  return require(`./__fixtures__/TemplatesList/${fixtureId}.json`) as ChartTmpl;
};

describe('TemplatesList', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<TemplatesList {...defaultProps} templates={getMockChartTemplates('1').templates} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getAllByTestId, getByPlaceholderText, getByText, getAllByText } = render(
        <TemplatesList {...defaultProps} templates={getMockChartTemplates('2').templates} />
      );

      expect(getByPlaceholderText('Search by template or resource kind')).toBeInTheDocument();
      expect(getAllByTestId('tmplBtn')).toHaveLength(16);

      // Templates
      expect(getByText('db_migrator_install_job.yaml')).toBeInTheDocument();
      expect(getByText('db_migrator_secret.yaml')).toBeInTheDocument();
      expect(getByText('hub_deployment.yaml')).toBeInTheDocument();
      expect(getByText('hub_ingress.yaml')).toBeInTheDocument();
      expect(getByText('hub_secret.yaml')).toBeInTheDocument();
      expect(getByText('hub_service.yaml')).toBeInTheDocument();
      expect(getByText('hub_serviceaccount.yaml')).toBeInTheDocument();
      expect(getByText('scanner_cronjob.yaml')).toBeInTheDocument();
      expect(getByText('scanner_secret.yaml')).toBeInTheDocument();
      expect(getByText('tracker_cronjob.yaml')).toBeInTheDocument();
      expect(getByText('tracker_secret.yaml')).toBeInTheDocument();
      expect(getByText('trivy_deployment.yaml')).toBeInTheDocument();
      expect(getByText('trivy_pvc.yaml')).toBeInTheDocument();
      expect(getByText('trivy_service.yaml')).toBeInTheDocument();
      expect(getByText('_helpers.tpl')).toBeInTheDocument();

      // Some labels
      expect(getAllByText('Secret')).toHaveLength(4);
      expect(getAllByText('CronJob')).toHaveLength(2);
      expect(getByText('Multiple kinds')).toBeInTheDocument();
    });

    it('renders active template', () => {
      const { getAllByTestId } = render(
        <TemplatesList
          {...defaultProps}
          templates={getMockChartTemplates('3').templates}
          activeTemplateName="db_migrator_secret.yaml"
        />
      );

      const btns = getAllByTestId('tmplBtn');
      expect(btns[1]).toHaveClass('active');
      expect(btns[1]).toHaveTextContent('Template:db_migrator_secret.yamlResource:Secret');
    });

    it('filters templates', () => {
      const { getAllByTestId, getByPlaceholderText } = render(
        <TemplatesList
          {...defaultProps}
          templates={getMockChartTemplates('3').templates}
          activeTemplateName="db_migrator_secret.yaml"
        />
      );

      expect(getAllByTestId('tmplBtn')).toHaveLength(16);

      const input = getByPlaceholderText('Search by template or resource kind');
      fireEvent.change(input, { target: { value: 'role' } });

      expect(getAllByTestId('tmplBtn')).toHaveLength(1);
    });

    it('changes active template', () => {
      const { getAllByTestId } = render(
        <TemplatesList
          {...defaultProps}
          templates={getMockChartTemplates('3').templates}
          activeTemplateName="db_migrator_secret.yaml"
        />
      );

      const btns = getAllByTestId('tmplBtn');
      fireEvent.click(btns[4]);

      expect(onTemplateChangeMock).toHaveBeenCalledTimes(1);
      expect(onTemplateChangeMock).toHaveBeenCalledWith({
        data:
          '{{- if .Values.hub.ingress.enabled -}}\napiVersion: networking.k8s.io/v1beta1\nkind: Ingress\nmetadata:\n  name: {{ include "chart.resourceNamePrefix" . }}hub\n  labels:\n    app.kubernetes.io/component: hub\n    {{- include "chart.labels" . | nindent 4 }}\n  {{- with .Values.hub.ingress.annotations }}\n  annotations:\n    {{- toYaml . | nindent 4 }}\n  {{- end }}\nspec:\n  backend:\n    serviceName: {{ include "chart.resourceNamePrefix" . }}hub\n    servicePort: {{ .Values.hub.service.port }}\n  {{- with .Values.hub.ingress.rules }}\n  rules:\n    {{- toYaml . | nindent 4 }}\n  {{- end }}\n  {{- with .Values.hub.ingress.tls }}\n  tls:\n    {{- toYaml . | nindent 4 }}\n  {{- end }}\n{{- end }}\n',
        fileName: 'hub_ingress',
        name: 'hub_ingress.yaml',
        resourceKinds: ['Ingress'],
        type: 0,
      });
    });
  });
});
