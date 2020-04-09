import { fireEvent, render, screen, wait, waitForElement, waitForElementToBeRemoved } from '@testing-library/react';
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

const defaultProps = {
  onAuthError: jest.fn(),
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

    expect(result.asFragment()).toMatchSnapshot();
    await wait();
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
      expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      await wait();
    });

    it('removes loading spinner after getting user organizations', async () => {
      const mockOrganizations = getMockOrganizations('3');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      render(
        <Router>
          <OrganizationsSection {...defaultProps} />
        </Router>
      );

      const spinner = await waitForElementToBeRemoved(() => screen.getByRole('status'));

      expect(spinner).toBeTruthy();
      await wait();
    });

    it('displays no data component when no organizations', async () => {
      const mockOrganizations = getMockOrganizations('4');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      render(
        <Router>
          <OrganizationsSection {...defaultProps} />
        </Router>
      );

      const noData = await waitForElement(() => screen.getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(screen.getByText('Do you need to create a organization?')).toBeInTheDocument();
      expect(screen.getByTestId('addFirstOrgBtn')).toBeInTheDocument();

      await wait();
    });

    it('renders organization form when add first org button is clicked', async () => {
      const mockOrganizations = getMockOrganizations('5');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      render(
        <Router>
          <OrganizationsSection {...defaultProps} />
        </Router>
      );

      const noData = await waitForElement(() => screen.getByTestId('noData'));
      expect(noData).toBeInTheDocument();

      expect(screen.queryByText('Name')).not.toBeInTheDocument();
      expect(screen.queryByText('Display name')).not.toBeInTheDocument();
      expect(screen.queryByText('Home URL')).not.toBeInTheDocument();
      expect(screen.queryByText('Description')).not.toBeInTheDocument();

      const addBtn = screen.getByTestId('addFirstOrgBtn');
      fireEvent.click(addBtn);
      expect(screen.queryByText('Name')).toBeInTheDocument();
      expect(screen.queryByText('Display name')).toBeInTheDocument();
      expect(screen.queryByText('Home URL')).toBeInTheDocument();
      expect(screen.queryByText('Description')).toBeInTheDocument();

      await wait();
    });

    it('renders organization form when add org button is clicked', async () => {
      const mockOrganizations = getMockOrganizations('6');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      render(
        <Router>
          <OrganizationsSection {...defaultProps} />
        </Router>
      );

      const addBtn = await waitForElement(() => screen.getByTestId('addOrgButton'));
      expect(addBtn).toBeInTheDocument();

      expect(screen.queryByText('Name')).not.toBeInTheDocument();
      expect(screen.queryByText('Display name')).not.toBeInTheDocument();
      expect(screen.queryByText('Home URL')).not.toBeInTheDocument();
      expect(screen.queryByText('Description')).not.toBeInTheDocument();

      fireEvent.click(addBtn);
      expect(screen.queryByText('Name')).toBeInTheDocument();
      expect(screen.queryByText('Display name')).toBeInTheDocument();
      expect(screen.queryByText('Home URL')).toBeInTheDocument();
      expect(screen.queryByText('Description')).toBeInTheDocument();

      await wait();
    });
  });

  it('renders 2 organization cards', async () => {
    const mockOrganizations = getMockOrganizations('6');
    mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

    render(
      <Router>
        <OrganizationsSection {...defaultProps} />
      </Router>
    );

    const cards = await waitForElement(() => screen.getAllByTestId('organizationCard'));
    expect(cards).toHaveLength(2);
    await wait();
  });
});
