import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../../../../api';
import { ErrorKind } from '../../../../../types';
import APIKeysSection from './index';
jest.mock('../../../../../api');
jest.mock('moment', () => ({
  ...(jest.requireActual('moment') as object),
  format: () => '2020/06/18 16:35:39 (+00:00)',
}));

const getMockAPIKeys = (fixtureId: string) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/index/${fixtureId}.json`);
};

const onAuthErrorMock = jest.fn();

const defaultProps = {
  activePage: null,
  onAuthError: onAuthErrorMock,
};

describe('API keys section index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockAPIKeys = getMockAPIKeys('1');
    mocked(API).getAPIKeys.mockResolvedValue(mockAPIKeys);

    const { asFragment } = render(
      <Router>
        <APIKeysSection {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.getAPIKeys).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findAllByTestId('APIKeyCard')).toHaveLength(2);
    expect(asFragment()).toMatchSnapshot();
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

      expect(await screen.findAllByTestId('APIKeyCard')).toHaveLength(2);
    });

    it('displays no data component when no API keys', async () => {
      const mockAPIKeys = getMockAPIKeys('3');
      mocked(API).getAPIKeys.mockResolvedValue(mockAPIKeys);

      render(
        <Router>
          <APIKeysSection {...defaultProps} />
        </Router>
      );

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Add your first API key!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open API key modal to add the first one' })).toBeInTheDocument();
    });

    it('renders API form form when add first API key button is clicked', async () => {
      const mockAPIKeys = getMockAPIKeys('4');
      mocked(API).getAPIKeys.mockResolvedValue(mockAPIKeys);

      render(
        <Router>
          <APIKeysSection {...defaultProps} />
        </Router>
      );

      expect(await screen.findByRole('alert')).toBeInTheDocument();

      expect(screen.queryByText('Name')).toBeNull();

      const addBtn = await screen.findByRole('button', { name: 'Open API key modal to add the first one' });
      await userEvent.click(addBtn);
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('renders API key form when add API key button is clicked', async () => {
      const mockAPIKeys = getMockAPIKeys('5');
      mocked(API).getAPIKeys.mockResolvedValue(mockAPIKeys);

      render(
        <Router>
          <APIKeysSection {...defaultProps} />
        </Router>
      );

      expect(await screen.findByRole('alert')).toBeInTheDocument();

      expect(screen.queryByText('Name')).toBeNull();

      const addBtn = await screen.findByRole('button', { name: 'Open modal to add API key' });
      await userEvent.click(addBtn);
      expect(screen.queryByText('Name')).toBeInTheDocument();
    });
  });

  it('renders 2 API key cards', async () => {
    const mockAPIKeys = getMockAPIKeys('6');
    mocked(API).getAPIKeys.mockResolvedValue(mockAPIKeys);

    render(
      <Router>
        <APIKeysSection {...defaultProps} />
      </Router>
    );

    expect(await screen.findAllByTestId('APIKeyCard')).toHaveLength(2);
  });

  it('loads first page when not api Keys in a different one', async () => {
    const mockAPIKeys = getMockAPIKeys('6');

    mocked(API).getAPIKeys.mockResolvedValue(mockAPIKeys).mockResolvedValueOnce({
      items: [],
      paginationTotalCount: '2',
    });

    render(
      <Router>
        <APIKeysSection {...defaultProps} activePage="2" />
      </Router>
    );

    await waitFor(() => {
      expect(API.getAPIKeys).toHaveBeenCalledTimes(2);
      expect(API.getAPIKeys).toHaveBeenCalledWith({ limit: 10, offset: 10 });
      expect(API.getAPIKeys).toHaveBeenLastCalledWith({ limit: 10, offset: 0 });
    });
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

      await waitFor(() => expect(onAuthErrorMock).toHaveBeenCalledTimes(1));
    });

    it('rest API errors - displays generic error message', async () => {
      mocked(API).getAPIKeys.mockRejectedValue({ kind: ErrorKind.Other, message: 'error' });

      render(
        <Router>
          <APIKeysSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => expect(API.getAPIKeys).toHaveBeenCalledTimes(1));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/An error occurred getting your API keys, please try again later./i)).toBeInTheDocument();
    });
  });
});
