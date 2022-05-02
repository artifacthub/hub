import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../../../../../api';
import { ErrorKind } from '../../../../../../types';
import DisableTwoFactorAuthenticationModal from './DisableModal';
jest.mock('../../../../../../api');

const scrollIntoViewMock = jest.fn();
window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const onAuthErrorMock = jest.fn();
const onChangeMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
  onChange: onChangeMock,
};

describe('DisableModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<DisableTwoFactorAuthenticationModal {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<DisableTwoFactorAuthenticationModal {...defaultProps} />);

      expect(screen.getByText('Disable two-factor authentication')).toBeInTheDocument();
    });

    it('opens modal', async () => {
      mocked(API).disableTFA.mockResolvedValue(null);

      render(<DisableTwoFactorAuthenticationModal {...defaultProps} />);

      const btn = screen.getByRole('button', { name: 'Open disable two-factor authentication modal' });
      await userEvent.click(btn);

      expect(await screen.findByText('Disable')).toBeInTheDocument();
      expect(
        screen.getByText(
          'To disable two-factor authentication for your account please enter one of the codes from the 2FA authentication app or one of your recovery codes.'
        )
      ).toBeInTheDocument();

      const passcodeInput = screen.getByRole('textbox');
      expect(passcodeInput).toBeInTheDocument();

      await userEvent.type(passcodeInput, '77cbfe85-5dfe-4b68-aef5-08d5a82a4f1b');
      await userEvent.click(screen.getByText('Disable'));

      await waitFor(() => {
        expect(API.disableTFA).toHaveBeenCalledTimes(1);
        expect(API.disableTFA).toHaveBeenCalledWith('77cbfe85-5dfe-4b68-aef5-08d5a82a4f1b');
      });

      await waitFor(() => {
        expect(onChangeMock).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('on error', () => {
    describe('when disableTFA fails', () => {
      it('default error', async () => {
        mocked(API).disableTFA.mockRejectedValue({ kind: ErrorKind.Other });

        render(<DisableTwoFactorAuthenticationModal {...defaultProps} />);

        const btn = screen.getByRole('button', { name: 'Open disable two-factor authentication modal' });
        await userEvent.click(btn);

        const passcodeInput = screen.getByRole('textbox');
        await userEvent.type(passcodeInput, '77cbfe85-5dfe-4b68-aef5-08d5a82a4f1b');
        await userEvent.click(screen.getByText('Disable'));

        await waitFor(() => {
          expect(API.disableTFA).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        });
        expect(
          await screen.findByText('An error occurred turning off two-factor authentication, please try again later.')
        ).toBeInTheDocument();
      });

      it('custom error', async () => {
        mocked(API).disableTFA.mockRejectedValue({ kind: ErrorKind.Other, message: 'custom error' });

        render(<DisableTwoFactorAuthenticationModal {...defaultProps} />);

        const btn = screen.getByRole('button', { name: 'Open disable two-factor authentication modal' });
        await userEvent.click(btn);

        const passcodeInput = screen.getByRole('textbox');
        await userEvent.type(passcodeInput, '77cbfe85-5dfe-4b68-aef5-08d5a82a4f1b');
        await userEvent.click(screen.getByRole('button', { name: 'Disable two-factor authentication' }));

        await waitFor(() => {
          expect(API.disableTFA).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        });
        expect(
          await screen.findByText('An error occurred turning off two-factor authentication, please try again later.')
        ).toBeInTheDocument();
      });

      it('unauthorized', async () => {
        mocked(API).disableTFA.mockRejectedValue({ kind: ErrorKind.Unauthorized });

        render(<DisableTwoFactorAuthenticationModal {...defaultProps} />);

        const btn = screen.getByRole('button', { name: 'Open disable two-factor authentication modal' });
        await userEvent.click(btn);

        const passcodeInput = screen.getByRole('textbox');
        await userEvent.type(passcodeInput, '77cbfe85-5dfe-4b68-aef5-08d5a82a4f1b');
        await userEvent.click(screen.getByRole('button', { name: 'Disable two-factor authentication' }));

        await waitFor(() => {
          expect(API.disableTFA).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
        });
      });
    });
  });
});
