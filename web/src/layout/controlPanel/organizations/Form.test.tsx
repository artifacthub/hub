import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, Organization } from '../../../types';
import OrganizationForm from './Form';
jest.mock('../../../api');

const onSuccessMock = jest.fn();
const onAuthErrorMock = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const orgMock: Organization = {
  name: 'orgtest',
  displayName: 'Org test',
  homeUrl: 'http://test.org',
  logoImageId: '1234',
  description: 'Org description',
};

const defaultProps = {
  organization: undefined,
  onSuccess: onSuccessMock,
  onClose: jest.fn(),
  onAuthError: onAuthErrorMock,
  setIsSending: jest.fn(),
};

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com', passwordSet: true },
  prefs: {
    controlPanel: {
      selectedOrg: 'orgtest',
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

describe('Organization Form - organizations section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <OrganizationForm {...defaultProps} />
      </AppCtx.Provider>
    );

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<OrganizationForm {...defaultProps} />);

      expect(screen.getByTestId('organizationForm')).toBeInTheDocument();
      expect(screen.getByLabelText(/Logo/)).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /Name/ })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Display name' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Home URL' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Description' })).toBeInTheDocument();
    });

    describe('Add organization', () => {
      it('calls add organization', async () => {
        mocked(API).checkAvailability.mockResolvedValue(false);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addOrganization.mockResolvedValue(null);
        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...defaultProps} />
          </AppCtx.Provider>
        );

        await userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'name');
        await userEvent.type(screen.getByRole('textbox', { name: 'Display name' }), 'Pretty name');
        await userEvent.type(screen.getByRole('textbox', { name: 'Home URL' }), 'http://test.org');
        fireEvent.submit(screen.getByTestId('organizationForm'));

        await waitFor(() => {
          expect(API.addOrganization).toHaveBeenCalledTimes(1);
          expect(API.addOrganization).toHaveBeenLastCalledWith({
            description: '',
            displayName: 'Pretty name',
            homeUrl: 'http://test.org',
            name: 'name',
          });
        });

        expect(onSuccessMock).toHaveBeenCalledTimes(1);
      });

      it('displays default Api error', async () => {
        mocked(API).checkAvailability.mockResolvedValue(false);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addOrganization.mockRejectedValue({
          kind: ErrorKind.Other,
        });
        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...defaultProps} />
          </AppCtx.Provider>
        );

        await userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'name2');
        await userEvent.type(screen.getByRole('textbox', { name: 'Display name' }), 'Pretty name');
        await userEvent.type(screen.getByRole('textbox', { name: 'Home URL' }), 'http://test.org');
        fireEvent.submit(screen.getByTestId('organizationForm'));

        await waitFor(() => {
          expect(API.addOrganization).toHaveBeenCalledTimes(1);
        });

        expect(
          await screen.findByText('An error occurred adding the organization, please try again later.')
        ).toBeInTheDocument();
      });

      it('displays custom Api error', async () => {
        mocked(API).checkAvailability.mockResolvedValue(false);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addOrganization.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'custom error',
        });
        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...defaultProps} />
          </AppCtx.Provider>
        );

        await userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'name2');
        await userEvent.type(screen.getByRole('textbox', { name: 'Display name' }), 'Pretty name');
        await userEvent.type(screen.getByRole('textbox', { name: 'Home URL' }), 'http://test.org');
        fireEvent.submit(screen.getByTestId('organizationForm'));

        await waitFor(() => {
          expect(API.addOrganization).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByText('An error occurred adding the organization: custom error')).toBeInTheDocument();
      });

      it('calls onAuthError when error is UnauthorizedError', async () => {
        mocked(API).checkAvailability.mockResolvedValue(false);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addOrganization.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });
        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...defaultProps} />
          </AppCtx.Provider>
        );

        await userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'name2');
        await userEvent.type(screen.getByRole('textbox', { name: 'Display name' }), 'Pretty name');
        await userEvent.type(screen.getByRole('textbox', { name: 'Home URL' }), 'http://test.org');
        fireEvent.submit(screen.getByTestId('organizationForm'));

        await waitFor(() => {
          expect(API.addOrganization).toHaveBeenCalledTimes(1);
        });

        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('Update organization', () => {
      it('calls update organization', async () => {
        mocked(API).checkAvailability.mockResolvedValue(true);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).updateOrganization.mockResolvedValue(null);

        const props = {
          ...defaultProps,
          organization: orgMock,
        };

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...props} />
          </AppCtx.Provider>
        );

        const displayNameInput = screen.getByRole('textbox', { name: 'Display name' });
        await userEvent.clear(displayNameInput);
        await userEvent.type(displayNameInput, 'Pretty name');
        fireEvent.submit(screen.getByTestId('organizationForm'));

        await waitFor(() => {
          expect(API.updateOrganization).toHaveBeenCalledTimes(1);
          expect(API.updateOrganization).toHaveBeenLastCalledWith(
            {
              ...orgMock,
              displayName: 'Pretty name',
            },
            'orgtest'
          );
        });
      });

      it('displays default error', async () => {
        mocked(API).checkAvailability.mockResolvedValue(true);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).updateOrganization.mockRejectedValue({
          kind: ErrorKind.Other,
        });
        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...defaultProps} organization={orgMock} />
          </AppCtx.Provider>
        );

        const displayNameInput = screen.getByRole('textbox', { name: 'Display name' });
        await userEvent.clear(displayNameInput);
        await userEvent.type(displayNameInput, 'Pretty name');
        fireEvent.submit(screen.getByTestId('organizationForm'));

        await waitFor(() => {
          expect(API.updateOrganization).toHaveBeenCalledTimes(1);
        });

        expect(
          await screen.findByText('An error occurred updating the organization, please try again later.')
        ).toBeInTheDocument();
      });

      it('displays custom message error', async () => {
        mocked(API).checkAvailability.mockResolvedValue(true);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).updateOrganization.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'message error',
        });
        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...defaultProps} organization={orgMock} />
          </AppCtx.Provider>
        );

        const displayNameInput = screen.getByRole('textbox', { name: 'Display name' });
        await userEvent.clear(displayNameInput);
        await userEvent.type(displayNameInput, 'Pretty name');
        fireEvent.submit(screen.getByTestId('organizationForm'));

        await waitFor(() => {
          expect(API.updateOrganization).toHaveBeenCalledTimes(1);
        });

        expect(
          await screen.findByText('An error occurred updating the organization: message error')
        ).toBeInTheDocument();
      });

      it('calls onAuthError when error is UnauthorizedError', async () => {
        mocked(API).checkAvailability.mockResolvedValue(true);
        mocked(API).updateOrganization.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });
        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...defaultProps} organization={orgMock} />
          </AppCtx.Provider>
        );

        const displayNameInput = screen.getByRole('textbox', { name: 'Display name' });
        await userEvent.clear(displayNameInput);
        await userEvent.type(displayNameInput, 'Pretty name');
        fireEvent.submit(screen.getByTestId('organizationForm'));

        await waitFor(() => {
          expect(API.updateOrganization).toHaveBeenCalledTimes(1);
        });

        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
