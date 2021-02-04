import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../../../api';
import { APIKey, ErrorKind } from '../../../../../types';
import APIKeysSection from './index';
jest.mock('../../../../../api');
jest.mock('moment', () => () => ({ format: () => '2020/06/18 16:35:39 (+00:00)' }));

const getMockAPIKeys = (fixtureId: string): APIKey[] => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as APIKey[];
};

const onAuthErrorMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
};

describe('API keys section index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockAPIKeys = getMockAPIKeys('1');
    mocked(API).getAPIKeys.mockResolvedValue(mockAPIKeys);

    const result = render(
      <Router>
        <APIKeysSection {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.getAPIKeys).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockAPIKeys = getMockAPIKeys('2');
      mocked(API).getAPIKeys.mockResolvedValue(mockAPIKeys);

      render(
        <Router>
          <APIKeysSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getAPIKeys).toHaveBeenCalledTimes(1);
      });
    });

    it('displays no data component when no API keys', async () => {
      const mockAPIKeys = getMockAPIKeys('3');
      mocked(API).getAPIKeys.mockResolvedValue(mockAPIKeys);

      const { getByTestId, getByText } = render(
        <Router>
          <APIKeysSection {...defaultProps} />
        </Router>
      );

      const noData = await waitFor(() => getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(getByText('Add your first API key!')).toBeInTheDocument();
      expect(getByTestId('addFirstAPIKeyBtn')).toBeInTheDocument();
    });

    it('renders API form form when add first API key button is clicked', async () => {
      const mockAPIKeys = getMockAPIKeys('4');
      mocked(API).getAPIKeys.mockResolvedValue(mockAPIKeys);

      const { getByTestId, queryByText } = render(
        <Router>
          <APIKeysSection {...defaultProps} />
        </Router>
      );

      const noData = await waitFor(() => getByTestId('noData'));
      expect(noData).toBeInTheDocument();

      expect(queryByText('Name')).toBeNull();

      const addBtn = getByTestId('addFirstAPIKeyBtn');
      fireEvent.click(addBtn);
      expect(queryByText('Name')).toBeInTheDocument();
    });

    it('renders API key form when add API key button is clicked', async () => {
      const mockAPIKeys = getMockAPIKeys('5');
      mocked(API).getAPIKeys.mockResolvedValue(mockAPIKeys);

      const { getByTestId, queryByText } = render(
        <Router>
          <APIKeysSection {...defaultProps} />
        </Router>
      );

      const noData = await waitFor(() => getByTestId('noData'));
      expect(noData).toBeInTheDocument();

      expect(queryByText('Name')).toBeNull();

      const addBtn = getByTestId('addAPIKeyBtn');
      fireEvent.click(addBtn);
      expect(queryByText('Name')).toBeInTheDocument();
    });
  });

  it('renders 2 API key cards', async () => {
    const mockAPIKeys = getMockAPIKeys('6');
    mocked(API).getAPIKeys.mockResolvedValue(mockAPIKeys);

    const { getAllByTestId } = render(
      <Router>
        <APIKeysSection {...defaultProps} />
      </Router>
    );

    const cards = await waitFor(() => getAllByTestId('APIKeyCard'));
    expect(cards).toHaveLength(2);
  });

  describe('on getAPIKeys error', () => {
    it('UnauthorizedError', async () => {
      mocked(API).getAPIKeys.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(
        <Router>
          <APIKeysSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => expect(API.getAPIKeys).toHaveBeenCalledTimes(1));

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });

    it('rest API errors - displays generic error message', async () => {
      mocked(API).getAPIKeys.mockRejectedValue({ kind: ErrorKind.Other, message: 'error' });

      const { getByTestId, getByText } = render(
        <Router>
          <APIKeysSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => expect(API.getAPIKeys).toHaveBeenCalledTimes(1));

      const noData = getByTestId('noData');
      expect(noData).toBeInTheDocument();
      expect(getByText(/An error occurred getting your API keys, please try again later./i)).toBeInTheDocument();
    });
  });
});
