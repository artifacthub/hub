import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { formatDistanceToNow, fromUnixTime, getUnixTime } from 'date-fns';
import { vi } from 'vitest';

import { AppCtx } from '../../../context/AppCtx';
import { Repository } from '../../../types';
import Card from './Card';
vi.mock('../../../api');
vi.mock('../../../utils/alertDispatcher');
vi.mock('../../../utils/minutesToNearestInterval', () => () => 3);
vi.mock('./TransferModal', () => () => <div>Transfer repository</div>);

const mockUseNavigate = jest.fn();

vi.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

const repoMock: Repository = {
  kind: 0,
  name: 'repoTest',
  displayName: 'Repo test',
  url: 'http://test.repo',
  userAlias: 'user',
  verifiedPublisher: false,
  official: false,
};

const setModalStatusMock = jest.fn();
const onAuthErrorMock = jest.fn();

const defaultProps = {
  repository: repoMock,
  visibleTrackingErrorLogs: false,
  setModalStatus: setModalStatusMock,
  onSuccess: jest.fn(),
  onAuthError: onAuthErrorMock,
};

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

describe('Repository Card - packages section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Card {...defaultProps} />
      </AppCtx.Provider>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      expect(screen.getByText(repoMock.displayName!)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open badge modal' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open update repository modal' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open transfer repository modal' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open delete repository modal' })).toBeInTheDocument();
      expect(screen.getByText(repoMock.url!)).toBeInTheDocument();
      expect(
        screen.getByText('Not processed yet, it will be processed automatically in ~ 3 minutes')
      ).toBeInTheDocument();
    });

    it('renders component with last tracking and scanning info', () => {
      const now = getUnixTime(new Date());
      const props = {
        ...defaultProps,
        repository: {
          ...repoMock,
          lastTrackingTs: now,
          lastTrackingErrors: 'errors tracking',
          lastScanningTs: now,
          lastScanningErrors: 'errors scanning',
        },
      };
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...props} />
        </AppCtx.Provider>
      );

      const relativeTime = formatDistanceToNow(fromUnixTime(now), { addSuffix: true });
      expect(screen.getAllByText(relativeTime)).toHaveLength(2);
      expect(screen.getByText('Show tracking errors log')).toBeInTheDocument();
      expect(screen.getByText('Show scanning errors log')).toBeInTheDocument();
    });

    it('renders verified publisher badge', () => {
      const props = {
        ...defaultProps,
        repository: {
          ...repoMock,
          verifiedPublisher: true,
        },
      };
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...props} />
        </AppCtx.Provider>
      );

      expect(screen.getByTestId('Verified publisher badge')).toBeInTheDocument();
    });

    it('renders deletion modal when delete button in dropdown is clicked', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const btn = screen.getByRole('button', { name: 'Open delete repository modal' });
      await userEvent.click(btn);

      expect(await screen.findByRole('button', { name: 'Delete repository' })).toBeInTheDocument();
    });

    it('opens Get Badge Modal when Get badge button is clicked', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const btn = screen.getByRole('button', { name: 'Open badge modal' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      expect(await screen.findByTestId('badgeModalContent')).toBeInTheDocument();
    });

    it('calls setModalStatus when Edit button is clicked', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const btn = screen.getByRole('button', { name: 'Open update repository modal' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => expect(setModalStatusMock).toHaveBeenCalledTimes(1));
      expect(setModalStatusMock).toHaveBeenCalledWith({
        open: true,
        repository: repoMock,
      });
    });

    it('opens Transfer Repo when Transfer button is clicked', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const btn = screen.getByRole('button', { name: 'Open transfer repository modal' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      expect(await screen.findByText('Transfer repository')).toBeInTheDocument();
    });

    it('opens logs modal when visibleModal is tracking and repo has errors', () => {
      const props = {
        ...defaultProps,
        repository: {
          ...repoMock,
          lastTrackingTs: getUnixTime(new Date()),
          lastTrackingErrors: 'errors tracking',
        },
        visibleModal: 'tracking',
      };

      const component = (
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...props} />
        </AppCtx.Provider>
      );
      const { rerender } = render(component);
      expect(screen.getByText('Show tracking errors log')).toBeInTheDocument();

      rerender(component);

      expect(mockUseNavigate).toHaveBeenCalledTimes(1);
      expect(mockUseNavigate).toHaveBeenCalledWith('', { replace: true });
    });

    it('opens logs modal when visibleModal is scanning and repo has errors', () => {
      const props = {
        ...defaultProps,
        repository: {
          ...repoMock,
          lastTrackingTs: getUnixTime(new Date()),
          lastScanningTs: getUnixTime(new Date()),
          lastScanningErrors: 'errors scanning',
        },
        visibleModal: 'scanning',
      };

      const component = (
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...props} />
        </AppCtx.Provider>
      );
      const { rerender } = render(component);
      expect(screen.getByText('Show scanning errors log')).toBeInTheDocument();

      rerender(component);

      expect(mockUseNavigate).toHaveBeenCalledTimes(1);
      expect(mockUseNavigate).toHaveBeenCalledWith('', { replace: true });
    });

    it('opens empty errors modal with default message when visibleModal is tracking and repo has not errors', () => {
      const props = {
        ...defaultProps,
        repository: {
          ...repoMock,
          lastTrackingTs: getUnixTime(new Date()),
        },
        visibleModal: 'tracking',
      };
      const component = (
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...props} />
        </AppCtx.Provider>
      );
      const { rerender } = render(component);
      expect(screen.queryByText('Show tracking errors log')).toBeNull();

      rerender(component);

      expect(
        screen.getByText(/It looks like the last tracking of this repository worked fine and no errors were produced./)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /If you have arrived to this screen from an email listing some errors, please keep in mind those may have been already solved./
        )
      ).toBeInTheDocument();

      expect(mockUseNavigate).toHaveBeenCalledTimes(1);
      expect(mockUseNavigate).toHaveBeenCalledWith('', { replace: true });
    });

    it('opens empty errors modal with default message when visibleModal is scanning and repo has not errors', () => {
      const props = {
        ...defaultProps,
        repository: {
          ...repoMock,
          lastTrackingTs: getUnixTime(new Date()),
          lastScanningTs: getUnixTime(new Date()),
        },
        visibleModal: 'scanning',
      };
      const component = (
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...props} />
        </AppCtx.Provider>
      );
      const { rerender } = render(component);
      expect(screen.queryByText('Show scanning errors log')).toBeNull();

      rerender(component);

      expect(
        screen.getByText(
          /It looks like the last security vulnerabilities scan of this repository worked fine and no errors were produced./
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /If you have arrived to this screen from an email listing some errors, please keep in mind those may have been already solved./
        )
      ).toBeInTheDocument();

      expect(mockUseNavigate).toHaveBeenCalledTimes(1);
      expect(mockUseNavigate).toHaveBeenCalledWith('', { replace: true });
    });
  });
});
