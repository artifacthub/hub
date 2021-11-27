import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import API from '../../../../../api';
import { AppCtx } from '../../../../../context/AppCtx';
import { ErrorKind, OrganizationPolicy } from '../../../../../types';
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

const getAllOrganizationMembers = () => {
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
  ];
};

const onAuthErrorMock = jest.fn();
const openMock = jest.fn();

window.open = openMock;

const defaultProps = {
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

const mockNotSelectedOrgCtx = {
  user: { alias: 'test', email: 'test@test.com', passwordSet: true },
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
    const mockMembers = getAllOrganizationMembers();
    mocked(API).getAllOrganizationMembers.mockResolvedValue(mockMembers);
    const mockAuthz = getMockAuthz('1');
    mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);

    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <AuthorizationSection {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
      expect(API.getAllOrganizationMembers).toHaveBeenCalledTimes(1);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component with disabled authz policy', async () => {
      const mockMembers = getAllOrganizationMembers();
      mocked(API).getAllOrganizationMembers.mockResolvedValue(mockMembers);
      const mockAuthz = getMockAuthz('2');
      mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);

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
        expect(API.getAllOrganizationMembers).toHaveBeenCalledTimes(1);
        expect(API.getAllOrganizationMembers).toHaveBeenCalledWith('orgTest');
      });

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Depending on your requirements, you can use a predefined policy and only supply a data file, or you can provide your custom policy for maximum flexibility/i
        )
      ).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(4);

      const swicthAccessControl = screen.getByRole('checkbox', { name: 'Fine-grained access control' });
      expect(swicthAccessControl).toBeInTheDocument();
      expect(swicthAccessControl).not.toBeChecked();

      expect(screen.getByText('Fine-grained access control')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('renders component with selected predefined policy', async () => {
      const mockMembers = getAllOrganizationMembers();
      mocked(API).getAllOrganizationMembers.mockResolvedValue(mockMembers);
      const mockAuthz = getMockAuthz('3');
      mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);

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
        expect(API.getAllOrganizationMembers).toHaveBeenCalledTimes(1);
        expect(API.getAllOrganizationMembers).toHaveBeenCalledWith('orgTest');
      });

      const swicthAccessControl = screen.getByRole('checkbox', { name: 'Fine-grained access control' });
      expect(swicthAccessControl).toBeInTheDocument();
      expect(swicthAccessControl).toBeChecked();

      const predefinedPolicyRadio = screen.getByRole('radio', { name: 'Use predefined policy' });
      expect(predefinedPolicyRadio).toBeInTheDocument();
      expect(predefinedPolicyRadio).toBeChecked();

      const customPolicyRadio = screen.getByRole('radio', { name: 'Use custom policy' });
      expect(customPolicyRadio).toBeInTheDocument();
      expect(customPolicyRadio).not.toBeChecked();

      const selectPredefinedPolicies = screen.getByRole('combobox', { name: 'org-select' });
      expect(selectPredefinedPolicies).toBeInTheDocument();
      expect(selectPredefinedPolicies).toHaveValue(mockAuthz.predefinedPolicy!);

      expect(screen.getByText('Test in Playground')).toBeInTheDocument();
    });

    it('renders component with selected custom policy', async () => {
      const mockMembers = getAllOrganizationMembers();
      mocked(API).getAllOrganizationMembers.mockResolvedValue(mockMembers);
      const mockAuthz = getMockAuthz('4');
      mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);

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
        expect(API.getAllOrganizationMembers).toHaveBeenCalledTimes(1);
        expect(API.getAllOrganizationMembers).toHaveBeenCalledWith('orgTest');
      });

      const swicthAccessControl = screen.getByRole('checkbox', { name: 'Fine-grained access control' });
      expect(swicthAccessControl).toBeInTheDocument();
      expect(swicthAccessControl).toBeChecked();

      const predefinedPolicyRadio = screen.getByRole('radio', { name: 'Use predefined policy' });
      expect(predefinedPolicyRadio).toBeInTheDocument();
      expect(predefinedPolicyRadio).not.toBeChecked();

      const customPolicyRadio = screen.getByRole('radio', { name: 'Use custom policy' });
      expect(customPolicyRadio).toBeInTheDocument();
      expect(customPolicyRadio).toBeChecked();

      expect(screen.queryByRole('combobox', { name: 'org-select' })).toBeNull();

      expect(screen.getByText('Test in Playground')).toBeInTheDocument();
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
      const mockMembers = getAllOrganizationMembers();
      mocked(API).getAllOrganizationMembers.mockResolvedValue(mockMembers);
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
      const mockMembers = getAllOrganizationMembers();
      mocked(API).getAllOrganizationMembers.mockResolvedValue(mockMembers);
      mocked(API).getAuthorizationPolicy.mockRejectedValue({
        kind: ErrorKind.Forbidden,
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

      expect(
        screen.getByText("You are not allowed to manage this organization's authorization policy")
      ).toBeInTheDocument();
    });

    it('Default', async () => {
      const mockMembers = getAllOrganizationMembers();
      mocked(API).getAllOrganizationMembers.mockResolvedValue(mockMembers);
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
      const mockMembers = getAllOrganizationMembers();
      mocked(API).getAllOrganizationMembers.mockResolvedValue(mockMembers);
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

      const { rerender } = render(component);

      await waitFor(() => {
        expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
        expect(API.getAuthorizationPolicy).toHaveBeenCalledWith('orgTest');
        expect(API.getAllOrganizationMembers).toHaveBeenCalledTimes(1);
        expect(API.getAllOrganizationMembers).toHaveBeenCalledWith('orgTest');
      });

      const predefinedPolicyRadio = screen.getByRole('radio', { name: 'Use predefined policy' });
      expect(predefinedPolicyRadio).not.toBeChecked();

      userEvent.click(screen.getByText('Use predefined policy'));

      expect(predefinedPolicyRadio).toBeChecked();

      const btn = screen.getByRole('button', { name: 'Update authorization policy' });
      userEvent.click(btn);

      rerender(component);

      expect(screen.getByText(/Your custom policy and previous policy data will be lost./i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
      userEvent.click(confirmBtn);

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
        const mockMembers = getAllOrganizationMembers();
        mocked(API).getAllOrganizationMembers.mockResolvedValue(mockMembers);
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

        const { rerender } = render(component);

        await waitFor(() => {
          expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
          expect(API.getAuthorizationPolicy).toHaveBeenCalledWith('orgTest');
          expect(API.getAllOrganizationMembers).toHaveBeenCalledTimes(1);
          expect(API.getAllOrganizationMembers).toHaveBeenCalledWith('orgTest');
        });

        const switchBtn = screen.getByText('Fine-grained access control');
        userEvent.click(switchBtn);

        const btn = screen.getByRole('button', { name: 'Update authorization policy' });
        userEvent.click(btn);

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
        const mockMembers = getAllOrganizationMembers();
        mocked(API).getAllOrganizationMembers.mockResolvedValue(mockMembers);
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

        const { rerender } = render(component);

        await waitFor(() => {
          expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
          expect(API.getAuthorizationPolicy).toHaveBeenCalledWith('orgTest');
          expect(API.getAllOrganizationMembers).toHaveBeenCalledTimes(1);
          expect(API.getAllOrganizationMembers).toHaveBeenCalledWith('orgTest');
        });

        const switchBtn = screen.getByText('Fine-grained access control');
        userEvent.click(switchBtn);

        const btn = screen.getByRole('button', { name: 'Update authorization policy' });
        userEvent.click(btn);

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

        expect(
          await screen.findByText('You do not have permissions to update the policy from the organization.')
        ).toBeInTheDocument();

        waitFor(() => {
          expect(switchBtn).toBeDisabled();
        });
      });

      it('Custom error', async () => {
        const mockMembers = getAllOrganizationMembers();
        mocked(API).getAllOrganizationMembers.mockResolvedValue(mockMembers);
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

        const { rerender } = render(component);

        await waitFor(() => {
          expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
          expect(API.getAuthorizationPolicy).toHaveBeenCalledWith('orgTest');
          expect(API.getAllOrganizationMembers).toHaveBeenCalledTimes(1);
          expect(API.getAllOrganizationMembers).toHaveBeenCalledWith('orgTest');
        });

        const switchBtn = screen.getByText('Fine-grained access control');
        userEvent.click(switchBtn);

        const btn = screen.getByRole('button', { name: 'Update authorization policy' });
        userEvent.click(btn);

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

        expect(
          await screen.findByText(
            /An error occurred updating the policy: invalid input: editing user will be locked out with this policy/i
          )
        ).toBeInTheDocument();
      });

      it('Default error', async () => {
        const mockMembers = getAllOrganizationMembers();
        mocked(API).getAllOrganizationMembers.mockResolvedValue(mockMembers);
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

        const { rerender } = render(component);

        await waitFor(() => {
          expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
          expect(API.getAuthorizationPolicy).toHaveBeenCalledWith('orgTest');
          expect(API.getAllOrganizationMembers).toHaveBeenCalledTimes(1);
          expect(API.getAllOrganizationMembers).toHaveBeenCalledWith('orgTest');
        });

        const switchBtn = screen.getByText('Fine-grained access control');
        userEvent.click(switchBtn);

        const btn = screen.getByRole('button', { name: 'Update authorization policy' });
        userEvent.click(btn);

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

        expect(
          await screen.findByText(/An error occurred updating the policy, please try again later./i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('calls triggerTestInRegoPlayground', () => {
    it('on success', async () => {
      const mockMembers = getAllOrganizationMembers();
      mocked(API).getAllOrganizationMembers.mockResolvedValue(mockMembers);
      const mockAuthz = getMockAuthz('10');
      mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);
      mocked(API).triggerTestInRegoPlayground.mockResolvedValue({ result: 'http://test.com' });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <AuthorizationSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAuthorizationPolicy).toHaveBeenCalledTimes(1);
        expect(API.getAllOrganizationMembers).toHaveBeenCalledTimes(1);
      });

      const playgroundBtn = screen.getByRole('button', { name: 'Test in playground' });
      userEvent.click(playgroundBtn);

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
      const mockMembers = getAllOrganizationMembers();
      mocked(API).getAllOrganizationMembers.mockResolvedValue(mockMembers);
      const mockAuthz = getMockAuthz('11');
      mocked(API).getAuthorizationPolicy.mockResolvedValue(mockAuthz);
      mocked(API).triggerTestInRegoPlayground.mockRejectedValue({
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
        expect(API.getAllOrganizationMembers).toHaveBeenCalledTimes(1);
      });

      const playgroundBtn = screen.getByRole('button', { name: 'Test in playground' });
      userEvent.click(playgroundBtn);

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
