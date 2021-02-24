import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../../../../api';
import { ErrorKind, OptOutItem } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import RepositoriesSection from './index';

jest.mock('../../../../../../api');
jest.mock('../../../../../../utils/alertDispatcher');

const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const getMockOptOut = (fixtureId: string): OptOutItem[] => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as OptOutItem[];
};

const mockOnAuthError = jest.fn();

const defaultProps = {
  onAuthError: mockOnAuthError,
};

describe('RepositoriesSection', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockOptOut = getMockOptOut('1');
    mocked(API).getOptOutList.mockResolvedValue(mockOptOut);

    const result = render(
      <Router>
        <RepositoriesSection {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockOptOut = getMockOptOut('2');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);

      const { getByText } = render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      expect(getByText('Opt-out')).toBeInTheDocument();
      expect(getByText('Kind')).toBeInTheDocument();
      expect(getByText('Repository')).toBeInTheDocument();
      expect(getByText('Publisher')).toBeInTheDocument();
      expect(getByText('Tracking errors')).toBeInTheDocument();
      expect(getByText('Scanning errors')).toBeInTheDocument();
    });

    it('opens Add opt out modal', async () => {
      const mockOptOut = getMockOptOut('2');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);

      const { getByTestId, getByRole } = render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      const btn = getByTestId('addOptOut');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      const modal = await waitFor(() => getByRole('dialog'));
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveClass('active');
    });
  });

  describe('Opt out list', () => {
    it('renders 3 items', async () => {
      const mockOptOut = getMockOptOut('3');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);

      const { getAllByTestId } = render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(getAllByTestId('optOutRow')).toHaveLength(3);
        expect(getAllByTestId('userLink')).toHaveLength(2);
        expect(getAllByTestId('orgLink')).toHaveLength(1);
        expect(getAllByTestId('repoLink')).toHaveLength(3);
      });
    });

    it('does not display list when no packages', async () => {
      const mockOptOut = getMockOptOut('4');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);

      const { queryByTestId } = render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      expect(queryByTestId('repositoriesList')).toBeNull();
    });

    it('calls alertDispatcher when getOptOutList call fails with not Unauthorized error', async () => {
      mocked(API).getOptOutList.mockRejectedValue({ kind: ErrorKind.Other });

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred getting your opt-out entries list, please try again later.',
        });
      });
    });

    it('calls history push to load login modal when user is not signed in', async () => {
      mocked(API).getOptOutList.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      const { getByText } = render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => getByText('Repositories'));

      expect(mockOnAuthError).toHaveBeenCalledTimes(1);
    });
  });

  describe('to change opt-out', () => {
    it('to deactivate active opt-out', async () => {
      const mockOptOut = getMockOptOut('5');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);
      mocked(API).deleteOptOut.mockResolvedValue('');

      const { getByTestId } = render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      const checkbox: HTMLInputElement = getByTestId(
        `subs_${mockOptOut[0].repository.repositoryId}_2_input`
      ) as HTMLInputElement;
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();

      const label = getByTestId(`subs_${mockOptOut[0].repository.repositoryId}_2_label`);
      fireEvent.click(label);

      await waitFor(() => {
        expect(API.deleteOptOut).toHaveBeenCalledTimes(1);
        expect(API.deleteOptOut).toHaveBeenCalledWith(mockOptOut[0].optOutId);
      });

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('when change opt-out entry fails', () => {
    it('generic error', async () => {
      const mockOptOut = getMockOptOut('6');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);
      mocked(API).deleteOptOut.mockRejectedValue({ kind: ErrorKind.Other });

      const { getByTestId, queryByTestId, getByRole } = render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      expect(getByTestId(`subs_${mockOptOut[0].repository.repositoryId}_2_input`)).toBeInTheDocument();

      const label = getByTestId(`subs_${mockOptOut[0].repository.repositoryId}_2_label`);
      fireEvent.click(label);

      // Loading
      await waitFor(() => {
        expect(getByRole('status')).toBeInTheDocument();
      });

      expect(API.deleteOptOut).toHaveBeenCalledTimes(1);
      expect(API.deleteOptOut).toHaveBeenCalledWith(mockOptOut[0].optOutId);

      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
        type: 'danger',
        message: `An error occurred deleting the opt-out entry for tracking errors notifications for repository ${mockOptOut[0].repository.name}, please try again later.`,
      });

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(queryByTestId(`subs_${mockOptOut[0].repository.repositoryId}_2_input`)).toBeInTheDocument();
      });
    });

    it('UnauthorizedError', async () => {
      const mockOptOut = getMockOptOut('6');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);
      mocked(API).deleteOptOut.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      const { getByTestId } = render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      const label = getByTestId(`subs_${mockOptOut[1].repository.repositoryId}_2_label`);
      fireEvent.click(label);

      await waitFor(() => {
        expect(getByTestId(`subs_${mockOptOut[1].repository.repositoryId}_2_input`)).toBeDisabled();
      });

      await waitFor(() => {
        expect(API.deleteOptOut).toHaveBeenCalledTimes(1);
        expect(API.deleteOptOut).toHaveBeenCalledWith(mockOptOut[1].optOutId);
      });

      await waitFor(() => {
        expect(mockOnAuthError).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('click links', () => {
    it('on user link click', async () => {
      const mockOptOut = getMockOptOut('7');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);

      const { queryAllByTestId } = render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      const links = queryAllByTestId('userLink');
      expect(links).toHaveLength(2);
      fireEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?page=1&user=alias');
    });

    it('on org link click', async () => {
      const mockOptOut = getMockOptOut('8');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);

      const { getByTestId } = render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      const link = getByTestId('orgLink');
      fireEvent.click(link);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?page=1&org=artifactHub');
    });

    it('on repo link click', async () => {
      const mockOptOut = getMockOptOut('9');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);

      const { queryAllByTestId } = render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      const links = queryAllByTestId('repoLink');
      expect(links).toHaveLength(3);
      fireEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?page=1&repo=adfinis');
    });
  });

  describe('renders component with different event kinds', () => {
    it('renders properly', async () => {
      const mockOptOut = getMockOptOut('10');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);

      const { getAllByTestId, getByTestId } = render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(getAllByTestId('optOutRow')).toHaveLength(2);

        const input1 = getByTestId(`subs_b4b4973f-08f0-430a-acb3-2c6ec5449495_2_input`);
        expect(input1).toBeInTheDocument();
        expect(input1).toBeChecked();
        const input2 = getByTestId(`subs_b4b4973f-08f0-430a-acb3-2c6ec5449495_4_input`);
        expect(input2).toBeInTheDocument();
        expect(input2).toBeChecked();
        const input3 = getByTestId(`subs_38b8d828-27a9-42a2-81ce-19b24d3e2fad_2_input`);
        expect(input3).toBeInTheDocument();
        expect(input3).not.toBeChecked();
        const input4 = getByTestId(`subs_38b8d828-27a9-42a2-81ce-19b24d3e2fad_4_input`);
        expect(input4).toBeInTheDocument();
        expect(input4).toBeChecked();
      });
    });

    it('to activate opt-out for RepositoryScanningErrors', async () => {
      const mockOptOut = getMockOptOut('11');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);
      mocked(API).addOptOut.mockResolvedValue('');

      const { getByTestId, getByRole } = render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      const input = getByTestId('subs_38b8d828-27a9-42a2-81ce-19b24d3e2fad_4_input');
      expect(input).not.toBeChecked();

      const label = getByTestId('subs_38b8d828-27a9-42a2-81ce-19b24d3e2fad_4_label');
      fireEvent.click(label);

      // Loading
      await waitFor(() => {
        expect(getByRole('status')).toBeInTheDocument();
        expect(input).toBeDisabled();
      });

      expect(API.addOptOut).toHaveBeenCalledTimes(1);
      expect(API.addOptOut).toHaveBeenCalledWith('38b8d828-27a9-42a2-81ce-19b24d3e2fad', 4);

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(2);
      });
    });
  });
});
