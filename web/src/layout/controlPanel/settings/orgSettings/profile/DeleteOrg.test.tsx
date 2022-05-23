import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../../../../api';
import { AppCtx } from '../../../../../context/AppCtx';
import { ErrorKind } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import DeleteOrg from './DeleteOrg';

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
    controlPanel: { selectedOrg: 'orgTest' },
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
  organization: {
    name: 'orgTest',
    displayName: 'Test',
    description: 'Lorem ipsum...',
    homeUrl: 'https://test.org',
    logoImageId: 'f0552fa9-e03d-47cf-90cd-b9b0b6ba19e2',
  },
};

describe('DeleteOrg', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <DeleteOrg {...defaultProps} />
      </AppCtx.Provider>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <DeleteOrg {...defaultProps} />
        </AppCtx.Provider>
      );

      expect(screen.getByRole('button', { name: 'Open delete organization modal' })).toBeInTheDocument();
    });

    it('opens and closes modal', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <DeleteOrg {...defaultProps} />
        </AppCtx.Provider>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).not.toHaveClass('d-block');

      const btn = screen.getByRole('button', { name: 'Open delete organization modal' });
      await userEvent.click(btn);

      expect(await screen.findByRole('button', { name: 'Delete organization' })).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(modal).toHaveClass('d-block');

      const cancelBtn = await screen.findByText('Cancel');
      await userEvent.click(cancelBtn);

      expect(await screen.findByRole('dialog')).not.toHaveClass('d-block');
    });

    describe('calls deleteOrganization', () => {
      it('on success', async () => {
        mocked(API).deleteOrganization.mockResolvedValue(null);

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
            <DeleteOrg {...defaultProps} />
          </AppCtx.Provider>
        );

        const modal = screen.getByRole('dialog');
        expect(modal).not.toHaveClass('d-block');

        const btn = screen.getByRole('button', { name: 'Open delete organization modal' });
        await userEvent.click(btn);

        expect(await screen.findByRole('dialog')).toHaveClass('d-block');

        const txt = await screen.findByTestId('confirmationText');
        expect(txt).toHaveTextContent('Please type orgTest to confirm:');

        const deleteBtn = screen.getByRole('button', { name: 'Delete organization' });
        expect(deleteBtn).toBeDisabled();

        const input = screen.getByRole('textbox');
        await userEvent.type(input, 'orgTest');

        expect(await screen.findByRole('button', { name: 'Delete organization' })).toBeEnabled();
        await userEvent.click(screen.getByRole('button', { name: 'Delete organization' }));

        await waitFor(() => {
          expect(API.deleteOrganization).toHaveBeenCalledTimes(1);
          expect(API.deleteOrganization).toHaveBeenCalledWith('orgTest');
        });

        await waitFor(() => {
          expect(mockDispatch).toHaveBeenCalledTimes(1);
          expect(mockDispatch).toHaveBeenCalledWith({ type: 'unselectOrg' });
        });
      });

      describe('on error', () => {
        it('displays generic error', async () => {
          mocked(API).deleteOrganization.mockRejectedValue({
            kind: ErrorKind.Other,
          });

          render(
            <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
              <DeleteOrg {...defaultProps} />
            </AppCtx.Provider>
          );

          const btn = screen.getByRole('button', { name: 'Open delete organization modal' });
          await userEvent.click(btn);

          expect(await screen.getByRole('dialog')).toHaveClass('d-block');

          const input = screen.getByRole('textbox');
          await userEvent.type(input, 'orgTest');

          expect(await screen.findByRole('button', { name: 'Delete organization' })).toBeEnabled();
          await userEvent.click(screen.getByRole('button', { name: 'Delete organization' }));

          await waitFor(() => {
            expect(API.deleteOrganization).toHaveBeenCalledTimes(1);
          });

          await waitFor(() => {
            expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
            expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
              type: 'danger',
              message: 'An error occurred deleting the organization, please try again later.',
            });
          });
        });

        it('displays permissions error', async () => {
          mocked(API).deleteOrganization.mockRejectedValue({
            kind: ErrorKind.Forbidden,
          });

          render(
            <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
              <DeleteOrg {...defaultProps} />
            </AppCtx.Provider>
          );

          const btn = screen.getByRole('button', { name: 'Open delete organization modal' });
          await userEvent.click(btn);

          expect(await screen.findByRole('dialog')).toHaveClass('d-block');

          const input = screen.getByRole('textbox');
          await userEvent.type(input, 'orgTest');

          expect(await screen.getByRole('button', { name: 'Delete organization' })).toBeEnabled();
          await userEvent.click(screen.getByRole('button', { name: 'Delete organization' }));

          await waitFor(() => {
            expect(API.deleteOrganization).toHaveBeenCalledTimes(1);
          });

          await waitFor(() => {
            expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
            expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
              type: 'danger',
              message: 'You do not have permissions to delete the organization.',
            });
          });
        });

        it('calls onAuthError', async () => {
          mocked(API).deleteOrganization.mockRejectedValue({
            kind: ErrorKind.Unauthorized,
          });

          render(
            <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
              <DeleteOrg {...defaultProps} />
            </AppCtx.Provider>
          );

          const btn = screen.getByRole('button', { name: 'Open delete organization modal' });
          await userEvent.click(btn);

          expect(await screen.findByRole('dialog')).toHaveClass('d-block');

          const input = screen.getByRole('textbox');
          await userEvent.type(input, 'orgTest');

          expect(await screen.findByRole('button', { name: 'Delete organization' })).toBeEnabled();
          await userEvent.click(screen.getByRole('button', { name: 'Delete organization' }));

          await waitFor(() => {
            expect(API.deleteOrganization).toHaveBeenCalledTimes(1);
          });

          await waitFor(() => {
            expect(mockOnAuthError).toHaveBeenCalledTimes(1);
          });
        });
      });
    });
  });
});
