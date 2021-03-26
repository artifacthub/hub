import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../../../api';
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
  user: { alias: 'test', email: 'test@test.com' },
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
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <DeleteOrg {...defaultProps} />
      </AppCtx.Provider>
    );
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <DeleteOrg {...defaultProps} />
        </AppCtx.Provider>
      );

      expect(getByTestId('deleteModalOrgBtn')).toBeInTheDocument();
    });

    it('opens and closes modal', async () => {
      const { getByTestId, getByText, getByRole } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <DeleteOrg {...defaultProps} />
        </AppCtx.Provider>
      );

      const modal = getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).not.toHaveClass('d-block');

      const btn = getByTestId('deleteModalOrgBtn');
      fireEvent.click(btn);

      expect(getByTestId('deleteOrgBtn')).toBeInTheDocument();
      expect(getByText('Cancel')).toBeInTheDocument();
      expect(modal).toHaveClass('d-block');

      expect(getByTestId('deleteOrgBtn')).toBeInTheDocument();
      const cancelBtn = getByText('Cancel');
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(modal).not.toHaveClass('d-block');
      });
    });

    describe('calls deleteOrganization', () => {
      it('on success', async () => {
        mocked(API).deleteOrganization.mockResolvedValue(null);

        const { getByTestId, getByText, getByRole } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
            <DeleteOrg {...defaultProps} />
          </AppCtx.Provider>
        );

        const modal = getByRole('dialog');
        expect(modal).not.toHaveClass('d-block');

        const btn = getByTestId('deleteModalOrgBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(modal).toHaveClass('d-block');
        });

        const txt = getByTestId('confirmationText');
        expect(txt).toHaveTextContent('Please type orgTest to confirm:');

        const deleteBtn = getByTestId('deleteOrgBtn');
        expect(deleteBtn).toBeDisabled();

        const input = getByTestId('orgNameInput');
        fireEvent.change(input, { target: { value: 'orgTest' } });

        await waitFor(() => {
          expect(deleteBtn).toBeEnabled();
        });
        fireEvent.click(deleteBtn);

        expect(getByText('Deleting...')).toBeInTheDocument();

        await waitFor(() => {
          expect(API.deleteOrganization).toHaveBeenCalledTimes(1);
          expect(API.deleteOrganization).toHaveBeenCalledWith('orgTest');
        });

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'unselectOrg' });
      });

      describe('on error', () => {
        it('displays generic error', async () => {
          mocked(API).deleteOrganization.mockRejectedValue({
            kind: ErrorKind.Other,
          });

          const { getByTestId, getByRole } = render(
            <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
              <DeleteOrg {...defaultProps} />
            </AppCtx.Provider>
          );

          const modal = getByRole('dialog');

          const btn = getByTestId('deleteModalOrgBtn');
          fireEvent.click(btn);

          await waitFor(() => {
            expect(modal).toHaveClass('d-block');
          });

          const deleteBtn = getByTestId('deleteOrgBtn');

          const input = getByTestId('orgNameInput');
          fireEvent.change(input, { target: { value: 'orgTest' } });

          await waitFor(() => {
            expect(deleteBtn).toBeEnabled();
          });
          fireEvent.click(deleteBtn);

          await waitFor(() => {
            expect(API.deleteOrganization).toHaveBeenCalledTimes(1);
          });

          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message: 'An error occurred deleting the organization, please try again later.',
          });
        });

        it('displays permissions error', async () => {
          mocked(API).deleteOrganization.mockRejectedValue({
            kind: ErrorKind.Forbidden,
          });

          const { getByTestId, getByRole } = render(
            <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
              <DeleteOrg {...defaultProps} />
            </AppCtx.Provider>
          );

          const modal = getByRole('dialog');

          const btn = getByTestId('deleteModalOrgBtn');
          fireEvent.click(btn);

          await waitFor(() => {
            expect(modal).toHaveClass('d-block');
          });

          const deleteBtn = getByTestId('deleteOrgBtn');

          const input = getByTestId('orgNameInput');
          fireEvent.change(input, { target: { value: 'orgTest' } });

          await waitFor(() => {
            expect(deleteBtn).toBeEnabled();
          });
          fireEvent.click(deleteBtn);

          await waitFor(() => {
            expect(API.deleteOrganization).toHaveBeenCalledTimes(1);
          });

          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message: 'You do not have permissions to delete the organization.',
          });
        });

        it('calls onAuthError', async () => {
          mocked(API).deleteOrganization.mockRejectedValue({
            kind: ErrorKind.Unauthorized,
          });

          const { getByTestId, getByRole } = render(
            <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
              <DeleteOrg {...defaultProps} />
            </AppCtx.Provider>
          );

          const modal = getByRole('dialog');

          const btn = getByTestId('deleteModalOrgBtn');
          fireEvent.click(btn);

          await waitFor(() => {
            expect(modal).toHaveClass('d-block');
          });

          const deleteBtn = getByTestId('deleteOrgBtn');

          const input = getByTestId('orgNameInput');
          fireEvent.change(input, { target: { value: 'orgTest' } });

          await waitFor(() => {
            expect(deleteBtn).toBeEnabled();
          });
          fireEvent.click(deleteBtn);

          await waitFor(() => {
            expect(API.deleteOrganization).toHaveBeenCalledTimes(1);
          });

          expect(mockOnAuthError).toHaveBeenCalledTimes(1);
        });
      });
    });
  });
});
