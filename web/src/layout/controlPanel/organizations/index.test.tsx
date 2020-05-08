import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { Organization } from '../../../types';
import OrganizationsSection from './index';
jest.mock('../../../api');

const getMockOrganizations = (fixtureId: string): Organization[] => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as Organization[];
};

const onAuthErrorMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
};

describe('Organizations section index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockOrganizations = getMockOrganizations('1');
    mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

    const result = render(
      <Router>
        <OrganizationsSection {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockOrganizations = getMockOrganizations('2');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      render(
        <Router>
          <OrganizationsSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      });
    });

    it('displays no data component when no organizations', async () => {
      const mockOrganizations = getMockOrganizations('4');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      const { getByTestId, getByText } = render(
        <Router>
          <OrganizationsSection {...defaultProps} />
        </Router>
      );

      const noData = await waitFor(() => getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(getByText('Do you need to create a organization?')).toBeInTheDocument();
      expect(getByTestId('addFirstOrgBtn')).toBeInTheDocument();

      await waitFor(() => {});
    });

    it('renders organization form when add first org button is clicked', async () => {
      const mockOrganizations = getMockOrganizations('5');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      const { getByTestId, queryByText } = render(
        <Router>
          <OrganizationsSection {...defaultProps} />
        </Router>
      );

      const noData = await waitFor(() => getByTestId('noData'));
      expect(noData).toBeInTheDocument();

      expect(queryByText('Name')).toBeNull();
      expect(queryByText('Display name')).toBeNull();
      expect(queryByText('Home URL')).toBeNull();
      expect(queryByText('Description')).toBeNull();

      const addBtn = getByTestId('addFirstOrgBtn');
      fireEvent.click(addBtn);
      expect(queryByText('Name')).toBeInTheDocument();
      expect(queryByText('Display name')).toBeInTheDocument();
      expect(queryByText('Home URL')).toBeInTheDocument();
      expect(queryByText('Description')).toBeInTheDocument();

      await waitFor(() => {});
    });

    it('renders organization form when add org button is clicked', async () => {
      const mockOrganizations = getMockOrganizations('6');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      const { getByTestId, queryByText } = render(
        <Router>
          <OrganizationsSection {...defaultProps} />
        </Router>
      );

      const addBtn = await waitFor(() => getByTestId('addOrgButton'));
      expect(addBtn).toBeInTheDocument();

      expect(queryByText('Name')).toBeNull();
      expect(queryByText('Display name')).toBeNull();
      expect(queryByText('Home URL')).toBeNull();
      expect(queryByText('Description')).toBeNull();

      fireEvent.click(addBtn);
      expect(queryByText('Name')).toBeInTheDocument();
      expect(queryByText('Display name')).toBeInTheDocument();
      expect(queryByText('Home URL')).toBeInTheDocument();
      expect(queryByText('Description')).toBeInTheDocument();

      await waitFor(() => {});
    });
  });

  it('renders 2 organization cards', async () => {
    const mockOrganizations = getMockOrganizations('6');
    mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

    const { getAllByTestId } = render(
      <Router>
        <OrganizationsSection {...defaultProps} />
      </Router>
    );

    const cards = await waitFor(() => getAllByTestId('organizationCard'));
    expect(cards).toHaveLength(2);
    await waitFor(() => {});
  });

  describe('on getUserOrganizations error', () => {
    it('401 error', async () => {
      mocked(API).getUserOrganizations.mockRejectedValue({
        statusText: 'ErrLoginRedirect',
      });

      render(
        <Router>
          <OrganizationsSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => expect(API.getUserOrganizations).toHaveBeenCalledTimes(1));

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });

    it('rest API errors - displays generis error message', async () => {
      mocked(API).getUserOrganizations.mockRejectedValue({ status: 400 });

      const { getByTestId, getByText } = render(
        <Router>
          <OrganizationsSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => expect(API.getUserOrganizations).toHaveBeenCalledTimes(1));

      const noData = getByTestId('noData');
      expect(noData).toBeInTheDocument();
      expect(getByText(/An error occurred getting your organizations, please try again later/i)).toBeInTheDocument();

      await waitFor(() => {});
    });
  });
});
