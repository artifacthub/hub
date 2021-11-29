import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'ts-jest/utils';

import API from '../../../../../api';
import { APIKey, ErrorKind } from '../../../../../types';
import Modal from './Modal';
jest.mock('../../../../../api');

const APIKeyMock: APIKey = {
  apiKeyId: 'bf28013f-610e-4691-80a2-bd3a673c4b3f',
  name: 'key1',
  createdAt: 1592498139,
};

const onSuccessMock = jest.fn();
const onAuthErrorMock = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  open: true,
  apiKey: undefined,
  onAuthError: onAuthErrorMock,
  onClose: jest.fn(),
  onSuccess: onSuccessMock,
};

describe('APIKeyModal - API keys section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<Modal {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component when API key is defined', () => {
      render(<Modal {...defaultProps} apiKey={APIKeyMock} />);

      expect(screen.getByTestId('apiKeyForm')).toBeInTheDocument();
      expect(screen.getByText('Update API key')).toBeInTheDocument();
      expect(screen.getByText('Update')).toBeInTheDocument();
    });

    it('renders component when API key is undefined', () => {
      render(<Modal {...defaultProps} />);

      expect(screen.getByTestId('apiKeyForm')).toBeInTheDocument();
      expect(screen.getByText('Add API key')).toBeInTheDocument();
      expect(screen.getByText('Add')).toBeInTheDocument();
    });
  });

  describe('Add API key', () => {
    it('calls add API key', async () => {
      mocked(API).addAPIKey.mockResolvedValue({
        secret: '1276576',
        apiKeyId: 'id',
      });
      render(<Modal {...defaultProps} />);

      expect(screen.getByText('Add API key')).toBeInTheDocument();
      expect(screen.getByText('Add')).toBeInTheDocument();
      userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'test');
      userEvent.click(screen.getByRole('button', { name: 'Add API key' }));

      await waitFor(() => {
        expect(API.addAPIKey).toHaveBeenCalledTimes(1);
        expect(API.addAPIKey).toHaveBeenCalledWith('test');
      });

      expect(onSuccessMock).toHaveBeenCalledTimes(1);

      expect(screen.getByText('API-KEY-ID')).toBeInTheDocument();
      expect(screen.getByText('API-KEY-SECRET')).toBeInTheDocument();
      expect(
        screen.getByText(
          /These are the credentials you will need to provide when making requests to the API. Please, copy and store them in a safe place./i
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText('You will not be able to see the secret again when you close this window.')
      ).toBeInTheDocument();
      expect(screen.getByText('Important:')).toBeInTheDocument();
      expect(screen.getByText(/the API key you've just generated can be used to perform/i)).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();

      const btns = screen.getAllByRole('button');
      expect(btns[3]).toHaveTextContent('API docs');
      expect(btns[3]).toHaveAttribute('href', '/docs/api');
    });

    it('displays default Api error', async () => {
      mocked(API).addAPIKey.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      const component = <Modal {...defaultProps} />;
      const { rerender } = render(component);

      userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'test2');
      userEvent.click(screen.getByRole('button', { name: 'Add API key' }));

      await waitFor(() => {
        expect(API.addAPIKey).toHaveBeenCalledTimes(1);
      });

      rerender(component);

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText('An error occurred adding the API key, please try again later.')).toBeInTheDocument();
    });

    it('calls onAuthError when error is UnauthorizedError', async () => {
      mocked(API).addAPIKey.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });
      render(<Modal {...defaultProps} />);

      userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'test2');
      userEvent.click(screen.getByRole('button', { name: 'Add API key' }));

      await waitFor(() => {
        expect(API.addAPIKey).toHaveBeenCalledTimes(1);
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Update API key', () => {
    it('calls update API key', async () => {
      mocked(API).updateAPIKey.mockResolvedValue(null);
      render(<Modal {...defaultProps} apiKey={APIKeyMock} />);

      expect(screen.getByText('Update API key')).toBeInTheDocument();
      expect(screen.getByText('Update')).toBeInTheDocument();
      userEvent.type(screen.getByRole('textbox', { name: /Name/ }), '-a');
      userEvent.click(screen.getByRole('button', { name: 'Update API key' }));

      await waitFor(() => {
        expect(API.updateAPIKey).toHaveBeenCalledTimes(1);
        expect(API.updateAPIKey).toHaveBeenCalledWith(APIKeyMock.apiKeyId, 'key1-a');
      });

      expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });

    it('displays default Api error', async () => {
      mocked(API).updateAPIKey.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      const component = <Modal {...defaultProps} apiKey={APIKeyMock} />;
      const { rerender } = render(component);

      userEvent.type(screen.getByRole('textbox', { name: /Name/ }), '-a');
      userEvent.click(screen.getByRole('button', { name: 'Update API key' }));

      await waitFor(() => {
        expect(API.updateAPIKey).toHaveBeenCalledTimes(1);
      });

      rerender(component);

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText('An error occurred updating the API key, please try again later.')).toBeInTheDocument();
    });

    it('calls onAuthError when error is UnauthorizedError', async () => {
      mocked(API).updateAPIKey.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });
      render(<Modal {...defaultProps} apiKey={APIKeyMock} />);

      userEvent.type(screen.getByRole('textbox', { name: /Name/ }), '-a');
      userEvent.click(screen.getByRole('button', { name: 'Update API key' }));

      await waitFor(() => {
        expect(API.updateAPIKey).toHaveBeenCalledTimes(1);
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });
  });
});
