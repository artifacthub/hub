import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, Repository as Repo } from '../../../types';
import Repository from './index';
jest.mock('../../../api');

const getMockRepository = (fixtureId: string): Repo[] => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as Repo[];
};

const onAuthErrorMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
};

const mockHistoryReplace = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    replace: mockHistoryReplace,
  }),
}));

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com' },
  prefs: {
    controlPanel: {},
    search: { limit: 25 },
    theme: {
      configured: 'light',
      automatic: false,
    },
  },
};

describe('Repository index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockRepository = getMockRepository('1');
    mocked(API).getRepositories.mockResolvedValue(mockRepository);

    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <Repository {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockRepository = getMockRepository('2');
      mocked(API).getRepositories.mockResolvedValue(mockRepository);

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <Repository {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getRepositories).toHaveBeenCalledTimes(1);
      });

      expect(getByTestId('refreshRepoBtn')).toBeInTheDocument();
      expect(getByTestId('claimRepoBtn')).toBeInTheDocument();
      expect(getByTestId('addRepoBtn')).toBeInTheDocument();
    });

    it('displays no data component when no repositories', async () => {
      const mockRepository = getMockRepository('4');
      mocked(API).getRepositories.mockResolvedValue(mockRepository);

      const { getByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <Repository {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const noData = await waitFor(() => getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(getByText('Add your first repository!')).toBeInTheDocument();
      expect(getByTestId('addFirstRepoBtn')).toBeInTheDocument();

      await waitFor(() => {});
    });

    it('renders list with 3 repositories', async () => {
      const mockRepository = getMockRepository('5');
      mocked(API).getRepositories.mockResolvedValue(mockRepository);

      const { getByTestId, getAllByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <Repository {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const list = await waitFor(() => getByTestId('repoList'));

      expect(list).toBeInTheDocument();
      expect(getAllByTestId('repoCard')).toHaveLength(3);

      await waitFor(() => {});
    });

    it('calls getRepositories to click Refresh button', async () => {
      const mockRepository = getMockRepository('6');
      mocked(API).getRepositories.mockResolvedValue(mockRepository);

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <Repository {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const refreshBtn = await waitFor(() => getByTestId('refreshRepoBtn'));
      expect(refreshBtn).toBeInTheDocument();
      fireEvent.click(refreshBtn);
      expect(API.getRepositories).toHaveBeenCalledTimes(2);

      await waitFor(() => {});
    });

    it('calls history replace when repo name is defined and is not into repositories list', async () => {
      const mockRepository = getMockRepository('7');
      mocked(API).getRepositories.mockResolvedValue(mockRepository);

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <Repository {...defaultProps} repoName="repo" />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => getByTestId('repoList'));
      expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
      expect(mockHistoryReplace).toHaveBeenCalledWith({ search: '' });

      await waitFor(() => {});
    });
  });

  describe('when getRepositories fails', () => {
    it('on UnauthorizedError', async () => {
      mocked(API).getRepositories.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <Repository {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getRepositories).toHaveBeenCalledTimes(1);
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });

    it('on error different to UnauthorizedError', async () => {
      mocked(API).getRepositories.mockRejectedValue({ kind: ErrorKind.Other });

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <Repository {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getRepositories).toHaveBeenCalledTimes(1);
      });

      const noData = getByTestId('noData');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(/An error occurred getting the repositories, please try again later./i);
    });
  });
});
