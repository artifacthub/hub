import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
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
  user: { alias: 'test', email: 'test@test.com' },
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
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <OrganizationForm {...defaultProps} />
      </AppCtx.Provider>
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByTestId } = render(<OrganizationForm {...defaultProps} />);

      const form = getByTestId('organizationForm');
      expect(form).toBeInTheDocument();
      expect(getByTestId('inputFile')).toBeInTheDocument();
      expect(getByTestId('nameInput')).toBeInTheDocument();
      expect(getByTestId('displayNameInput')).toBeInTheDocument();
      expect(getByTestId('homeUrlInput')).toBeInTheDocument();
      expect(getByTestId('descriptionTextarea')).toBeInTheDocument();
    });

    describe('Add organization', () => {
      it('calls add organization', async () => {
        mocked(API).checkAvailability.mockResolvedValue(false);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addOrganization.mockResolvedValue(null);
        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...defaultProps} />
          </AppCtx.Provider>
        );

        fireEvent.change(getByTestId('nameInput'), { target: { value: 'name' } });
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.change(getByTestId('homeUrlInput'), { target: { value: 'http://test.org' } });
        fireEvent.submit(getByTestId('organizationForm'));

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
        const { getByTestId, getByText } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...defaultProps} />
          </AppCtx.Provider>
        );

        fireEvent.change(getByTestId('nameInput'), { target: { value: 'name2' } });
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.change(getByTestId('homeUrlInput'), { target: { value: 'http://test.org' } });
        fireEvent.submit(getByTestId('organizationForm'));

        await waitFor(() => {
          expect(API.addOrganization).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(getByText('An error occurred adding the organization, please try again later.')).toBeInTheDocument();
        });
      });

      it('displays custom Api error', async () => {
        mocked(API).checkAvailability.mockResolvedValue(false);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addOrganization.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'custom error',
        });
        const { getByTestId, getByText } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...defaultProps} />
          </AppCtx.Provider>
        );

        fireEvent.change(getByTestId('nameInput'), { target: { value: 'name2' } });
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.change(getByTestId('homeUrlInput'), { target: { value: 'http://test.org' } });
        fireEvent.submit(getByTestId('organizationForm'));

        await waitFor(() => {
          expect(API.addOrganization).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(getByText('An error occurred adding the organization: custom error')).toBeInTheDocument();
        });
      });

      it('calls onAuthError when error is UnauthorizedError', async () => {
        mocked(API).checkAvailability.mockResolvedValue(false);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addOrganization.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });
        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...defaultProps} />
          </AppCtx.Provider>
        );

        fireEvent.change(getByTestId('nameInput'), { target: { value: 'name2' } });
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.change(getByTestId('homeUrlInput'), { target: { value: 'http://test.org' } });
        fireEvent.submit(getByTestId('organizationForm'));

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

        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...props} />
          </AppCtx.Provider>
        );

        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.submit(getByTestId('organizationForm'));

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
        const { getByTestId, getByText } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...defaultProps} organization={orgMock} />
          </AppCtx.Provider>
        );

        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.submit(getByTestId('organizationForm'));

        await waitFor(() => {
          expect(API.updateOrganization).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(getByText('An error occurred updating the organization, please try again later.')).toBeInTheDocument();
        });
      });

      it('displays custom message error', async () => {
        mocked(API).checkAvailability.mockResolvedValue(true);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).updateOrganization.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'message error',
        });
        const { getByTestId, getByText } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...defaultProps} organization={orgMock} />
          </AppCtx.Provider>
        );

        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.submit(getByTestId('organizationForm'));

        await waitFor(() => {
          expect(API.updateOrganization).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(getByText('An error occurred updating the organization: message error')).toBeInTheDocument();
        });
      });

      it('calls onAuthError when error is UnauthorizedError', async () => {
        mocked(API).checkAvailability.mockResolvedValue(true);
        mocked(API).updateOrganization.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });
        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...defaultProps} organization={orgMock} />
          </AppCtx.Provider>
        );

        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.submit(getByTestId('organizationForm'));

        await waitFor(() => {
          expect(API.updateOrganization).toHaveBeenCalledTimes(1);
        });

        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
