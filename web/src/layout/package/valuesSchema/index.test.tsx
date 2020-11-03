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
    });

    expect(result.asFragment()).toMatchSnapshot();
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
  });
});
