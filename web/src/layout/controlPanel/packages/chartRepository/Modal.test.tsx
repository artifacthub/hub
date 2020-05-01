import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../../api';
import { AppCtx } from '../../../../context/AppCtx';
import { ChartRepository } from '../../../../types';
import Modal from './Modal';
jest.mock('../../../../api');

const onAuthErrorMock = jest.fn();
const onSuccessMock = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  open: true,
  onAuthError: onAuthErrorMock,
  onSuccess: onSuccessMock,
  onClose: jest.fn(),
};

const chartRepoMock: ChartRepository = {
  name: 'repoTest',
  displayName: 'Repo test',
  url: 'http://test.repo',
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

describe('Chart Repository Modal - packages section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<Modal {...defaultProps} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByTestId } = render(<Modal {...defaultProps} />);

      const form = getByTestId('chartRepoForm');
      expect(form).toBeInTheDocument();
      expect(getByTestId('nameInput')).toBeInTheDocument();
      expect(getByTestId('displayNameInput')).toBeInTheDocument();
      expect(getByTestId('urlInput')).toBeInTheDocument();
    });

    it('renders component with existing chart repo', () => {
      const { getByTestId, getByDisplayValue } = render(<Modal {...defaultProps} chartRepository={chartRepoMock} />);

      const form = getByTestId('chartRepoForm');
      expect(form).toBeInTheDocument();
      expect(getByDisplayValue(chartRepoMock.name)).toBeInTheDocument();
      expect(getByDisplayValue(chartRepoMock.displayName!)).toBeInTheDocument();
      expect(getByDisplayValue(chartRepoMock.url)).toBeInTheDocument();
    });

    describe('Add chart repo', () => {
      it('calls add chart repo', async () => {
        mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addChartRepository.mockResolvedValue(null);
        const { getByTestId, getByText } = render(<Modal {...defaultProps} />);

        expect(getByText('Add chart repository')).toBeInTheDocument();
        expect(getByText('Add')).toBeInTheDocument();
        fireEvent.change(getByTestId('nameInput'), { target: { value: 'name' } });
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.change(getByTestId('urlInput'), { target: { value: 'http://test.chart' } });
        fireEvent.click(getByTestId('chartRepoBtn'));

        await waitFor(() => {
          expect(API.addChartRepository).toHaveBeenCalledTimes(1);
          expect(API.addChartRepository).toHaveBeenCalledWith(
            {
              name: 'name',
              url: 'http://test.chart',
              displayName: 'Pretty name',
            },
            undefined
          );
        });

        expect(onSuccessMock).toHaveBeenCalledTimes(1);
      });

      it('calls add chart repo for org', async () => {
        mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addChartRepository.mockResolvedValue(null);
        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Modal {...defaultProps} />
          </AppCtx.Provider>
        );

        fireEvent.change(getByTestId('nameInput'), { target: { value: 'name' } });
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.change(getByTestId('urlInput'), { target: { value: 'http://test.chart' } });
        fireEvent.click(getByTestId('chartRepoBtn'));

        await waitFor(() => {
          expect(API.addChartRepository).toHaveBeenCalledTimes(1);
          expect(API.addChartRepository).toHaveBeenCalledWith(
            {
              name: 'name',
              url: 'http://test.chart',
              displayName: 'Pretty name',
            },
            'orgTest'
          );
        });

        expect(onSuccessMock).toHaveBeenCalledTimes(1);
      });

      it('displays default Api error', async () => {
        mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addChartRepository.mockRejectedValue({
          statusText: 'error',
        });
        const { getByTestId, getByText } = render(<Modal {...defaultProps} />);

        fireEvent.change(getByTestId('nameInput'), { target: { value: 'name2' } });
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.change(getByTestId('urlInput'), { target: { value: 'http://test.chart' } });
        fireEvent.click(getByTestId('chartRepoBtn'));

        await waitFor(() => {
          expect(API.addChartRepository).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
          expect(
            getByText('An error occurred adding the chart repository, please try again later')
          ).toBeInTheDocument();
        });
      });

      it('displays custom Api error 400', async () => {
        mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addChartRepository.mockRejectedValue({
          statusText: 'error 400',
          status: 400,
        });
        const { getByTestId, getByText } = render(<Modal {...defaultProps} />);

        fireEvent.change(getByTestId('nameInput'), { target: { value: 'name2' } });
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.change(getByTestId('urlInput'), { target: { value: 'http://test.chart' } });
        fireEvent.click(getByTestId('chartRepoBtn'));

        await waitFor(() => {
          expect(API.addChartRepository).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
          expect(getByText('An error occurred adding the chart repository: error 400')).toBeInTheDocument();
        });
      });

      it('calls onAuthError when error is ErrLoginRedirect', async () => {
        mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addChartRepository.mockRejectedValue({
          statusText: 'ErrLoginRedirect',
        });
        const { getByTestId } = render(<Modal {...defaultProps} />);

        fireEvent.change(getByTestId('nameInput'), { target: { value: 'name2' } });
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.change(getByTestId('urlInput'), { target: { value: 'http://test.chart' } });
        fireEvent.click(getByTestId('chartRepoBtn'));

        await waitFor(() => {
          expect(API.addChartRepository).toHaveBeenCalledTimes(1);
        });

        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('Update organization', () => {
      it('calls update organization', async () => {
        mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addChartRepository.mockResolvedValue(null);
        const { getByTestId, getByText } = render(<Modal {...defaultProps} chartRepository={chartRepoMock} />);

        expect(getByText('Update chart repository')).toBeInTheDocument();
        expect(getByText('Update')).toBeInTheDocument();
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.click(getByTestId('chartRepoBtn'));

        await waitFor(() => {
          expect(API.updateChartRepository).toHaveBeenCalledTimes(1);
          expect(API.updateChartRepository).toHaveBeenCalledWith(
            {
              ...chartRepoMock,
              displayName: 'Pretty name',
            },
            undefined
          );
        });

        expect(onSuccessMock).toHaveBeenCalledTimes(1);
      });

      it('calls update organization for org', async () => {
        mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addChartRepository.mockResolvedValue(null);
        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Modal {...defaultProps} chartRepository={chartRepoMock} />
          </AppCtx.Provider>
        );

        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.click(getByTestId('chartRepoBtn'));

        await waitFor(() => {
          expect(API.updateChartRepository).toHaveBeenCalledTimes(1);
          expect(API.updateChartRepository).toHaveBeenCalledWith(
            {
              ...chartRepoMock,
              displayName: 'Pretty name',
            },
            'orgTest'
          );
        });

        expect(onSuccessMock).toHaveBeenCalledTimes(1);
      });

      it('displays default Api error', async () => {
        mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).updateChartRepository.mockRejectedValue({
          statusText: 'error',
        });
        const { getByTestId, getByText } = render(<Modal {...defaultProps} chartRepository={chartRepoMock} />);

        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.click(getByTestId('chartRepoBtn'));

        await waitFor(() => {
          expect(API.updateChartRepository).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
          expect(
            getByText('An error occurred updating the chart repository, please try again later')
          ).toBeInTheDocument();
        });
      });

      it('displays custom Api error 400', async () => {
        mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).updateChartRepository.mockRejectedValue({
          statusText: 'error 400',
          status: 400,
        });
        const { getByTestId, getByText } = render(<Modal {...defaultProps} chartRepository={chartRepoMock} />);

        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.click(getByTestId('chartRepoBtn'));

        await waitFor(() => {
          expect(API.updateChartRepository).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
          expect(getByText('An error occurred updating the chart repository: error 400')).toBeInTheDocument();
        });
      });

      it('calls onAuthError when error is ErrLoginRedirect', async () => {
        mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
        mocked(API).updateChartRepository.mockRejectedValue({
          statusText: 'ErrLoginRedirect',
        });
        const { getByTestId } = render(<Modal {...defaultProps} chartRepository={chartRepoMock} />);

        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.click(getByTestId('chartRepoBtn'));

        await waitFor(() => {
          expect(API.updateChartRepository).toHaveBeenCalledTimes(1);
        });

        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
