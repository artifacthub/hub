import { render, screen, waitFor } from '@testing-library/react';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../api';
import { AppCtx } from '../../context/AppCtx';
import { ErrorKind } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import AccountDeletion from './AccountDeletion';
jest.mock('../../api');
jest.mock('../../utils/alertDispatcher');

const mockCtx = {
  user: { alias: 'userAlias', email: 'jsmith@email.com', passwordSet: false },
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

describe('AccountDeletion', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    mocked(API).deleteUser.mockResolvedValue(null);

    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <AccountDeletion code="123" />
        </Router>
      </AppCtx.Provider>
    );

    expect(asFragment()).toMatchSnapshot();
    await waitFor(() => {
      expect(API.deleteUser).toHaveBeenCalledTimes(1);
    });

    expect(
      await screen.findByText(
        "You account has been successfully deleted. We're sorry to see you go, but you are always welcome back."
      )
    ).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      mocked(API).deleteUser.mockResolvedValue(null);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <AccountDeletion code="123" />
          </Router>
        </AppCtx.Provider>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('We are deleting your account...')).toBeInTheDocument();

      await waitFor(() => {
        expect(API.deleteUser).toHaveBeenCalledTimes(1);
        expect(API.deleteUser).toHaveBeenCalledWith('123');
      });

      expect(
        await screen.findByText(
          "You account has been successfully deleted. We're sorry to see you go, but you are always welcome back."
        )
      ).toBeInTheDocument();
    });

    it('when deleteUser fails', async () => {
      mocked(API).deleteUser.mockRejectedValue({
        kind: ErrorKind.Gone,
      });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <AccountDeletion code="123" />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.deleteUser).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('Sorry, the code provided is not valid.')).toBeInTheDocument();
    });
  });

  describe('does not render', () => {
    it('when code is undefined', () => {
      const { container } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <AccountDeletion />
          </Router>
        </AppCtx.Provider>
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('when user is undefined', () => {
      const { container } = render(
        <AppCtx.Provider value={{ ctx: { ...mockCtx, user: null }, dispatch: jest.fn() }}>
          <Router>
            <AccountDeletion code="123" />
          </Router>
        </AppCtx.Provider>
      );

      expect(container).toBeEmptyDOMElement();

      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
        type: 'warning',
        message: 'Please log in to complete your account deletion process.',
      });
    });
  });
});
