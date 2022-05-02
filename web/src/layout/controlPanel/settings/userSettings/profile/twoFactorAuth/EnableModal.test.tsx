import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../../../../../api';
import { ErrorKind, TwoFactorAuth } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import EnableTwoFactorAuthenticationModal from './EnableModal';
jest.mock('../../../../../../api');

jest.mock('../../../../../../utils/alertDispatcher');

const scrollIntoViewMock = jest.fn();
window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const setUpMock: TwoFactorAuth = {
  qrCode:
    'data:image/png;base64,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',
  recoveryCodes: [
    '77cbfe85-5dfe-4b68-aef5-08d5a82a4f1b',
    'd376c32a-ad20-4684-a650-5c57c01f0414',
    '5d578e67-a26f-4db9-aedb-8585c94ec64a',
    '9434ebe3-d1ec-4d2d-ae21-9654668da86f',
    '7eccaf87-4a44-47fc-9eed-edf13957f86b',
    'fd4dc87d-9eff-4209-b911-4297af8f579c',
    '7af5a6c2-f279-4d0c-975d-77751b04ad8d',
    'c91dfdaf-e71b-443d-bbd4-64ff1a5b7da0',
    'f5deef41-437a-4af9-9d56-668160b84a5a',
    'bda4cd56-0228-4997-8735-25d0a857bd1e',
  ],
  secret: 'LWJBZNIVVDN4RGNIKVNBKRKFXNCOPOIKJUHBNHKHVH',
};

const onAuthErrorMock = jest.fn();
const onChangeMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
  onChange: onChangeMock,
};

describe('EnableModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<EnableTwoFactorAuthenticationModal {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<EnableTwoFactorAuthenticationModal {...defaultProps} />);

      expect(screen.getByText('Enable two-factor authentication')).toBeInTheDocument();
    });

    it('opens modal', async () => {
      mocked(API).setUpTFA.mockResolvedValue(setUpMock);
      mocked(API).enableTFA.mockResolvedValue(null);

      render(<EnableTwoFactorAuthenticationModal {...defaultProps} />);

      const btn = screen.getByRole('button', { name: 'Open modal' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.setUpTFA).toHaveBeenCalledTimes(1);
      });

      // Step 1
      expect(await screen.findByText('Recovery codes')).toBeInTheDocument();
      expect(screen.getByText('Please treat them as passwords and store them safely')).toBeInTheDocument();
      expect(screen.getByText('77cbfe85-5dfe-4b68-aef5-08d5a82a4f1b')).toBeInTheDocument();
      expect(
        screen.getByText(
          'We strongly recommend you to download and print your recovery codes before proceeding with the 2FA setup.'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();

      await userEvent.click(screen.getByText('Next'));

      // Step 2
      expect(await screen.findByText('Authentication app')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Please scan the image below with your 2FA authentication app. If you can't scan it, you can use/
        )
      ).toBeInTheDocument();
      expect(screen.getByText('this text code')).toBeInTheDocument();
      expect(screen.getByAltText('QR code')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Please enter one of the codes from the 2FA authentication app to confirm your account has been setup successfully before completing the process.'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      const passcodeInput = screen.getByRole('textbox');
      expect(passcodeInput).toBeInTheDocument();

      await userEvent.type(passcodeInput, '77cbfe85-5dfe-4b68-aef5-08d5a82a4f1b');
      await userEvent.click(screen.getByText('Enable'));

      await waitFor(() => {
        expect(API.enableTFA).toHaveBeenCalledTimes(1);
        expect(API.enableTFA).toHaveBeenCalledWith('77cbfe85-5dfe-4b68-aef5-08d5a82a4f1b');
      });

      // Step 3
      expect(
        await screen.findByText(
          /Two-factor authentication has been successfully enabled. We recommend you to sign out and back in to your account./
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  describe('on error', () => {
    describe('when setUpTFA call fails', () => {
      it('default error', async () => {
        mocked(API).setUpTFA.mockRejectedValue({ kind: ErrorKind.Other });

        render(<EnableTwoFactorAuthenticationModal {...defaultProps} />);

        const btn = screen.getByRole('button', { name: 'Open modal' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.setUpTFA).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message: 'An error occurred turning on two-factor authentication, please try again later.',
          });
        });
      });

      it('custom error', async () => {
        mocked(API).setUpTFA.mockRejectedValue({ kind: ErrorKind.Other, message: 'custom error' });

        render(<EnableTwoFactorAuthenticationModal {...defaultProps} />);

        const btn = screen.getByRole('button', { name: 'Open modal' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.setUpTFA).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message: 'An error occurred turning on two-factor authentication: custom error',
          });
        });
      });

      it('unauthorized', async () => {
        mocked(API).setUpTFA.mockRejectedValue({ kind: ErrorKind.Unauthorized });

        render(<EnableTwoFactorAuthenticationModal {...defaultProps} />);

        const btn = screen.getByRole('button', { name: 'Open modal' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.setUpTFA).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('when enableTFA fails', () => {
      it('default error', async () => {
        mocked(API).setUpTFA.mockResolvedValue(setUpMock);
        mocked(API).enableTFA.mockRejectedValue({ kind: ErrorKind.Other });

        render(<EnableTwoFactorAuthenticationModal {...defaultProps} />);

        const btn = screen.getByRole('button', { name: 'Open modal' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.setUpTFA).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByText('Recovery codes')).toBeInTheDocument();
        await userEvent.click(screen.getByText('Next'));

        expect(await screen.findByText('Authentication app')).toBeInTheDocument();

        const passcodeInput = screen.getByRole('textbox');
        await userEvent.type(passcodeInput, '77cbfe85-5dfe-4b68-aef5-08d5a82a4f1b');
        await userEvent.click(screen.getByText('Enable'));

        await waitFor(() => {
          expect(API.enableTFA).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalledTimes(1));
        expect(
          await screen.findByText('An error occurred turning on two-factor authentication, please try again later.')
        ).toBeInTheDocument();
      });

      it('custom error', async () => {
        mocked(API).setUpTFA.mockResolvedValue(setUpMock);
        mocked(API).enableTFA.mockRejectedValue({ kind: ErrorKind.Other, message: 'custom error' });

        render(<EnableTwoFactorAuthenticationModal {...defaultProps} />);

        const btn = screen.getByRole('button', { name: 'Open modal' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.setUpTFA).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByText('Recovery codes')).toBeInTheDocument();
        await userEvent.click(screen.getByText('Next'));

        expect(await screen.findByText('Authentication app')).toBeInTheDocument();

        const passcodeInput = screen.getByRole('textbox');
        await userEvent.type(passcodeInput, '77cbfe85-5dfe-4b68-aef5-08d5a82a4f1b');
        await userEvent.click(screen.getByText('Enable'));

        await waitFor(() => {
          expect(API.enableTFA).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalledTimes(1));
        expect(
          await screen.findByText('An error occurred turning on two-factor authentication: custom error')
        ).toBeInTheDocument();
      });

      it('unauthorized', async () => {
        mocked(API).setUpTFA.mockResolvedValue(setUpMock);
        mocked(API).enableTFA.mockRejectedValue({ kind: ErrorKind.Unauthorized });

        render(<EnableTwoFactorAuthenticationModal {...defaultProps} />);

        const btn = screen.getByRole('button', { name: 'Open modal' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.setUpTFA).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByText('Recovery codes')).toBeInTheDocument();
        await userEvent.click(screen.getByText('Next'));

        expect(await screen.findByText('Authentication app')).toBeInTheDocument();

        const passcodeInput = screen.getByRole('textbox');
        await userEvent.type(passcodeInput, '77cbfe85-5dfe-4b68-aef5-08d5a82a4f1b');
        await userEvent.click(screen.getByText('Enable'));

        await waitFor(() => {
          expect(API.enableTFA).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => expect(onAuthErrorMock).toHaveBeenCalledTimes(1));
      });
    });
  });
});
