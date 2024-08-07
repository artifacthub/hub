import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind } from '../../../types';
import Repository from './index';
jest.mock('../../../api');
jest.mock('../../../utils/minutesToNearestInterval', () => () => 3);

const getMockRepository = (fixtureId: string) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/index/${fixtureId}.json`);
};

const onAuthErrorMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
  visibleModal: null,
  activePage: null,
};

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com', passwordSet: true },
  prefs: {
    controlPanel: {},
    search: { limit: 60 },
    theme: {
      configured: 'light',
      effective: 'light',
    },
    notifications: {
      lastDisplayedTime: null,
      enabled: true,
      displayed: [],
    },
  },
};

describe('Repository index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockRepository = getMockRepository('1');
    mocked(API).searchRepositories.mockResolvedValue(mockRepository);

    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <Repository {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.searchRepositories).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole('button', { name: 'Refresh repositories list' })).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockRepository = getMockRepository('2');
      mocked(API).searchRepositories.mockResolvedValue(mockRepository);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <Repository {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.searchRepositories).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByRole('button', { name: 'Refresh repositories list' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open claim repository modal' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open add repository modal' })).toBeInTheDocument();
    });

    it('displays no data component when no repositories', async () => {
      const mockRepository = getMockRepository('4');
      mocked(API).searchRepositories.mockResolvedValue(mockRepository);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <Repository {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      expect(await screen.findByRole('alert')).toBeInTheDocument();

      expect(screen.getByText('Add your first repository!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open add first repository modal' })).toBeInTheDocument();
    });

    it('renders list with 3 repositories', async () => {
      const mockRepository = getMockRepository('5');
      mocked(API).searchRepositories.mockResolvedValue(mockRepository);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <Repository {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('repoList')).toBeInTheDocument();
      });
      expect(screen.getAllByTestId('repoCard')).toHaveLength(3);
    });

    it('calls getRepositories to click Refresh button', async () => {
      const mockRepository = getMockRepository('6');
      mocked(API).searchRepositories.mockResolvedValue(mockRepository);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <Repository {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const refreshBtn = await screen.findByRole('button', { name: 'Refresh repositories list' });
      expect(refreshBtn).toBeInTheDocument();
      await userEvent.click(refreshBtn);

      await waitFor(() => expect(API.searchRepositories).toHaveBeenCalledTimes(2));
    });

    it('calls unselectOrg when repo name is defined and is not into repositories list', async () => {
      const dispatchMock = jest.fn();
      const mockRepository = getMockRepository('7');
      mocked(API).searchRepositories.mockResolvedValue(mockRepository);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: dispatchMock }}>
          <Router>
            <Repository {...defaultProps} repoName="repo" />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(dispatchMock).toHaveBeenCalledTimes(1);
      });
    });

    it('loads first page when not repositories in a different one', async () => {
      const mockRepository = getMockRepository('8');

      mocked(API).searchRepositories.mockResolvedValue(mockRepository).mockResolvedValueOnce({
        items: [],
        paginationTotalCount: '3',
      });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <Repository {...defaultProps} activePage="2" />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.searchRepositories).toHaveBeenCalledTimes(2);
        expect(API.searchRepositories).toHaveBeenCalledWith({ limit: 10, offset: 10, filters: { user: ['test'] } });
        expect(API.searchRepositories).toHaveBeenLastCalledWith({ limit: 10, offset: 0, filters: { user: ['test'] } });
      });
    });
  });

  describe('when searchRepositories fails', () => {
    it('on UnauthorizedError', async () => {
      mocked(API).searchRepositories.mockRejectedValue({
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
        expect(API.searchRepositories).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });
    });

    it('on error different to UnauthorizedError', async () => {
      mocked(API).searchRepositories.mockRejectedValue({ kind: ErrorKind.Other });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <Repository {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.searchRepositories).toHaveBeenCalledTimes(1);
      });

      const noData = await screen.findByRole('alert');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(/An error occurred getting the repositories, please try again later./i);
    });
  });
});
