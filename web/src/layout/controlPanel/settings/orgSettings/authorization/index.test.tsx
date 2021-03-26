import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../../../api';
import { AppCtx } from '../../../../../context/AppCtx';
import { ErrorKind, OrganizationPolicy, User } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import AuthorizationSection from './index';
jest.mock('../../../../../utils/alertDispatcher');
jest.mock('../../../../common/Alert', () => (props: any) => <div>{props.message}</div>);

jest.mock('../../../../common/CodeEditor', () => () => <div />);
jest.mock('../../../../../api');

jest.mock('../../../../../utils/authorizer', () => ({
  check: () => {
    return true;
  },
  getAllowedActionsList: () => null,
}));

const getMockAuthz = (fixtureId: string): OrganizationPolicy => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as OrganizationPolicy;
};

const getOrganizationMembers = (): User[] => {
  return [
    {
      alias: 'jdoe',
      firstName: 'John',
      lastName: 'Doe',
    },
    {
      alias: 'jsmith',
      firstName: 'Jane',
      lastName: 'Smith',
    },
  ] as User[];
};

const onAuthErrorMock = jest.fn();
const openMock = jest.fn();

window.open = openMock;

const defaultProps = {
  onAuthError: onAuthErrorMock,
};

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com' },
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

const mockNotSelectedOrgCtx = {
  user: { alias: 'test', email: 'test@test.com' },
  prefs: {
    controlPanel: {
      selectedOrg: undefined,
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

describe('Authorization settings index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockMembers = getOrganizationMembers();
    mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);
    const mockAuthz = getMockAuthz('1');
    mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);

    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <AuthorizationSection {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
      expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component with disabled authz policy', async () => {
      const mockMembers = getOrganizationMembers();
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);
      const mockAuthz = getMockAuthz('2');
      mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);

      const { getByRole, getByTestId, getAllByRole, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <AuthorizationSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
        expect(API.getAuthorizationPolicy).toHaveBeenCalledWith('orgTest');
        expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1);
        expect(API.getOrganizationMembers).toHaveBeenCalledWith('orgTest');
      });

      expect(getByRole('main')).toBeInTheDocument();
      expect(
        getByText(
          /Depending on your requirements, you can use a predefined policy and only supply a data file, or you can provide your custom policy for maximum flexibility/i
        )
      ).toBeInTheDocument();
      expect(getAllByRole('button')).toHaveLength(4);

      const swicthAccessControl = getByTestId('swicthAccessControl');
      expect(swicthAccessControl).toBeInTheDocument();
      expect(swicthAccessControl).not.toBeChecked();

      expect(getByText('Fine-grained access control')).toBeInTheDocument();
      expect(getByText('Save')).toBeInTheDocument();
    });

    it('renders component with selected predefined policy', async () => {
      const mockMembers = getOrganizationMembers();
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);
      const mockAuthz = getMockAuthz('3');
      mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);

      const { getByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <AuthorizationSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
        expect(API.getAuthorizationPolicy).toHaveBeenCalledWith('orgTest');
        expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1);
        expect(API.getOrganizationMembers).toHaveBeenCalledWith('orgTest');
      });

      const swicthAccessControl = getByTestId('swicthAccessControl');
      expect(swicthAccessControl).toBeInTheDocument();
      expect(swicthAccessControl).toBeChecked();

      const predefinedPolicyRadio = getByTestId('radio-predefined');
      expect(predefinedPolicyRadio).toBeInTheDocument();
      expect(predefinedPolicyRadio).toBeChecked();

      const customPolicyRadio = getByTestId('radio-custom');
      expect(customPolicyRadio).toBeInTheDocument();
      expect(customPolicyRadio).not.toBeChecked();

      const selectPredefinedPolicies = getByTestId('selectPredefinedPolicies');
      expect(selectPredefinedPolicies).toBeInTheDocument();
      expect(selectPredefinedPolicies).toHaveValue(mockAuthz.predefinedPolicy!);

      expect(getByText('Test in Playground')).toBeInTheDocument();
    });

    it('renders component with selected custom policy', async () => {
      const mockMembers = getOrganizationMembers();
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);
      const mockAuthz = getMockAuthz('4');
      mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);

      const { getByTestId, getByText, queryByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <AuthorizationSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
        expect(API.getAuthorizationPolicy).toHaveBeenCalledWith('orgTest');
        expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1);
        expect(API.getOrganizationMembers).toHaveBeenCalledWith('orgTest');
      });

      const swicthAccessControl = getByTestId('swicthAccessControl');
      expect(swicthAccessControl).toBeInTheDocument();
      expect(swicthAccessControl).toBeChecked();

      const predefinedPolicyRadio = getByTestId('radio-predefined');
      expect(predefinedPolicyRadio).toBeInTheDocument();
      expect(predefinedPolicyRadio).not.toBeChecked();

      const customPolicyRadio = getByTestId('radio-custom');
      expect(customPolicyRadio).toBeInTheDocument();
      expect(customPolicyRadio).toBeChecked();

      expect(queryByTestId('selectPredefinedPolicies')).toBeNull();

      expect(getByText('Test in Playground')).toBeInTheDocument();
    });

    it('when not selected org in context', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockNotSelectedOrgCtx, dispatch: jest.fn() }}>
          <Router>
            <AuthorizationSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(0);
      });
    });
  });

  describe('on getAuthorizationPolicy error', () => {
    it('Unauthorized', async () => {
      const mockMembers = getOrganizationMembers();
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);
      mocked(API).getAuthorizationPolicy.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <AuthorizationSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
        expect(API.getAuthorizationPolicy).toHaveBeenCalledWith('orgTest');
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });

    it('Forbidden', async () => {
      const mockMembers = getOrganizationMembers();
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);
      mocked(API).getAuthorizationPolicy.mockRejectedValue({
        kind: ErrorKind.Forbidden,
      });

      const { getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <AuthorizationSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
        expect(API.getAuthorizationPolicy).toHaveBeenCalledWith('orgTest');
      });

      expect(getByText("You are not allowed to manage this organization's authorization policy")).toBeInTheDocument();
    });

    it('Default', async () => {
      const mockMembers = getOrganizationMembers();
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);
      mocked(API).getAuthorizationPolicy.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <AuthorizationSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
        expect(API.getAuthorizationPolicy).toHaveBeenCalledWith('orgTest');
      });

      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
        type: 'danger',
        message: 'An error occurred getting the policy from the organization, please try again later.',
      });
    });
  });

  describe('calls updateAuthorizationPolicy', () => {
    it('on success', async () => {
      const mockMembers = getOrganizationMembers();
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);
      const mockAuthz = getMockAuthz('5');
      mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);
      mocked(API).updateAuthorizationPolicy.mockResolvedValue(null);

      const component = (
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <AuthorizationSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const { getByTestId, getByText, rerender } = render(component);

      await waitFor(() => {
        expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
        expect(API.getAuthorizationPolicy).toHaveBeenCalledWith('orgTest');
        expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1);
        expect(API.getOrganizationMembers).toHaveBeenCalledWith('orgTest');
      });

      const predefinedPolicyRadio = getByTestId('radio-predefined');
      expect(predefinedPolicyRadio).not.toBeChecked();

      fireEvent.click(getByText('Use predefined policy'));

      expect(predefinedPolicyRadio).toBeChecked();

      const btn = getByTestId('updateAuthorizationPolicyBtn');
      fireEvent.click(btn);

      rerender(component);

      expect(getByText(/Your custom policy and previous policy data will be lost./i)).toBeInTheDocument();
      expect(getByTestId('modalOKBtn')).toBeInTheDocument();

      const confirmBtn = getByTestId('modalOKBtn');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(API.updateAuthorizationPolicy).toHaveBeenCalledTimes(1);
        expect(API.updateAuthorizationPolicy).toHaveBeenLastCalledWith('orgTest', {
          authorizationEnabled: true,
          customPolicy: null,
          policyData:
            '{\n  "roles": {\n    "owner": {\n      "users": [\n        "jdoe",\n        "jsmith"\n      ]\n    },\n    "customRole1": {\n      "users": [],\n      "allowed_actions": [\n        "addOrganizationMember",\n        "addOrganizationRepository",\n        "deleteOrganization",\n        "deleteOrganizationMember",\n        "deleteOrganizationRepository",\n        "getAuthorizationPolicy",\n        "transferOrganizationRepository",\n        "updateAuthorizationPolicy",\n        "updateOrganization",\n        "updateOrganizationRepository"\n      ]\n    }\n  }\n}',
          predefinedPolicy: 'rbac.v1',
        });
      });
    });

    describe('on error', () => {
      it('Unauthorized', async () => {
        const mockMembers = getOrganizationMembers();
        mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);
        const mockAuthz = getMockAuthz('6');
        mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);
        mocked(API).updateAuthorizationPolicy.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <AuthorizationSection {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        const { getByTestId, getByText, rerender } = render(component);

        await waitFor(() => {
          expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
          expect(API.getAuthorizationPolicy).toHaveBeenCalledWith('orgTest');
          expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1);
          expect(API.getOrganizationMembers).toHaveBeenCalledWith('orgTest');
        });

        const switchBtn = getByText('Fine-grained access control');
        fireEvent.click(switchBtn);

        const btn = getByTestId('updateAuthorizationPolicyBtn');
        fireEvent.click(btn);

        rerender(component);

        await waitFor(() => {
          expect(API.updateAuthorizationPolicy).toHaveBeenCalledTimes(1);
          expect(API.updateAuthorizationPolicy).toHaveBeenLastCalledWith('orgTest', {
            authorizationEnabled: false,
            predefinedPolicy: null,
            customPolicy: 'package artifacthub.authz\n\nallow = true\nallowed_actions = ["all"]',
            policyData: '{}',
          });
        });

        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });

      it('Forbidden', async () => {
        const mockMembers = getOrganizationMembers();
        mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);
        const mockAuthz = getMockAuthz('7');
        mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);
        mocked(API).updateAuthorizationPolicy.mockRejectedValue({
          kind: ErrorKind.Forbidden,
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <AuthorizationSection {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        const { getByTestId, getByText, rerender } = render(component);

        await waitFor(() => {
          expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
          expect(API.getAuthorizationPolicy).toHaveBeenCalledWith('orgTest');
          expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1);
          expect(API.getOrganizationMembers).toHaveBeenCalledWith('orgTest');
        });

        const switchBtn = getByText('Fine-grained access control');
        fireEvent.click(switchBtn);

        const btn = getByTestId('updateAuthorizationPolicyBtn');
        fireEvent.click(btn);

        rerender(component);

        await waitFor(() => {
          expect(API.updateAuthorizationPolicy).toHaveBeenCalledTimes(1);
          expect(API.updateAuthorizationPolicy).toHaveBeenLastCalledWith('orgTest', {
            authorizationEnabled: false,
            predefinedPolicy: null,
            customPolicy: 'package artifacthub.authz\n\nallow = true\nallowed_actions = ["all"]',
            policyData: '{}',
          });
        });

        await waitFor(() => {
          expect(
            getByText('You do not have permissions to update the policy from the organization.')
          ).toBeInTheDocument();
        });

        waitFor(() => {
          expect(switchBtn).toBeDisabled();
        });
      });

      it('Custom error', async () => {
        const mockMembers = getOrganizationMembers();
        mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);
        const mockAuthz = getMockAuthz('8');
        mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);
        mocked(API).updateAuthorizationPolicy.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'invalid input: editing user will be locked out with this policy',
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <AuthorizationSection {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        const { getByTestId, getByText, rerender } = render(component);

        await waitFor(() => {
          expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
          expect(API.getAuthorizationPolicy).toHaveBeenCalledWith('orgTest');
          expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1);
          expect(API.getOrganizationMembers).toHaveBeenCalledWith('orgTest');
        });

        const switchBtn = getByText('Fine-grained access control');
        fireEvent.click(switchBtn);

        const btn = getByTestId('updateAuthorizationPolicyBtn');
        fireEvent.click(btn);

        rerender(component);

        await waitFor(() => {
          expect(API.updateAuthorizationPolicy).toHaveBeenCalledTimes(1);
          expect(API.updateAuthorizationPolicy).toHaveBeenLastCalledWith('orgTest', {
            authorizationEnabled: false,
            predefinedPolicy: null,
            customPolicy: 'package artifacthub.authz\n\nallow = true\nallowed_actions = ["all"]',
            policyData: '{}',
          });
        });

        await waitFor(() => {
          expect(
            getByText(
              /An error occurred updating the policy: invalid input: editing user will be locked out with this policy/i
            )
          ).toBeInTheDocument();
        });
      });

      it('Default error', async () => {
        const mockMembers = getOrganizationMembers();
        mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);
        const mockAuthz = getMockAuthz('9');
        mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);
        mocked(API).updateAuthorizationPolicy.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <AuthorizationSection {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        const { getByTestId, getByText, rerender } = render(component);

        await waitFor(() => {
          expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
          expect(API.getAuthorizationPolicy).toHaveBeenCalledWith('orgTest');
          expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1);
          expect(API.getOrganizationMembers).toHaveBeenCalledWith('orgTest');
        });

        const switchBtn = getByText('Fine-grained access control');
        fireEvent.click(switchBtn);

        const btn = getByTestId('updateAuthorizationPolicyBtn');
        fireEvent.click(btn);

        rerender(component);

        await waitFor(() => {
          expect(API.updateAuthorizationPolicy).toHaveBeenCalledTimes(1);
          expect(API.updateAuthorizationPolicy).toHaveBeenLastCalledWith('orgTest', {
            authorizationEnabled: false,
            predefinedPolicy: null,
            customPolicy: 'package artifacthub.authz\n\nallow = true\nallowed_actions = ["all"]',
            policyData: '{}',
          });
        });

        await waitFor(() => {
          expect(getByText(/An error occurred updating the policy, please try again later./i)).toBeInTheDocument();
        });
      });
    });
  });

  describe('calls triggerTestInRegoPlayground', () => {
    it('on success', async () => {
      const mockMembers = getOrganizationMembers();
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);
      const mockAuthz = getMockAuthz('10');
      mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);
      mocked(API).triggerTestInRegoPlayground.mockResolvedValue({ result: 'http://test.com' });

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <AuthorizationSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
        expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1);
      });

      const playgroundBtn = getByTestId('playgroundBtn');
      fireEvent.click(playgroundBtn);

      await waitFor(() => {
        expect(API.triggerTestInRegoPlayground).toHaveBeenCalledTimes(1);
        expect(API.triggerTestInRegoPlayground).toHaveBeenCalledWith({
          rego_modules: {
            'policy.rego': 'package artifacthub.authz↵↵allow = true↵allowed_actions = ["all"]',
          },
          input: { user: 'test' },
          data: {},
        });
      });

      expect(openMock).toHaveBeenCalledTimes(1);
      expect(openMock).toHaveBeenCalledWith('http://test.com', '_blank');
    });

    it('on error', async () => {
      const mockMembers = getOrganizationMembers();
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);
      const mockAuthz = getMockAuthz('11');
      mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);
      mocked(API).triggerTestInRegoPlayground.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <AuthorizationSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
        expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1);
      });

      const playgroundBtn = getByTestId('playgroundBtn');
      fireEvent.click(playgroundBtn);

      await waitFor(() => {
        expect(API.triggerTestInRegoPlayground).toHaveBeenCalledTimes(1);
        expect(API.triggerTestInRegoPlayground).toHaveBeenCalledWith({
          rego_modules: {
            'policy.rego': 'package artifacthub.authz↵↵allow = true↵allowed_actions = ["all"]',
          },
          input: { user: 'test' },
          data: {},
        });
      });

      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
        type: 'danger',
        message: 'An error occurred opening the Playground, please try again later.',
      });
    });
  });
});
