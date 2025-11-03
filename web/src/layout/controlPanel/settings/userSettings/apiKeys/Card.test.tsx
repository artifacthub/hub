import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import API from '../../../../../api';
import { APIKey, ErrorKind } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import Card from './Card';
import { vi } from 'vitest';
vi.mock('../../../../../api');
vi.mock('../../../../../utils/alertDispatcher');
vi.mock('moment', async () => {
  const actual = await vi.importActual<typeof import('moment')>('moment');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    unix: () => ({
      format: () => '2020/06/18 16:35:39 (+00:00)',
    }),
  };
});

const APIKeyMock: APIKey = {
  apiKeyId: 'bf28013f-610e-4691-80a2-bd3a673c4b3f',
  name: 'key1',
  createdAt: 1592498139,
};

const setModalStatusMock = jest.fn();
const onAuthErrorMock = jest.fn();

const defaultProps = {
  apiKey: APIKeyMock,
  setModalStatus: setModalStatusMock,
  onSuccess: jest.fn(),
  onAuthError: onAuthErrorMock,
};

describe('API key Card - API keys section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<Card {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<Card {...defaultProps} />);

      expect(screen.getByTestId('APIKeyCard')).toBeInTheDocument();
      expect(screen.getByText(APIKeyMock.name!)).toBeInTheDocument();
      expect(screen.getByText('Created at:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open API key modal' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open deletion modal' })).toBeInTheDocument();
    });

    it('calls deleteAPIKey when leave button in dropdown is clicked', async () => {
      render(<Card {...defaultProps} />);

      const modalBtn = screen.getByRole('button', { name: 'Open deletion modal' });
      expect(modalBtn).toBeInTheDocument();
      await userEvent.click(modalBtn);

      expect(screen.getByText('Are you sure you want to remove this API key?')).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: 'Delete API key' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteAPIKey).toHaveBeenCalledTimes(1);
      });
    });

    it('calls setModalStatusMock when Edit button is clicked', async () => {
      render(<Card {...defaultProps} />);

      const btn = screen.getByRole('button', { name: 'Open API key modal' });
      expect(btn).toBeInTheDocument();

      await userEvent.click(btn);

      await waitFor(() => {
        expect(setModalStatusMock).toHaveBeenCalledTimes(1);
        expect(setModalStatusMock).toHaveBeenCalledWith({
          open: true,
          apiKey: APIKeyMock,
        });
      });
    });
  });

  describe('on deleteAPIKey error', () => {
    it('displays generic error', async () => {
      vi.mocked(API).deleteAPIKey.mockRejectedValue({
        kind: ErrorKind.Other,
      });
      render(<Card {...defaultProps} />);

      const modalBtn = screen.getByRole('button', { name: 'Open deletion modal' });
      expect(modalBtn).toBeInTheDocument();
      await userEvent.click(modalBtn);

      const btn = screen.getByRole('button', { name: 'Delete API key' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteAPIKey).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred deleting the API key, please try again later.',
        });
      });
    });

    it('calls onAuthError', async () => {
      vi.mocked(API).deleteAPIKey.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });
      render(<Card {...defaultProps} />);

      const modalBtn = screen.getByRole('button', { name: 'Open deletion modal' });
      expect(modalBtn).toBeInTheDocument();
      await userEvent.click(modalBtn);

      const btn = screen.getByRole('button', { name: 'Delete API key' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteAPIKey).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
