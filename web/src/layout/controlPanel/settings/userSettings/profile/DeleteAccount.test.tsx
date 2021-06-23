import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { mocked } from 'ts-jest/utils';

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
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <DeleteAccount {...defaultProps} />
      </AppCtx.Provider>
    );
    expect(result.asFragment()).toMatchSnapshot();
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
      expect(screen.getByTestId('deleteModalAccountBtn')).toBeInTheDocument();
    });

    it('opens and closes modal', async () => {
      const { getByTestId, getByText, getByRole } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <DeleteAccount {...defaultProps} />
        </AppCtx.Provider>
      );

      const modal = getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).not.toHaveClass('d-block');

      const btn = getByTestId('deleteModalAccountBtn');
      userEvent.click(btn);

      expect(
        getByText(
          'If you delete your account all repositories belonging to it will be deleted. Please consider transferring them to another user.'
        )
      ).toBeInTheDocument();
      expect(
        getByText(
          'All information related to the repositories will be permanently deleted as well. This includes packages, stars, users subscriptions, webhooks, events and notifications. Some of this information was created by users and will be lost. In addition to that, all organizations where you are the only member and all content belonging to those organizations will be removed as well.'
        )
      ).toBeInTheDocument();
      expect(getByText('This operation cannot be undone')).toBeInTheDocument();
      expect(getByTestId('deleteAccountBtn')).toBeInTheDocument();
      expect(getByText('Cancel')).toBeInTheDocument();
      expect(modal).toHaveClass('d-block');

      expect(getByTestId('deleteAccountBtn')).toBeInTheDocument();
      const cancelBtn = getByText('Cancel');
      userEvent.click(cancelBtn);

      await waitFor(() => {
        expect(modal).not.toHaveClass('d-block');
      });
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

        const btn = screen.getByTestId('deleteModalAccountBtn');
        userEvent.click(btn);

        await waitFor(() => {
          expect(modal).toHaveClass('d-block');
        });

        const txt = screen.getByTestId('confirmationText');
        expect(txt).toHaveTextContent('Please type test to confirm:');

        const deleteBtn = screen.getByTestId('deleteAccountBtn');
        expect(deleteBtn).toBeDisabled();

        const input = screen.getByTestId('aliasInput');
        userEvent.type(input, 'test');

        await waitFor(() => {
          expect(deleteBtn).toBeEnabled();
        });
        userEvent.click(deleteBtn);

        expect(screen.getByText('Deleting...')).toBeInTheDocument();

        await waitFor(() => {
          expect(API.registerDeleteUserCode).toHaveBeenCalledTimes(1);
        });

        expect(screen.getByText("We've just sent you a confirmation email")).toBeInTheDocument();
        expect(screen.getByText('is only valid for 15 minures')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Please click on the link that has just been sent to your email account to delete your account and complete the process.'
          )
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            /If you haven't clicked the link by then you'll need to start the process from the beginning/g
          )
        ).toBeInTheDocument();
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

          const modal = screen.getByRole('dialog');

          const btn = screen.getByTestId('deleteModalAccountBtn');
          userEvent.click(btn);

          await waitFor(() => {
            expect(modal).toHaveClass('d-block');
          });

          const deleteBtn = screen.getByTestId('deleteAccountBtn');

          const input = screen.getByTestId('aliasInput');
          userEvent.type(input, 'test');

          await waitFor(() => {
            expect(deleteBtn).toBeEnabled();
          });
          userEvent.click(deleteBtn);

          await waitFor(() => {
            expect(API.registerDeleteUserCode).toHaveBeenCalledTimes(1);
          });

          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message: 'An error occurred deleting your account, please try again later.',
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

          const modal = screen.getByRole('dialog');

          const btn = screen.getByTestId('deleteModalAccountBtn');
          userEvent.click(btn);

          await waitFor(() => {
            expect(modal).toHaveClass('d-block');
          });

          const deleteBtn = screen.getByTestId('deleteAccountBtn');

          const input = screen.getByTestId('aliasInput');
          userEvent.type(input, 'test');

          await waitFor(() => {
            expect(deleteBtn).toBeEnabled();
          });
          userEvent.click(deleteBtn);

          await waitFor(() => {
            expect(API.registerDeleteUserCode).toHaveBeenCalledTimes(1);
          });

          expect(mockOnAuthError).toHaveBeenCalledTimes(1);
        });
      });
    });
  });
});
