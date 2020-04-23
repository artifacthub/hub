import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { Organization } from '../../../types';
import Card from './Card';
jest.mock('../../../api');

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
    search: { limit: 25 },
  },
};

const setEditModalStatusMock = jest.fn();

const defaultProps = {
  organization: organizationMock,
  setEditModalStatus: setEditModalStatusMock,
  onSuccess: jest.fn(),
  onAuthError: jest.fn(),
};

describe('Organization Card - organization section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<Card {...defaultProps} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByTestId } = render(<Card {...defaultProps} />);

      expect(getByText(organizationMock.displayName!)).toBeInTheDocument();
      expect(getByTestId('editOrgBtn')).toBeInTheDocument();
      expect(getByTestId('leaveOrgDropdownBtn')).toBeInTheDocument();
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

      await waitFor(() => {});
      expect(API.confirmOrganizationMembership).toHaveBeenCalledTimes(1);
      expect(API.confirmOrganizationMembership).toHaveBeenCalledWith(organizationMock.name);
    });

    it('calls deleteOrganizationMember when leave button in dropdown is clicked', async () => {
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const dropdownBtn = getByTestId('leaveOrgDropdownBtn');
      expect(dropdownBtn).toBeInTheDocument();
      fireEvent.click(dropdownBtn);

      const btn = getByTestId('leaveOrgBtn');
      fireEvent.click(btn);

      await waitFor(() => {});
      expect(API.deleteOrganizationMember).toHaveBeenCalledTimes(1);
      expect(API.deleteOrganizationMember).toHaveBeenCalledWith(organizationMock.name, mockCtx.user.alias);
    });

    it('calls setEditModalStatusMock when Edit button is clicked', () => {
      const { getByTestId } = render(<Card {...defaultProps} />);

      const btn = getByTestId('editOrgBtn');
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn);
      expect(setEditModalStatusMock).toHaveBeenCalledTimes(1);
      expect(setEditModalStatusMock).toHaveBeenCalledWith({
        open: true,
        organization: organizationMock,
      });
    });
  });
});
