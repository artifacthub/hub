import { render, screen, wait, waitForElement, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { Organization } from '../../../types';
import OrganizationSettings from './OrgSettings';
jest.mock('../../../api');

const getMockOrganization = (fixtureId: string): Organization => {
  return require(`./__fixtures__/OrgSettings/${fixtureId}.json`) as Organization;
};

const defaultProps = {
  onAuthError: jest.fn(),
};

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com' },
  org: { name: 'orgTest' },
  requestSignIn: false,
};

describe('Organization settings index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockOrganization = getMockOrganization('1');
    mocked(API).getOrganization.mockResolvedValue(mockOrganization);

    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <OrganizationSettings {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    expect(result.asFragment()).toMatchSnapshot();
    await wait();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockOrganization = getMockOrganization('2');
      mocked(API).getOrganization.mockResolvedValue(mockOrganization);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );
      expect(API.getOrganization).toHaveBeenCalledTimes(1);
      await wait();
    });

    it('removes loading spinner after getting organization details', async () => {
      const mockOrganization = getMockOrganization('3');
      mocked(API).getOrganization.mockResolvedValue(mockOrganization);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const spinner = await waitForElementToBeRemoved(() => screen.getByRole('status'));

      expect(spinner).toBeTruthy();
      await wait();
    });

    it('displays no data component when no organization details', async () => {
      const mockOrganization = getMockOrganization('4');
      mocked(API).getOrganization.mockRejectedValue(mockOrganization);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const noData = await waitForElement(() => screen.getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(screen.getByText('Sorry, the information for this organization is missing.')).toBeInTheDocument();

      await wait();
    });

    it('renders organization details in form', async () => {
      const mockOrganization = getMockOrganization('5');
      mocked(API).getOrganization.mockResolvedValue(mockOrganization);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const form = await waitForElement(() => screen.getByTestId('organizationForm'));

      expect(form).toBeInTheDocument();
      expect(screen.getByAltText('Logo')).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockOrganization.name)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockOrganization.displayName!)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockOrganization.homeUrl!)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockOrganization.description!)).toBeInTheDocument();

      await wait();
    });
  });
});
