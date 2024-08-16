import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../../../../../api';
import { ErrorKind } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import RepositoriesSection from './index';

jest.mock('../../../../../../api');
jest.mock('../../../../../../utils/alertDispatcher');

const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const getMockOptOut = (fixtureId: string) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
    mocked(API).getAllOptOut.mockResolvedValue(mockOptOut);

    const { asFragment } = render(
      <Router>
        <RepositoriesSection {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.getAllOptOut).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Kind')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockOptOut = getMockOptOut('2');
      mocked(API).getAllOptOut.mockResolvedValue(mockOptOut);

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getAllOptOut).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('Opt-out')).toBeInTheDocument();
      expect(await screen.findByText('Kind')).toBeInTheDocument();
      expect(screen.getByText('Repository')).toBeInTheDocument();
      expect(screen.getByText('Publisher')).toBeInTheDocument();
      expect(screen.getByText('Tracking errors')).toBeInTheDocument();
      expect(screen.getByText('Scanning errors')).toBeInTheDocument();
    });

    it('opens Add opt out modal', async () => {
      const mockOptOut = getMockOptOut('2');
      mocked(API).getAllOptOut.mockResolvedValue(mockOptOut);

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getAllOptOut).toHaveBeenCalledTimes(1);
      });

      const btn = await screen.findByRole('button', { name: 'Open opt-out modal' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      const modal = await screen.findByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveClass('active');
    });
  });

  describe('Opt out list', () => {
    it('renders 3 items', async () => {
      const mockOptOut = getMockOptOut('3');
      mocked(API).getAllOptOut.mockResolvedValue(mockOptOut);

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
      mocked(API).getAllOptOut.mockResolvedValue(mockOptOut);

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getAllOptOut).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('repositoriesList')).toBeNull();
      });
    });

    it('calls alertDispatcher when getAllOptOut call fails with not Unauthorized error', async () => {
      mocked(API).getAllOptOut.mockRejectedValue({ kind: ErrorKind.Other });

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

    it('calls navigate to load login modal when user is not signed in', async () => {
      mocked(API).getAllOptOut.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      expect(await screen.findByText('Repositories')).toBeInTheDocument();
      await waitFor(() => {
        expect(mockOnAuthError).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('to change opt-out', () => {
    xit('to deactivate active opt-out', async () => {
      const mockOptOut = getMockOptOut('5');
      mocked(API).getAllOptOut.mockResolvedValue(mockOptOut);
      mocked(API).deleteOptOut.mockResolvedValue('');

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getAllOptOut).toHaveBeenCalledTimes(1);
      });

      const checkbox: HTMLInputElement = (await screen.findByTestId(
        `subs_${mockOptOut[0].repository.repositoryId}_2_input`
      )) as HTMLInputElement;
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();

      await userEvent.click(checkbox);

      await waitFor(() => {
        expect(API.deleteOptOut).toHaveBeenCalledTimes(1);
        expect(API.deleteOptOut).toHaveBeenCalledWith(mockOptOut[0].optOutId);
      });

      await waitFor(() => {
        expect(API.getAllOptOut).toHaveBeenCalledTimes(2);
      });

      expect(await screen.findByText('Repositories')).toBeInTheDocument();
    });
  });

  describe('when change opt-out entry fails', () => {
    it('generic error', async () => {
      const mockOptOut = getMockOptOut('6');
      mocked(API).getAllOptOut.mockResolvedValue(mockOptOut);
      mocked(API).deleteOptOut.mockRejectedValue({ kind: ErrorKind.Other });

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getAllOptOut).toHaveBeenCalledTimes(1);
      });

      const input = await screen.findByTestId(`subs_${mockOptOut[0].repository.repositoryId}_2_input`);
      expect(input).toBeInTheDocument();
      await userEvent.click(input);

      await waitFor(() => {
        expect(screen.queryByRole('status')).toBeNull();
      });

      await waitFor(() => {
        expect(API.deleteOptOut).toHaveBeenCalledTimes(1);
        expect(API.deleteOptOut).toHaveBeenCalledWith(mockOptOut[0].optOutId);
      });

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: `An error occurred deleting the opt-out entry for tracking errors notifications for repository ${mockOptOut[0].repository.name}, please try again later.`,
        });
      });

      await waitFor(() => {
        expect(API.getAllOptOut).toHaveBeenCalledTimes(2);
      });

      expect(await screen.findByTestId(`subs_${mockOptOut[0].repository.repositoryId}_2_input`)).toBeInTheDocument();
    });

    xit('UnauthorizedError', async () => {
      const mockOptOut = getMockOptOut('6');
      mocked(API).getAllOptOut.mockResolvedValue(mockOptOut);
      mocked(API).deleteOptOut.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getAllOptOut).toHaveBeenCalledTimes(1);
      });

      const input = await screen.findByTestId(`subs_${mockOptOut[1].repository.repositoryId}_2_input`);
      await userEvent.click(input);

      await waitFor(() => {
        expect(input).toBeDisabled();
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
      mocked(API).getAllOptOut.mockResolvedValue(mockOptOut);

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getAllOptOut).toHaveBeenCalledTimes(1);
      });

      const links = await screen.findAllByTestId('userLink');
      expect(links).toHaveLength(2);
      await userEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?user=alias&sort=relevance&page=1');
    });

    it('on org link click', async () => {
      const mockOptOut = getMockOptOut('8');
      mocked(API).getAllOptOut.mockResolvedValue(mockOptOut);

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getAllOptOut).toHaveBeenCalledTimes(1);
      });

      const link = await screen.findByTestId('orgLink');
      await userEvent.click(link);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?org=artifactHub&sort=relevance&page=1');
    });

    it('on repo link click', async () => {
      const mockOptOut = getMockOptOut('9');
      mocked(API).getAllOptOut.mockResolvedValue(mockOptOut);

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getAllOptOut).toHaveBeenCalledTimes(1);
      });

      const links = await screen.findAllByTestId('repoLink');
      expect(links).toHaveLength(3);
      await userEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?repo=adfinis&sort=relevance&page=1');
    });
  });

  describe('renders component with different event kinds', () => {
    it('renders properly', async () => {
      const mockOptOut = getMockOptOut('10');
      mocked(API).getAllOptOut.mockResolvedValue(mockOptOut);

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      expect(await screen.findAllByTestId('optOutRow')).toHaveLength(2);

      const input1 = await screen.findByTestId(`subs_b4b4973f-08f0-430a-acb3-2c6ec5449495_2_input`);
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

    xit('to activate opt-out for RepositoryScanningErrors', async () => {
      const mockOptOut = getMockOptOut('11');
      mocked(API).getAllOptOut.mockResolvedValue(mockOptOut);
      mocked(API).addOptOut.mockResolvedValue('');

      render(
        <Router>
          <RepositoriesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getAllOptOut).toHaveBeenCalledTimes(1);
      });

      const input = await screen.findByTestId('subs_38b8d828-27a9-42a2-81ce-19b24d3e2fad_4_input');
      expect(input).not.toBeChecked();
      await userEvent.click(input);

      // Loading
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(input).toBeDisabled();
      });

      expect(API.addOptOut).toHaveBeenCalledTimes(1);
      expect(API.addOptOut).toHaveBeenCalledWith('38b8d828-27a9-42a2-81ce-19b24d3e2fad', 4);

      await waitFor(() => {
        expect(API.getAllOptOut).toHaveBeenCalledTimes(2);
      });
    });
  });
});
