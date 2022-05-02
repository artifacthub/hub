import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind } from '../../../types';
import MemberModal from './Modal';
jest.mock('../../../api');

const onSuccessMock = jest.fn();
const onAuthErrorMock = jest.fn();
const scrollIntoViewMock = jest.fn();
window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  open: true,
  membersList: [],
  onSuccess: onSuccessMock,
  onClose: jest.fn(),
  onAuthError: onAuthErrorMock,
};

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com', passwordSet: true },
  prefs: {
    controlPanel: {
      selectedOrg: 'orgTest',
    },
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

describe('Members Modal - members section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <MemberModal {...defaultProps} />
      </AppCtx.Provider>
    );

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<MemberModal {...defaultProps} />);

      const form = screen.getByTestId('membersForm');
      expect(form).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /Username/ })).toBeInTheDocument();
    });

    it('calls add organization member', async () => {
      mocked(API).checkAvailability.mockResolvedValue(true);
      mocked(API).addOrganizationMember.mockResolvedValue(null);
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <MemberModal {...defaultProps} />
        </AppCtx.Provider>
      );

      const input = screen.getByRole('textbox', { name: /Username/ });
      await userEvent.type(input, 'test');
      await userEvent.click(screen.getByRole('button', { name: 'Invite member' }));

      await waitFor(() => {
        expect(API.addOrganizationMember).toHaveBeenCalledTimes(1);
        expect(API.addOrganizationMember).toHaveBeenLastCalledWith('orgTest', 'test');
      });

      await waitFor(() => {
        expect(onSuccessMock).toHaveBeenCalledTimes(1);
      });
    });

    it('Other api error', async () => {
      mocked(API).checkAvailability.mockResolvedValue(true);
      mocked(API).addOrganizationMember.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      const component = (
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <MemberModal {...defaultProps} />
        </AppCtx.Provider>
      );

      const { rerender } = render(component);

      const input = screen.getByRole('textbox', { name: /Username/ });
      await userEvent.type(input, 'test');
      await userEvent.click(screen.getByRole('button', { name: 'Invite member' }));

      await waitFor(() => {
        expect(API.addOrganizationMember).toHaveBeenCalledTimes(1);
      });

      rerender(component);

      expect(
        await screen.findByText('An error occurred adding the new member, please try again later.')
      ).toBeInTheDocument();
    });

    it('calls onAuthError when error is UnauthorizedError', async () => {
      mocked(API).checkAvailability.mockResolvedValue(true);
      mocked(API).addOrganizationMember.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <MemberModal {...defaultProps} />
        </AppCtx.Provider>
      );

      const input = screen.getByRole('textbox', { name: /Username/ });
      await userEvent.type(input, 'test');
      await userEvent.click(screen.getByRole('button', { name: 'Invite member' }));

      await waitFor(() => {
        expect(API.addOrganizationMember).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
