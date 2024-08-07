import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../../api';
import { JSONSchema } from '../../../jsonschema';
import { ErrorKind } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import ValuesSchema from './';
jest.mock('../../../api');
jest.mock('../../../utils/alertDispatcher');

const getMockValuesSchema = (fixtureId: string): JSONSchema => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/index/${fixtureId}.json`) as JSONSchema;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockOutletContextData: any = {
  isSearching: false,
};
const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useOutletContext: () => mockOutletContextData,
  useNavigate: () => mockUseNavigate,
}));

const defaultProps = {
  packageId: 'id',
  version: '0.1.0',
  visibleValuesSchema: false,
  normalizedName: 'pkg',
};

describe('ValuesSchema', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  xit('creates snapshot', async () => {
    const mockValuesSchema = getMockValuesSchema('1');
    mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

    const { asFragment } = render(
      <Router>
        <ValuesSchema {...defaultProps} visibleValuesSchema />
      </Router>
    );

    await waitFor(() => {
      expect(API.getValuesSchema).toHaveBeenCalledWith('id', '0.1.0');
    });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockValuesSchema = getMockValuesSchema('2');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      render(
        <Router>
          <ValuesSchema {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: /Open values schema modal/ });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
        expect(API.getValuesSchema).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('opens modal', async () => {
      const mockValuesSchema = getMockValuesSchema('3');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      render(
        <Router>
          <ValuesSchema {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: /Open values schema modal/ });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
        expect(mockUseNavigate).toHaveBeenCalledTimes(1);
        expect(mockUseNavigate).toHaveBeenCalledWith('?modal=values-schema', { replace: true, state: null });
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Values schema reference')).toBeInTheDocument();
    });

    it('closes modal', async () => {
      const mockValuesSchema = getMockValuesSchema('4');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      render(
        <Router>
          <ValuesSchema {...defaultProps} visibleValuesSchema />
        </Router>
      );

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      const close = screen.getByRole('button', { name: 'Close modal' });
      await userEvent.click(close);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });

      await waitFor(() => {
        expect(mockUseNavigate).toHaveBeenCalledTimes(2);
        expect(mockUseNavigate).toHaveBeenLastCalledWith('', { replace: true, state: null });
      });
    });

    it('calls again to getValuesSchema when version is different', async () => {
      const mockValuesSchema = getMockValuesSchema('5');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      const { rerender } = render(
        <Router>
          <ValuesSchema {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: /Open values schema modal/ });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
        expect(API.getValuesSchema).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      expect(await screen.findByText('Values schema reference')).toBeInTheDocument();

      const close = screen.getByText('Close');
      await userEvent.click(close);

      rerender(
        <Router>
          <ValuesSchema {...defaultProps} version="1.0.0" />
        </Router>
      );

      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(2);
        expect(API.getValuesSchema).toHaveBeenCalledWith(defaultProps.packageId, '1.0.0');
      });

      expect(await screen.findByText('Values schema reference')).toBeInTheDocument();
    });

    it('calls again to getValuesSchema when packageId is different', async () => {
      const mockValuesSchema = getMockValuesSchema('6');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      const { rerender } = render(
        <Router>
          <ValuesSchema {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: /Open values schema modal/ });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
        expect(API.getValuesSchema).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      expect(await screen.findByText('Values schema reference')).toBeInTheDocument();

      const close = screen.getByText('Close');
      await userEvent.click(close);

      rerender(
        <Router>
          <ValuesSchema {...defaultProps} packageId="id2" />
        </Router>
      );

      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(2);
        expect(API.getValuesSchema).toHaveBeenCalledWith('id2', defaultProps.version);
      });

      expect(await screen.findByText('Values schema reference')).toBeInTheDocument();
    });

    it('renders JSON schema with refs', async () => {
      const mockValuesSchema = getMockValuesSchema('8');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      render(
        <Router>
          <ValuesSchema {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: /Open values schema modal/ });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
        expect(API.getValuesSchema).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      expect(await screen.findByText('env:')).toBeInTheDocument();

      expect(screen.getByText('image:')).toBeInTheDocument();
      expect(screen.getByText('array')).toBeInTheDocument();
      expect(screen.getByText('(unique)')).toBeInTheDocument();
      expect(screen.getAllByText(/\[\]/)).toHaveLength(2);
    });

    // cmak
    it('renders complex full JSON', async () => {
      const mockValuesSchema = getMockValuesSchema('9');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      render(
        <Router>
          <ValuesSchema {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: /Open values schema modal/ });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
        expect(API.getValuesSchema).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      expect(await screen.findByText('Values schema reference')).toBeInTheDocument();

      expect(screen.getByText('# CMAK operator Helm values')).toBeInTheDocument();
      expect(screen.getByText('# ui container k8s settings')).toBeInTheDocument();
      expect(screen.getByText('ui:')).toBeInTheDocument();
      expect(screen.getByText('# extra cmd line arguments')).toBeInTheDocument();
      expect(screen.getByText('extraArgs:')).toBeInTheDocument();
      expect(screen.getAllByText('[]')).toHaveLength(2);
      expect(screen.getAllByText('# resource requests and limits')).toHaveLength(2);
      expect(screen.getAllByText('resources:')).toHaveLength(2);
      expect(screen.getAllByText('# resource limits')).toHaveLength(2);
      expect(screen.getAllByText('limits:')).toHaveLength(2);
      expect(screen.getAllByText('{}')).toHaveLength(14);
      expect(screen.getAllByText('# resource requests')).toHaveLength(2);
      expect(screen.getAllByText('requests:')).toHaveLength(2);
      expect(
        screen.getByText('# provide key value base pairs for consumer properties according to java docs')
      ).toBeInTheDocument();
      expect(screen.getByText('consumerProperties:')).toBeInTheDocument();
      expect(screen.getByText('# Consumer SSL configuration')).toBeInTheDocument();
      expect(screen.getByText('consumerPropertiesSsl:')).toBeInTheDocument();
      expect(screen.getAllByText('null')).toHaveLength(26);
      expect(screen.getByText('# keystore configuration')).toBeInTheDocument();
      expect(screen.getByText('keystore:')).toBeInTheDocument();
      expect(screen.getAllByText('type:')).toHaveLength(2);
      expect(screen.getAllByText('value:')).toHaveLength(2);
      expect(screen.getAllByText('password:')).toHaveLength(2);
      expect(screen.getByText('# truststore configuration')).toBeInTheDocument();
      expect(screen.getByText('truststore:')).toBeInTheDocument();
      expect(screen.getByText('# zk container k8s settings')).toBeInTheDocument();
      expect(screen.getByText('zk:')).toBeInTheDocument();
      expect(screen.getByText('# zk version')).toBeInTheDocument();
      expect(screen.getByText('version:')).toBeInTheDocument();
      expect(screen.getAllByText('3.6.1')).toHaveLength(2);
      expect(screen.getAllByText('# resource requests and limits')).toHaveLength(2);
      expect(screen.getAllByText('resources:')).toHaveLength(2);
      expect(screen.getByText('# cmak instance settings')).toBeInTheDocument();
      expect(screen.getByText('cmak:')).toBeInTheDocument();
      expect(screen.getAllByText('jmxSsl:')).toHaveLength(2);
      expect(screen.getAllByText('false')).toHaveLength(20);
      expect(screen.getAllByText('# either cluster enabled')).toHaveLength(2);
      expect(screen.getAllByText('enabled:')).toHaveLength(2);
      expect(screen.getAllByText('true')).toHaveLength(14);
      expect(screen.getAllByText('jmxPass:')).toHaveLength(2);
      expect(screen.getAllByText('jmxUser:')).toHaveLength(2);
      expect(screen.getAllByText('jmxEnabled:')).toHaveLength(2);
      expect(screen.getAllByText('kafkaVersion:')).toHaveLength(2);
      expect(screen.getAllByText('2.2.0')).toHaveLength(4);
      expect(screen.getAllByText('pollConsumers:')).toHaveLength(2);
      expect(screen.getAllByText('filterConsumers:')).toHaveLength(2);
      expect(screen.getAllByText('logkafkaEnabled:')).toHaveLength(2);
      expect(screen.getAllByText('displaySizeEnabled:')).toHaveLength(2);
      expect(screen.getAllByText('activeOffsetCacheEnabled:')).toHaveLength(2);
      expect(screen.getByText('# display name for the cluster')).toBeInTheDocument();
      expect(screen.getByText('name:')).toBeInTheDocument();
      expect(screen.getAllByText('# curator framework settings for zookeeper')).toHaveLength(2);
      expect(screen.getAllByText('curatorConfig:')).toHaveLength(2);
      expect(screen.getAllByText('zkMaxRetry:')).toHaveLength(2);
      expect(screen.getAllByText('100')).toHaveLength(8);
      expect(screen.getAllByText('maxSleepTimeMs:')).toHaveLength(2);
      expect(screen.getAllByText('1000')).toHaveLength(4);
      expect(screen.getAllByText('baseSleepTimeMs:')).toHaveLength(2);
      expect(screen.getByText('# zookeeper connection string')).toBeInTheDocument();
      expect(screen.getByText('zkConnect:')).toBeInTheDocument();
      expect(screen.getByText('# common config for all declared clusters')).toBeInTheDocument();
      expect(screen.getAllByText('curatorConfig:')).toHaveLength(2);
      expect(screen.getByText('# ingress configuration')).toBeInTheDocument();
      expect(screen.getByText('ingress:')).toBeInTheDocument();
      expect(screen.getByText('# use TLS secret')).toBeInTheDocument();
      expect(screen.getByText('tls:')).toBeInTheDocument();
      expect(screen.getByText('# Secret name to attach to the ingress object')).toBeInTheDocument();
      expect(screen.getByText('secret:')).toBeInTheDocument();
      expect(screen.getByText('# ingress host')).toBeInTheDocument();
      expect(screen.getByText('host:')).toBeInTheDocument();
      expect(screen.getByText('# ingress path')).toBeInTheDocument();
      expect(screen.getByText('path:')).toBeInTheDocument();
      expect(screen.getByText('# optional ingress labels')).toBeInTheDocument();
      expect(screen.getByText('labels:')).toBeInTheDocument();
      expect(screen.getByText('# optional ingress annotations')).toBeInTheDocument();
      expect(screen.getByText('annotations:')).toBeInTheDocument();
      expect(screen.getByText('# reconciliation job config')).toBeInTheDocument();
      expect(screen.getByText('reconcile:')).toBeInTheDocument();
      expect(screen.getByText('# cron expression for periodic reconciliation')).toBeInTheDocument();
      expect(screen.getByText('schedule:')).toBeInTheDocument();
      expect(screen.getAllByText('"*/3 * * * *"')).toHaveLength(2);
      expect(screen.getByText('# allow overwrite Zookeeper settings of CMAK')).toBeInTheDocument();
      expect(screen.getByText('overwriteZk:')).toBeInTheDocument();
      expect(screen.getByText('# number of failed jobs to keep')).toBeInTheDocument();
      expect(screen.getByText('failedJobsHistoryLimit:')).toBeInTheDocument();
      expect(screen.getByText('# number of completed jobs to keep')).toBeInTheDocument();
      expect(screen.getByText('successfulJobsHistoryLimit:')).toBeInTheDocument();
      expect(screen.getByText('# docker registry for all images of the chart')).toBeInTheDocument();
      expect(screen.getByText('imageRegistry:')).toBeInTheDocument();
      expect(screen.getAllByText('docker.io')).toHaveLength(2);
      expect(screen.getAllByText('Required')).toHaveLength(18);
      expect(screen.getAllByText('object')).toHaveLength(21);
      expect(screen.getAllByText('array')).toHaveLength(2);
      expect(screen.getByText('[string]')).toBeInTheDocument();
      expect(screen.getAllByText('boolean')).toHaveLength(17);
      expect(screen.getAllByText('integer')).toHaveLength(8);
      expect(screen.getAllByRole('combobox', { name: 'Type selection' })).toHaveLength(8);
    });

    // core-dump-handler
    it('resolve JSON schema with refs - first level', async () => {
      const mockValuesSchema = getMockValuesSchema('11');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      render(
        <Router>
          <ValuesSchema {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: /Open values schema modal/ });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
        expect(API.getValuesSchema).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      expect(await screen.findByText('Values schema reference')).toBeInTheDocument();

      expect(screen.getByText('# CoreDumpValues')).toBeInTheDocument();
      expect(screen.getByText('# Image')).toBeInTheDocument();
      expect(screen.getByText('image:')).toBeInTheDocument();
      expect(screen.getByText('limit_cpu:')).toBeInTheDocument();
      expect(screen.getByText('limit_mem:')).toBeInTheDocument();
      expect(screen.getByText('pullPolicy:')).toBeInTheDocument();
      expect(screen.getByText('repository:')).toBeInTheDocument();
      expect(screen.getByText('request_cpu:')).toBeInTheDocument();
      expect(screen.getByText('request_mem:')).toBeInTheDocument();
      expect(screen.getByText('storage:')).toBeInTheDocument();
      expect(screen.getAllByText('# Affinity')).toHaveLength(3);
      expect(screen.getByText('affinity:')).toBeInTheDocument();
      expect(screen.getByText('# Daemonset')).toBeInTheDocument();
      expect(screen.getByText('daemonset:')).toBeInTheDocument();
      expect(screen.getAllByText('name:')).toHaveLength(4);
      expect(screen.getByText('label:')).toBeInTheDocument();
      expect(screen.getByText('vendor:')).toBeInTheDocument();
      expect(screen.getByText('interval:')).toBeInTheDocument();
      expect(screen.getByText('s3Region:')).toBeInTheDocument();
      expect(screen.getByText('s3Secret:')).toBeInTheDocument();
      expect(screen.getByText('s3AccessKey:')).toBeInTheDocument();
      expect(screen.getByText('extraEnvVars:')).toBeInTheDocument();
      expect(screen.getByText('s3BucketName:')).toBeInTheDocument();
      expect(screen.getByText('suidDumpable:')).toBeInTheDocument();
      expect(screen.getByText('hostDirectory:')).toBeInTheDocument();
      expect(screen.getByText('includeCrioExe:')).toBeInTheDocument();
      expect(screen.getByText('DeployCrioConfig:')).toBeInTheDocument();
      expect(screen.getByText('composerLogLevel:')).toBeInTheDocument();
      expect(screen.getByText('manageStoreSecret:')).toBeInTheDocument();
      expect(screen.getByText('composerIgnoreCrio:')).toBeInTheDocument();
      expect(screen.getByText('composerCrioImageCmd:')).toBeInTheDocument();
      expect(screen.getAllByText('# ClusterRole')).toHaveLength(2);
      expect(screen.getByText('clusterRole:')).toBeInTheDocument();
      expect(screen.getByText('tolerations:')).toBeInTheDocument();
      expect(screen.getByText('nameOverride:')).toBeInTheDocument();
      expect(screen.getByText('nodeSelector:')).toBeInTheDocument();
      expect(screen.getByText('replicaCount:')).toBeInTheDocument();
      expect(screen.getByText('storageClass:')).toBeInTheDocument();
      expect(screen.getByText('# ServiceAccount')).toBeInTheDocument();
      expect(screen.getByText('serviceAccount:')).toBeInTheDocument();
      expect(screen.getByText('create:')).toBeInTheDocument();
      expect(screen.getByText('fullnameOverride:')).toBeInTheDocument();
      expect(screen.getByText('imagePullSecrets:')).toBeInTheDocument();
      expect(screen.getByText('clusterRoleBinding:')).toBeInTheDocument();
    });

    it('closes modal when a new pkg is open', async () => {
      const mockValuesSchema = getMockValuesSchema('10');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      const { rerender } = render(
        <Router>
          <ValuesSchema {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: /Open values schema modal/ });
      await userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
      });

      rerender(
        <Router>
          <ValuesSchema {...defaultProps} packageId="id2" />
        </Router>
      );

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('when fails', async () => {
      mocked(API).getValuesSchema.mockRejectedValue({ kind: ErrorKind.Other });

      render(
        <Router>
          <ValuesSchema {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: /Open values schema modal/ });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred getting the values schema, please try again later.',
        });
      });

      await waitFor(() => {
        expect(mockUseNavigate).toHaveBeenCalledTimes(2);
        expect(mockUseNavigate).toHaveBeenLastCalledWith('', { replace: true, state: null });
      });
    });
  });
});
