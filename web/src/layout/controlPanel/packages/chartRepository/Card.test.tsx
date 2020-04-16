import { fireEvent, render, waitFor } from '@testing-library/react';
import moment from 'moment';
import React from 'react';

import { API } from '../../../../api';
import { ChartRepository } from '../../../../types';
import Card from './Card';
jest.mock('../../../../api');

const chartRepoMock: ChartRepository = {
  name: 'repoTest',
  displayName: 'Repo test',
  url: 'http://test.repo',
  lastTrackingTs: null,
};

const setModalStatusMock = jest.fn();

const defaultProps = {
  chartRepository: chartRepoMock,
  setModalStatus: setModalStatusMock,
  onSuccess: jest.fn(),
  onAuthError: jest.fn(),
};

describe('Chart Repository Card - packages section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<Card {...defaultProps} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByTestId } = render(<Card {...defaultProps} />);

      expect(getByText(chartRepoMock.displayName!)).toBeInTheDocument();
      expect(getByTestId('updateChartRepoBtn')).toBeInTheDocument();
      expect(getByTestId('deleteChartRepoDropdownBtn')).toBeInTheDocument();
      expect(getByText(chartRepoMock.url!)).toBeInTheDocument();
      expect(getByText('Not processed yet, it will be processed automatically in less than 30m')).toBeInTheDocument();
    });

    it('renders component with last tracking info', () => {
      const props = {
        ...defaultProps,
        chartRepository: {
          ...chartRepoMock,
          lastTrackingTs: moment().unix(),
          lastTrackingErrors: 'errors tracking',
        },
      };
      const { getByText } = render(<Card {...props} />);

      expect(getByText('a few seconds ago')).toBeInTheDocument();
      expect(getByText('Show errors log')).toBeInTheDocument();
    });

    it('calls delete chart repo when delete chart button in dropdown is clicked', async () => {
      const { getByTestId } = render(<Card {...defaultProps} />);

      const dropdownBtn = getByTestId('deleteChartRepoDropdownBtn');
      expect(dropdownBtn).toBeInTheDocument();
      fireEvent.click(dropdownBtn);

      const btn = getByTestId('deleteChartRepoBtn');
      fireEvent.click(btn);

      await waitFor(() => {});

      expect(API.deleteChartRepository).toHaveBeenCalledTimes(1);
    });

    it('calls setModalStatus when Edit button is clicked', () => {
      const { getByTestId } = render(<Card {...defaultProps} />);

      const btn = getByTestId('updateChartRepoBtn');
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn);
      expect(setModalStatusMock).toHaveBeenCalledTimes(1);
      expect(setModalStatusMock).toHaveBeenCalledWith({
        open: true,
        chartRepository: chartRepoMock,
      });
    });
  });
});
