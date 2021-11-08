import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import API from '../../../api';
import { ErrorKind } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import Values from './';
jest.mock('../../../api');
jest.mock('../../../utils/alertDispatcher');

const getMockValues = (fixtureId: string): string => {
  return require(`./__fixtures__/index/${fixtureId}.yaml`) as string;
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
  visibleValues: false,
  normalizedName: 'pkg',
};

describe('Values', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockValues = getMockValues('1');
    mocked(API).getChartValues.mockResolvedValue(mockValues);

    const { asFragment } = render(<Values {...defaultProps} visibleValues />);

    await waitFor(() => {
      expect(API.getChartValues).toHaveBeenCalledTimes(1);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockValues = getMockValues('2');
      mocked(API).getChartValues.mockResolvedValue(mockValues);

      render(<Values {...defaultProps} />);

      const btn = screen.getByRole('button', { name: /Open default values modal/ });
      expect(btn).toBeInTheDocument();
      userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(1);
        expect(API.getChartValues).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });
    });

    it('opens modal', async () => {
      const mockValues = getMockValues('3');
      mocked(API).getChartValues.mockResolvedValue(mockValues);

      render(<Values {...defaultProps} />);

      const btn = screen.getByRole('button', { name: /Open default values modal/ });
      userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(1);
        expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
        expect(mockHistoryReplace).toHaveBeenCalledWith({
          search: '?modal=values',
          state: {
            fromStarredPage: undefined,
            searchUrlReferer: undefined,
          },
        });
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getAllByText('Default values')).toHaveLength(2);
    });

    it('closes modal', async () => {
      const mockValues = getMockValues('4');
      mocked(API).getChartValues.mockResolvedValue(mockValues);

      render(<Values {...defaultProps} visibleValues />);

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      const close = screen.getByRole('button', { name: 'Close modal' });
      userEvent.click(close);

      expect(mockHistoryReplace).toHaveBeenCalledTimes(2);
      expect(mockHistoryReplace).toHaveBeenLastCalledWith({
        search: '',
        state: {
          fromStarredPage: undefined,
          searchUrlReferer: undefined,
        },
      });

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('calls again to getChartValues when version is different', async () => {
      const mockValues = getMockValues('5');
      mocked(API).getChartValues.mockResolvedValue(mockValues);

      const { rerender } = render(<Values {...defaultProps} />);

      const btn = screen.getByRole('button', { name: /Open default values modal/ });
      userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(1);
        expect(API.getChartValues).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      const close = screen.getByText('Close');
      userEvent.click(close);

      rerender(<Values {...defaultProps} version="1.0.0" />);

      userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(2);
        expect(API.getChartValues).toHaveBeenCalledWith(defaultProps.packageId, '1.0.0');
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('calls again to getChartValues when packageId is different', async () => {
      const mockValues = getMockValues('6');
      mocked(API).getChartValues.mockResolvedValue(mockValues);

      const { rerender } = render(<Values {...defaultProps} />);

      const btn = screen.getByRole('button', { name: /Open default values modal/ });
      userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(1);
        expect(API.getChartValues).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      const close = screen.getByText('Close');
      userEvent.click(close);

      rerender(<Values {...defaultProps} packageId="id2" />);

      userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(2);
        expect(API.getChartValues).toHaveBeenCalledWith('id2', defaultProps.version);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('closes modal when a new pkg is open', async () => {
      const mockValues = getMockValues('7');
      mocked(API).getChartValues.mockResolvedValue(mockValues);

      const { rerender } = render(<Values {...defaultProps} />);

      const btn = screen.getByRole('button', { name: /Open default values modal/ });
      userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(API.getChartValues).toHaveBeenCalledTimes(1);

      rerender(<Values {...defaultProps} packageId="id2" />);

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    describe('when fails', () => {
      it('on NotFound', async () => {
        mocked(API).getChartValues.mockRejectedValue({
          kind: ErrorKind.NotFound,
        });

        render(<Values {...defaultProps} />);

        const btn = screen.getByRole('button', { name: /Open default values modal/ });
        userEvent.click(btn);

        await waitFor(() => {
          expect(API.getChartValues).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message:
              'We could not find the default values for this chart version. Please check the chart tgz package as they might be missing.',
          });
        });
      });

      it('default error', async () => {
        mocked(API).getChartValues.mockRejectedValue({ kind: ErrorKind.Other });

        render(<Values {...defaultProps} />);

        const btn = screen.getByRole('button', { name: /Open default values modal/ });
        userEvent.click(btn);

        await waitFor(() => {
          expect(API.getChartValues).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message: 'An error occurred getting the default values, please try again later.',
          });
        });
      });
    });
  });
});
