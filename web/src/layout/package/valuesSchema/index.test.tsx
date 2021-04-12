import { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import ValuesSchema from './';
jest.mock('../../../api');

const getMockValuesSchema = (fixtureId: string): JSONSchema => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as JSONSchema;
};

const mockHistoryReplace = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    replace: mockHistoryReplace,
  }),
}));

const defaultProps = {
  packageId: 'id',
  version: '0.1.0',
  hasValuesSchema: true,
  visibleValuesSchema: false,
  normalizedName: 'pkg',
};

describe('ValuesSchema', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockValuesSchema = getMockValuesSchema('1');
    mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

    const result = render(<ValuesSchema {...defaultProps} visibleValuesSchema />);

    await waitFor(() => {
      expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockValuesSchema = getMockValuesSchema('2');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      const { getByTestId } = render(<ValuesSchema {...defaultProps} />);

      const btn = getByTestId('valuesSchemaBtn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
        expect(API.getValuesSchema).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });
    });

    it('renders disabled button when package has not ValuesSchema and does not call getValuesSchema', async () => {
      const { getByTestId } = render(<ValuesSchema {...defaultProps} hasValuesSchema={false} />);

      const btn = getByTestId('valuesSchemaBtn');
      expect(btn).toHaveClass('disabled');

      expect(API.getValuesSchema).toHaveBeenCalledTimes(0);
    });

    it('opens modal', async () => {
      const mockValuesSchema = getMockValuesSchema('3');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      const { getByTestId, getByText, getByRole } = render(<ValuesSchema {...defaultProps} />);

      const btn = getByTestId('valuesSchemaBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
        expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
        expect(mockHistoryReplace).toHaveBeenCalledWith({
          search: '?modal=values-schema',
          state: {
            fromStarredPage: undefined,
            searchUrlReferer: undefined,
          },
        });
      });

      expect(getByRole('dialog')).toBeInTheDocument();
      expect(getByText('Values schema reference')).toBeInTheDocument();
    });

    it('closes modal', async () => {
      const mockValuesSchema = getMockValuesSchema('4');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      const { getByText, queryByRole } = render(<ValuesSchema {...defaultProps} visibleValuesSchema />);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
      });

      const close = getByText('Close');
      fireEvent.click(close);

      waitFor(() => {
        expect(queryByRole('dialog')).toBeNull();
        expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
        expect(mockHistoryReplace).toHaveBeenCalledWith({
          search: '',
          state: {
            fromStarredPage: undefined,
            searchUrlReferer: undefined,
          },
        });
      });
    });

    it('calls again to getValuesSchema when version is different', async () => {
      const mockValuesSchema = getMockValuesSchema('5');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      const { rerender, getByText, getByTestId } = render(<ValuesSchema {...defaultProps} />);

      const btn = getByTestId('valuesSchemaBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
        expect(API.getValuesSchema).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      await waitFor(() => {
        expect(getByText('Values schema reference')).toBeInTheDocument();
      });

      const close = getByText('Close');
      fireEvent.click(close);

      rerender(<ValuesSchema {...defaultProps} version="1.0.0" />);

      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(2);
        expect(API.getValuesSchema).toHaveBeenCalledWith(defaultProps.packageId, '1.0.0');
      });

      await waitFor(() => {
        expect(getByText('Values schema reference')).toBeInTheDocument();
      });
    });

    it('calls again to getValuesSchema when packageId is different', async () => {
      const mockValuesSchema = getMockValuesSchema('6');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      const { rerender, getByText, getByTestId } = render(<ValuesSchema {...defaultProps} />);

      const btn = getByTestId('valuesSchemaBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
        expect(API.getValuesSchema).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      await waitFor(() => {
        expect(getByText('Values schema reference')).toBeInTheDocument();
      });

      const close = getByText('Close');
      fireEvent.click(close);

      rerender(<ValuesSchema {...defaultProps} packageId="id2" />);

      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(2);
        expect(API.getValuesSchema).toHaveBeenCalledWith('id2', defaultProps.version);
      });

      await waitFor(() => {
        expect(getByText('Values schema reference')).toBeInTheDocument();
      });
    });

    it('does not call again to getValuesSchema when package is the same', async () => {
      const mockValuesSchema = getMockValuesSchema('7');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      const { getByText, getByTestId, queryByRole } = render(<ValuesSchema {...defaultProps} />);

      const btn = getByTestId('valuesSchemaBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
        expect(API.getValuesSchema).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      await waitFor(() => {
        expect(getByText('Values schema reference')).toBeInTheDocument();
      });

      const close = getByText('Close');
      fireEvent.click(close);

      expect(queryByRole('dialog')).toBeNull();

      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(getByText('Values schema reference')).toBeInTheDocument();
      });
    });

    it('renders JSON schema with refs', async () => {
      const mockValuesSchema = getMockValuesSchema('8');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      const { getByText, getAllByText, getByTestId } = render(<ValuesSchema {...defaultProps} />);

      const btn = getByTestId('valuesSchemaBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
        expect(API.getValuesSchema).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      await waitFor(() => {
        expect(getByText('env:')).toBeInTheDocument();
      });

      expect(getByText('image:')).toBeInTheDocument();
      expect(getByText('array')).toBeInTheDocument();
      expect(getByText('(unique)')).toBeInTheDocument();
      expect(getAllByText(/\[\]/g)).toHaveLength(2);
    });

    it('renders complex full JSON', async () => {
      const mockValuesSchema = getMockValuesSchema('9');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      const { getByText, getAllByText, getByTestId, getAllByTestId } = render(<ValuesSchema {...defaultProps} />);

      const btn = getByTestId('valuesSchemaBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
        expect(API.getValuesSchema).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      await waitFor(() => {
        expect(getByText('Values schema reference')).toBeInTheDocument();
      });

      expect(getByText('# CMAK operator Helm values')).toBeInTheDocument();
      expect(getByText('# ui container k8s settings')).toBeInTheDocument();
      expect(getByText('ui:')).toBeInTheDocument();
      expect(getByText('# extra cmd line arguments')).toBeInTheDocument();
      expect(getByText('extraArgs:')).toBeInTheDocument();
      expect(getAllByText('[]')).toHaveLength(2);
      expect(getAllByText('# resource requests and limits')).toHaveLength(2);
      expect(getAllByText('resources:')).toHaveLength(2);
      expect(getAllByText('# resource limits')).toHaveLength(2);
      expect(getAllByText('limits:')).toHaveLength(2);
      expect(getAllByText('{}')).toHaveLength(14);
      expect(getAllByText('# resource requests')).toHaveLength(2);
      expect(getAllByText('requests:')).toHaveLength(2);
      expect(
        getByText('# provide key value base pairs for consumer properties according to java docs')
      ).toBeInTheDocument();
      expect(getByText('consumerProperties:')).toBeInTheDocument();
      expect(getByText('# Consumer SSL configuration')).toBeInTheDocument();
      expect(getByText('consumerPropertiesSsl:')).toBeInTheDocument();
      expect(getAllByText('null')).toHaveLength(26);
      expect(getByText('# keystore configuration')).toBeInTheDocument();
      expect(getByText('keystore:')).toBeInTheDocument();
      expect(getAllByText('type:')).toHaveLength(2);
      expect(getAllByText('value:')).toHaveLength(2);
      expect(getAllByText('password:')).toHaveLength(2);
      expect(getByText('# truststore configuration')).toBeInTheDocument();
      expect(getByText('truststore:')).toBeInTheDocument();
      expect(getByText('# zk container k8s settings')).toBeInTheDocument();
      expect(getByText('zk:')).toBeInTheDocument();
      expect(getByText('# zk version')).toBeInTheDocument();
      expect(getByText('version:')).toBeInTheDocument();
      expect(getAllByText('3.6.1')).toHaveLength(2);
      expect(getAllByText('# resource requests and limits')).toHaveLength(2);
      expect(getAllByText('resources:')).toHaveLength(2);
      expect(getByText('# cmak instance settings')).toBeInTheDocument();
      expect(getByText('cmak:')).toBeInTheDocument();
      expect(getAllByText('jmxSsl:')).toHaveLength(2);
      expect(getAllByText('false')).toHaveLength(20);
      expect(getAllByText('# either cluster enabled')).toHaveLength(2);
      expect(getAllByText('enabled:')).toHaveLength(2);
      expect(getAllByText('true')).toHaveLength(14);
      expect(getAllByText('jmxPass:')).toHaveLength(2);
      expect(getAllByText('jmxUser:')).toHaveLength(2);
      expect(getAllByText('jmxEnabled:')).toHaveLength(2);
      expect(getAllByText('kafkaVersion:')).toHaveLength(2);
      expect(getAllByText('2.2.0')).toHaveLength(4);
      expect(getAllByText('pollConsumers:')).toHaveLength(2);
      expect(getAllByText('filterConsumers:')).toHaveLength(2);
      expect(getAllByText('logkafkaEnabled:')).toHaveLength(2);
      expect(getAllByText('displaySizeEnabled:')).toHaveLength(2);
      expect(getAllByText('activeOffsetCacheEnabled:')).toHaveLength(2);
      expect(getByText('# display name for the cluster')).toBeInTheDocument();
      expect(getByText('name:')).toBeInTheDocument();
      expect(getAllByText('# curator framework settings for zookeeper')).toHaveLength(2);
      expect(getAllByText('curatorConfig:')).toHaveLength(2);
      expect(getAllByText('zkMaxRetry:')).toHaveLength(2);
      expect(getAllByText('100')).toHaveLength(8);
      expect(getAllByText('maxSleepTimeMs:')).toHaveLength(2);
      expect(getAllByText('1000')).toHaveLength(4);
      expect(getAllByText('baseSleepTimeMs:')).toHaveLength(2);
      expect(getByText('# zookeeper connection string')).toBeInTheDocument();
      expect(getByText('zkConnect:')).toBeInTheDocument();
      expect(getByText('# common config for all declared clusters')).toBeInTheDocument();
      expect(getAllByText('curatorConfig:')).toHaveLength(2);
      expect(getByText('# ingress configuration')).toBeInTheDocument();
      expect(getByText('ingress:')).toBeInTheDocument();
      expect(getByText('# use TLS secret')).toBeInTheDocument();
      expect(getByText('tls:')).toBeInTheDocument();
      expect(getByText('# Secret name to attach to the ingress object')).toBeInTheDocument();
      expect(getByText('secret:')).toBeInTheDocument();
      expect(getByText('# ingress host')).toBeInTheDocument();
      expect(getByText('host:')).toBeInTheDocument();
      expect(getByText('# ingress path')).toBeInTheDocument();
      expect(getByText('path:')).toBeInTheDocument();
      expect(getByText('# optional ingress labels')).toBeInTheDocument();
      expect(getByText('labels:')).toBeInTheDocument();
      expect(getByText('# optional ingress annotations')).toBeInTheDocument();
      expect(getByText('annotations:')).toBeInTheDocument();
      expect(getByText('# reconciliation job config')).toBeInTheDocument();
      expect(getByText('reconcile:')).toBeInTheDocument();
      expect(getByText('# cron expression for periodic reconciliation')).toBeInTheDocument();
      expect(getByText('schedule:')).toBeInTheDocument();
      expect(getAllByText('"*/3 * * * *"')).toHaveLength(2);
      expect(getByText('# allow overwrite Zookeeper settings of CMAK')).toBeInTheDocument();
      expect(getByText('overwriteZk:')).toBeInTheDocument();
      expect(getByText('# number of failed jobs to keep')).toBeInTheDocument();
      expect(getByText('failedJobsHistoryLimit:')).toBeInTheDocument();
      expect(getByText('# number of completed jobs to keep')).toBeInTheDocument();
      expect(getByText('successfulJobsHistoryLimit:')).toBeInTheDocument();
      expect(getByText('# docker registry for all images of the chart')).toBeInTheDocument();
      expect(getByText('imageRegistry:')).toBeInTheDocument();
      expect(getAllByText('docker.io')).toHaveLength(2);
      expect(getAllByText('Required')).toHaveLength(18);
      expect(getAllByText('object')).toHaveLength(21);
      expect(getAllByText('array')).toHaveLength(2);
      expect(getByText('[string]')).toBeInTheDocument();
      expect(getAllByText('boolean')).toHaveLength(17);
      expect(getAllByText('integer')).toHaveLength(8);
      expect(getAllByTestId('schemaCombSelect')).toHaveLength(8);
    });

    it('closes modal when a new pkg is open', async () => {
      const mockValuesSchema = getMockValuesSchema('10');
      mocked(API).getValuesSchema.mockResolvedValue(mockValuesSchema);

      const { getByRole, getByTestId, queryByRole, rerender } = render(<ValuesSchema {...defaultProps} />);

      const btn = getByTestId('valuesSchemaBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getValuesSchema).toHaveBeenCalledTimes(1);
        expect(getByRole('dialog')).toBeInTheDocument();
      });

      rerender(<ValuesSchema {...defaultProps} packageId="id2" />);

      waitFor(() => {
        expect(queryByRole('dialog')).toBeNull();
      });
    });
  });
});
