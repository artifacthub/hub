import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import API from '../../../../../../api';
import { ErrorKind } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import RepositoriesSection from './index';

jest.mock('../../../../../../api');
jest.mock('../../../../../../utils/alertDispatcher');

const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const getMockOptOut = (fixtureId: string) => {
  return require(`./__fixtures__/index/${fixtureId}.json`);
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

    const { asFragment } = render(
      <Router>
        <RepositoriesSection {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockOptOut = getMockOptOut('2');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText('Opt-out')).toBeInTheDocument();
      expect(screen.getByText('Kind')).toBeInTheDocument();
      expect(screen.getByText('Repository')).toBeInTheDocument();
      expect(screen.getByText('Publisher')).toBeInTheDocument();
      expect(screen.getByText('Tracking errors')).toBeInTheDocument();
      expect(screen.getByText('Scanning errors')).toBeInTheDocument();
    });

    it('opens Add opt out modal', async () => {
      const mockOptOut = getMockOptOut('2');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      const btn = screen.getByRole('button', { name: 'Open opt-out modal' });
      expect(btn).toBeInTheDocument();
      userEvent.click(btn);

      const modal = await screen.findByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveClass('active');
    });
  });

  describe('Opt out list', () => {
    it('renders 3 items', async () => {
      const mockOptOut = getMockOptOut('3');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      expect(await screen.findAllByTestId('optOutRow')).toHaveLength(3);
      expect(screen.getAllByTestId('userLink')).toHaveLength(2);
      expect(screen.getAllByTestId('orgLink')).toHaveLength(1);
      expect(screen.getAllByTestId('repoLink')).toHaveLength(3);
    });

    it('does not display list when no packages', async () => {
      const mockOptOut = getMockOptOut('4');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      expect(screen.queryByTestId('repositoriesList')).toBeNull();
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

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      expect(await screen.findByText('Repositories')).toBeInTheDocument();
      expect(mockOnAuthError).toHaveBeenCalledTimes(1);
    });
  });

  describe('to change opt-out', () => {
    it('to deactivate active opt-out', async () => {
      const mockOptOut = getMockOptOut('5');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);
      mocked(API).deleteOptOut.mockResolvedValue('');

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      const checkbox: HTMLInputElement = screen.getByTestId(
        `subs_${mockOptOut.items[0].repository.repositoryId}_2_input`
      ) as HTMLInputElement;
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();

      const label = screen.getByTestId(`subs_${mockOptOut.items[0].repository.repositoryId}_2_label`);
      userEvent.click(label);

      await waitFor(() => {
        expect(API.deleteOptOut).toHaveBeenCalledTimes(1);
        expect(API.deleteOptOut).toHaveBeenCalledWith(mockOptOut.items[0].optOutId);
      });

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(2);
      });
    });

    it('loads first page when not subscriptions after deleting one', async () => {
      const mockOptOut = getMockOptOut('12');
      mocked(API).deleteOptOut.mockResolvedValue('');

      mocked(API)
        .getOptOutList.mockResolvedValue(mockOptOut)
        .mockResolvedValueOnce(mockOptOut)
        .mockResolvedValueOnce(mockOptOut)
        .mockResolvedValueOnce({
          items: [],
          paginationTotalCount: '12',
        });

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
        expect(API.getOptOutList).toHaveBeenCalledWith({ limit: 10, offset: 0 });
      });

      const nextBtn = screen.getAllByRole('button', { name: 'Open page 2' });
      userEvent.click(nextBtn[1]);

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(2);
        expect(API.getOptOutList).toHaveBeenCalledWith({ limit: 10, offset: 10 });
      });

      const label = screen.getByTestId(`subs_${mockOptOut.items[0].repository.repositoryId}_2_label`);
      userEvent.click(label);

      await waitFor(() => {
        expect(API.deleteOptOut).toHaveBeenCalledTimes(1);
        expect(API.getOptOutList).toHaveBeenCalledTimes(4);
        expect(API.getOptOutList).toHaveBeenCalledWith({ limit: 10, offset: 10 });
        expect(API.getOptOutList).toHaveBeenCalledWith({ limit: 10, offset: 0 });
      });
    });
  });

  describe('when change opt-out entry fails', () => {
    it('generic error', async () => {
      const mockOptOut = getMockOptOut('6');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);
      mocked(API).deleteOptOut.mockRejectedValue({ kind: ErrorKind.Other });

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByTestId(`subs_${mockOptOut.items[0].repository.repositoryId}_2_input`)).toBeInTheDocument();

      const label = screen.getByTestId(`subs_${mockOptOut.items[0].repository.repositoryId}_2_label`);
      userEvent.click(label);

      // Loading
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      expect(API.deleteOptOut).toHaveBeenCalledTimes(1);
      expect(API.deleteOptOut).toHaveBeenCalledWith(mockOptOut.items[0].optOutId);

      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
        type: 'danger',
        message: `An error occurred deleting the opt-out entry for tracking errors notifications for repository ${mockOptOut.items[0].repository.name}, please try again later.`,
      });

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(2);
      });

      expect(
        await screen.findByTestId(`subs_${mockOptOut.items[0].repository.repositoryId}_2_input`)
      ).toBeInTheDocument();
    });

    it('UnauthorizedError', async () => {
      const mockOptOut = getMockOptOut('6');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);
      mocked(API).deleteOptOut.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      const label = screen.getByTestId(`subs_${mockOptOut.items[1].repository.repositoryId}_2_label`);
      userEvent.click(label);

      await waitFor(() => {
        expect(screen.getByTestId(`subs_${mockOptOut.items[1].repository.repositoryId}_2_input`)).toBeDisabled();
      });

      await waitFor(() => {
        expect(API.deleteOptOut).toHaveBeenCalledTimes(1);
        expect(API.deleteOptOut).toHaveBeenCalledWith(mockOptOut.items[1].optOutId);
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

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      const links = screen.queryAllByTestId('userLink');
      expect(links).toHaveLength(2);
      userEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?user=alias&sort=relevance&page=1');
    });

    it('on org link click', async () => {
      const mockOptOut = getMockOptOut('8');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      const link = screen.getByTestId('orgLink');
      userEvent.click(link);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?org=artifactHub&sort=relevance&page=1');
    });

    it('on repo link click', async () => {
      const mockOptOut = getMockOptOut('9');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      const links = screen.queryAllByTestId('repoLink');
      expect(links).toHaveLength(3);
      userEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?repo=adfinis&sort=relevance&page=1');
    });
  });

  describe('renders component with different event kinds', () => {
    it('renders properly', async () => {
      const mockOptOut = getMockOptOut('10');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      expect(await screen.findAllByTestId('optOutRow')).toHaveLength(2);

      const input1 = screen.getByTestId(`subs_b4b4973f-08f0-430a-acb3-2c6ec5449495_2_input`);
      expect(input1).toBeInTheDocument();
      expect(input1).toBeChecked();
      const input2 = screen.getByTestId(`subs_b4b4973f-08f0-430a-acb3-2c6ec5449495_4_input`);
      expect(input2).toBeInTheDocument();
      expect(input2).toBeChecked();
      const input3 = screen.getByTestId(`subs_38b8d828-27a9-42a2-81ce-19b24d3e2fad_2_input`);
      expect(input3).toBeInTheDocument();
      expect(input3).not.toBeChecked();
      const input4 = screen.getByTestId(`subs_38b8d828-27a9-42a2-81ce-19b24d3e2fad_4_input`);
      expect(input4).toBeInTheDocument();
      expect(input4).toBeChecked();
    });

    it('to activate opt-out for RepositoryScanningErrors', async () => {
      const mockOptOut = getMockOptOut('11');
      mocked(API).getOptOutList.mockResolvedValue(mockOptOut);
      mocked(API).addOptOut.mockResolvedValue('');

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getOptOutList).toHaveBeenCalledTimes(1);
      });

      const input = screen.getByTestId('subs_38b8d828-27a9-42a2-81ce-19b24d3e2fad_4_input');
      expect(input).not.toBeChecked();

      const label = screen.getByTestId('subs_38b8d828-27a9-42a2-81ce-19b24d3e2fad_4_label');
      userEvent.click(label);

      // Loading
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
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
