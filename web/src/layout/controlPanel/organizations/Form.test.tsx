import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { Organization } from '../../../types';
import OrganizationForm from './Form';
jest.mock('../../../api');

const onSuccessMock = jest.fn();
const onAuthErrorMock = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const orgMock: Organization = {
  name: 'orgTest',
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
      selectedOrg: 'orgTest',
    },
    search: { limit: 25 },
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
        mocked(API).checkAvailability.mockRejectedValue({
          status: 404,
        });
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
        mocked(API).checkAvailability.mockRejectedValue({
          status: 404,
        });
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addOrganization.mockRejectedValue({
          statusText: 'error',
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
          expect(getByText('An error occurred adding the organization, please try again later')).toBeInTheDocument();
        });
      });

      it('displays custom Api error 400', async () => {
        mocked(API).checkAvailability.mockRejectedValue({
          status: 404,
        });
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addOrganization.mockRejectedValue({
          statusText: 'error 400',
          status: 400,
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
          expect(getByText('An error occurred adding the organization: error 400')).toBeInTheDocument();
        });
      });

      it('calls onAuthError when error is ErrLoginRedirect', async () => {
        mocked(API).checkAvailability.mockRejectedValue({
          status: 404,
        });
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addOrganization.mockRejectedValue({
          statusText: 'ErrLoginRedirect',
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
        mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addOrganization.mockResolvedValue(null);
        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <OrganizationForm {...defaultProps} organization={orgMock} />
          </AppCtx.Provider>
        );

        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.submit(getByTestId('organizationForm'));

        await waitFor(() => {
          expect(API.updateOrganization).toHaveBeenCalledTimes(1);
          expect(API.updateOrganization).toHaveBeenLastCalledWith({
            ...orgMock,
            displayName: 'Pretty name',
          });
        });

        expect(onSuccessMock).toHaveBeenCalledTimes(1);
      });

      it('displays default Api error', async () => {
        mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).updateOrganization.mockRejectedValue({
          statusText: 'error',
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
          expect(getByText('An error occurred updating the organization, please try again later')).toBeInTheDocument();
        });
      });

      it('displays custom Api error 400', async () => {
        mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).updateOrganization.mockRejectedValue({
          statusText: 'error 400',
          status: 400,
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
          expect(getByText('An error occurred updating the organization: error 400')).toBeInTheDocument();
        });
      });

      it('calls onAuthError when error is ErrLoginRedirect', async () => {
        mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
        mocked(API).updateOrganization.mockRejectedValue({
          statusText: 'ErrLoginRedirect',
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
