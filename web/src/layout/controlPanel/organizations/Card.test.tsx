import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
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
  user: { alias: 'userAlias', email: 'jsmith@email.com' },
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
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Card {...defaultProps} />
      </AppCtx.Provider>
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      expect(getByText(organizationMock.displayName!)).toBeInTheDocument();
      expect(getByTestId('leaveOrgModalBtn')).toBeInTheDocument();
      expect(getByText(organizationMock.homeUrl!)).toBeInTheDocument();
      expect(getByText(organizationMock.description!)).toBeInTheDocument();
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
      const { getByText, getByTestId } = render(<Card {...props} />);

      expect(getByText('Invitation not accepted yet')).toBeInTheDocument();

      const btn = getByTestId('acceptInvitationBtn');
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.confirmOrganizationMembership).toHaveBeenCalledTimes(1);
        expect(API.confirmOrganizationMembership).toHaveBeenCalledWith(organizationMock.name);
      });
    });

    it('calls deleteOrganizationMember when leave button in dropdown is clicked', async () => {
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const modalBtn = getByTestId('leaveOrgModalBtn');
      expect(modalBtn).toBeInTheDocument();
      fireEvent.click(modalBtn);

      const btn = getByTestId('leaveOrgBtn');
      fireEvent.click(btn);

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
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const modalBtn = getByTestId('leaveOrgModalBtn');
      expect(modalBtn).toBeInTheDocument();
      fireEvent.click(modalBtn);

      const btn = getByTestId('leaveOrgBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteOrganizationMember).toHaveBeenCalledTimes(1);
      });

      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
        type: 'danger',
        message: 'An error occurred leaving the organization, please try again later.',
      });
    });

    it('calls onAuthError', async () => {
      mocked(API).deleteOrganizationMember.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const modalBtn = getByTestId('leaveOrgModalBtn');
      expect(modalBtn).toBeInTheDocument();
      fireEvent.click(modalBtn);

      const btn = getByTestId('leaveOrgBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteOrganizationMember).toHaveBeenCalledTimes(1);
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });
  });
});
