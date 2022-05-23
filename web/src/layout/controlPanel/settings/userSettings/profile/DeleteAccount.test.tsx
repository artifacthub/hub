import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../../../../api';
import { AppCtx } from '../../../../../context/AppCtx';
import { ErrorKind } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import DeleteAccount from './DeleteAccount';

jest.mock('../../../../../api');
jest.mock('../../../../../utils/alertDispatcher');

jest.mock('../../../../../utils/authorizer', () => ({
  check: () => {
    return true;
  },
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

const mockDispatch = jest.fn();
const mockOnAuthError = jest.fn();

const defaultProps = {
  onAuthError: mockOnAuthError,
};

describe('DeleteAccount', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <DeleteAccount {...defaultProps} />
      </AppCtx.Provider>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <DeleteAccount {...defaultProps} />
        </AppCtx.Provider>
      );

      expect(
        screen.getByText(
          'Deleting your account will also delete all the content that belongs to it (repositories, subscriptions, webhooks, etc), as well as all organizations where you are the only member.'
        )
      ).toBeInTheDocument();
      expect(screen.getAllByText('Delete account')).toHaveLength(3);
      expect(screen.getByRole('button', { name: 'Open deletion account modal' })).toBeInTheDocument();
    });

    it('opens and closes modal', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <DeleteAccount {...defaultProps} />
        </AppCtx.Provider>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).not.toHaveClass('d-block');

      const btn = screen.getByRole('button', { name: 'Open deletion account modal' });
      await userEvent.click(btn);

      expect(
        await screen.findByText(
          'If you delete your account all repositories belonging to it will be deleted. Please consider transferring them to another user.'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'All information related to the repositories will be permanently deleted as well. This includes packages, stars, users subscriptions, webhooks, events and notifications. Some of this information was created by users and will be lost. In addition to that, all organizations where you are the only member and all content belonging to those organizations will be removed as well.'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('This operation cannot be undone')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(modal).toHaveClass('d-block');

      expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
      const cancelBtn = screen.getByText('Cancel');
      await userEvent.click(cancelBtn);

      expect(await screen.findByRole('dialog')).not.toHaveClass('d-block');
    });

    describe('calls registerDeleteUserCode', () => {
      it('on success', async () => {
        mocked(API).registerDeleteUserCode.mockResolvedValue(null);

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <DeleteAccount {...defaultProps} />
          </AppCtx.Provider>
        );

        const modal = screen.getByRole('dialog');
        expect(modal).not.toHaveClass('d-block');

        const btn = screen.getByRole('button', { name: 'Open deletion account modal' });
        await userEvent.click(btn);

        expect(await screen.findByRole('dialog')).toHaveClass('d-block');

        const txt = screen.getByTestId('confirmationText');
        expect(txt).toHaveTextContent('Please type test to confirm:');

        const deleteBtn = screen.getByRole('button', { name: 'Delete account' });
        expect(deleteBtn).toBeDisabled();

        const input = screen.getByRole('textbox');
        await userEvent.type(input, 'test');

        expect(await screen.findByRole('button', { name: 'Delete account' })).toBeEnabled();
        await userEvent.click(deleteBtn);

        await waitFor(() => {
          expect(API.registerDeleteUserCode).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByText("We've just sent you a confirmation email")).toBeInTheDocument();
        expect(screen.getByText('is only valid for 15 minutes')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Please click on the link that has just been sent to your email account to delete your account and complete the process.'
          )
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            /If you haven't clicked the link by then you'll need to start the process from the beginning/
          )
        ).toBeInTheDocument();
      });

      it('clean modal after success', async () => {
        mocked(API).registerDeleteUserCode.mockResolvedValue(null);

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <DeleteAccount {...defaultProps} />
          </AppCtx.Provider>
        );

        const modal = screen.getByRole('dialog');
        expect(modal).not.toHaveClass('d-block');

        const btn = screen.getByRole('button', { name: 'Open deletion account modal' });
        await userEvent.click(btn);

        expect(await screen.findByRole('dialog')).toHaveClass('d-block');

        const txt = screen.getByTestId('confirmationText');
        expect(txt).toHaveTextContent('Please type test to confirm:');

        const deleteBtn = screen.getByRole('button', { name: 'Delete account' });
        expect(deleteBtn).toBeDisabled();

        const input = screen.getByRole('textbox');
        await userEvent.type(input, 'test');

        expect(await screen.findByRole('button', { name: 'Delete account' })).toBeEnabled();
        await userEvent.click(deleteBtn);

        await waitFor(() => {
          expect(API.registerDeleteUserCode).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(screen.queryByRole('button', { name: 'Delete account' })).toBeNull();
        });
        expect(await screen.findByText("We've just sent you a confirmation email")).toBeInTheDocument();
        expect(screen.getByText('is only valid for 15 minutes')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Please click on the link that has just been sent to your email account to delete your account and complete the process.'
          )
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            /If you haven't clicked the link by then you'll need to start the process from the beginning/
          )
        ).toBeInTheDocument();

        await userEvent.click(screen.getByText('Close'));

        await userEvent.click(btn);

        expect(await screen.findByRole('dialog')).toHaveClass('d-block');
        expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
      });

      describe('on error', () => {
        it('displays error', async () => {
          mocked(API).registerDeleteUserCode.mockRejectedValue({
            kind: ErrorKind.Other,
          });

          render(
            <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
              <DeleteAccount {...defaultProps} />
            </AppCtx.Provider>
          );

          const btn = screen.getByRole('button', { name: 'Open deletion account modal' });
          await userEvent.click(btn);

          expect(await screen.findByRole('dialog')).toHaveClass('d-block');

          const deleteBtn = screen.getByRole('button', { name: 'Delete account' });

          const input = screen.getByRole('textbox');
          await userEvent.type(input, 'test');

          expect(await screen.findByRole('button', { name: 'Delete account' })).toBeEnabled();
          await userEvent.click(deleteBtn);

          await waitFor(() => {
            expect(API.registerDeleteUserCode).toHaveBeenCalledTimes(1);
          });

          await waitFor(() => {
            expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
            expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
              type: 'danger',
              message: 'An error occurred deleting your account, please try again later.',
            });
          });
        });

        it('calls onAuthError', async () => {
          mocked(API).registerDeleteUserCode.mockRejectedValue({
            kind: ErrorKind.Unauthorized,
          });

          render(
            <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
              <DeleteAccount {...defaultProps} />
            </AppCtx.Provider>
          );

          const btn = screen.getByRole('button', { name: 'Open deletion account modal' });
          await userEvent.click(btn);

          expect(await screen.findByRole('dialog')).toHaveClass('d-block');

          const deleteBtn = screen.getByRole('button', { name: 'Delete account' });

          const input = screen.getByRole('textbox');
          await userEvent.type(input, 'test');

          expect(await screen.findByRole('button', { name: 'Delete account' })).toBeEnabled();
          await userEvent.click(deleteBtn);

          await waitFor(() => {
            expect(API.registerDeleteUserCode).toHaveBeenCalledTimes(1);
          });

          await waitFor(() => {
            expect(mockOnAuthError).toHaveBeenCalledTimes(1);
          });
        });
      });
    });
  });
});
