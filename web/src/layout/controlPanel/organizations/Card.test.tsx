import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, Organization } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import Card from './Card';
jest.mock('../../../api');
jest.mock('../../../utils/alertDispatcher');

const organizationMock: Organization = {
  name: 'test',
  displayName: 'Test',
  description: 'Lorem ipsum...',
  homeUrl: 'https://test.org',
  confirmed: true,
  membersCount: 2,
};

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

const setEditModalStatusMock = jest.fn();
const onAuthErrorMock = jest.fn();

const defaultProps = {
  organization: organizationMock,
  setEditModalStatus: setEditModalStatusMock,
  onSuccess: jest.fn(),
  onAuthError: onAuthErrorMock,
};

describe('Organization Card - organization section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Card {...defaultProps} />
      </AppCtx.Provider>
    );

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      expect(screen.getByText(organizationMock.displayName!)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open modal' })).toBeInTheDocument();
      expect(screen.getByText(organizationMock.homeUrl!)).toBeInTheDocument();
      expect(screen.getByText(organizationMock.description!)).toBeInTheDocument();
    });

    it('renders component when user is not a member yet', async () => {
      const props = {
        ...defaultProps,
        organization: {
          name: 'test',
          displayName: 'Test',
          description: 'Lorem ipsum...',
          homeUrl: 'https://test.org',
          confirmed: false,
          membersCount: 2,
        },
      };
      render(<Card {...props} />);

      expect(screen.getByText('Invitation not accepted yet')).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: 'Confirm membership' });
      expect(btn).toBeInTheDocument();

      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.confirmOrganizationMembership).toHaveBeenCalledTimes(1);
        expect(API.confirmOrganizationMembership).toHaveBeenCalledWith(organizationMock.name);
      });
    });

    it('calls deleteOrganizationMember when leave button in dropdown is clicked', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const modalBtn = screen.getByRole('button', { name: 'Open modal' });
      expect(modalBtn).toBeInTheDocument();
      await userEvent.click(modalBtn);

      const btn = await screen.findByRole('button', { name: 'Leave organization' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteOrganizationMember).toHaveBeenCalledTimes(1);
        expect(API.deleteOrganizationMember).toHaveBeenCalledWith(organizationMock.name, mockCtx.user.alias);
      });
    });
  });

  describe('on deleteOrganizationMember error', () => {
    it('API error', async () => {
      mocked(API).deleteOrganizationMember.mockRejectedValue({
        kind: ErrorKind.Other,
      });
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const modalBtn = screen.getByRole('button', { name: 'Open modal' });
      expect(modalBtn).toBeInTheDocument();
      await userEvent.click(modalBtn);

      const btn = await screen.findByRole('button', { name: 'Leave organization' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteOrganizationMember).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred leaving the organization, please try again later.',
        });
      });
    });

    it('calls onAuthError', async () => {
      mocked(API).deleteOrganizationMember.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const modalBtn = screen.getByRole('button', { name: 'Open modal' });
      expect(modalBtn).toBeInTheDocument();
      await userEvent.click(modalBtn);

      const btn = await screen.findByRole('button', { name: 'Leave organization' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteOrganizationMember).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
