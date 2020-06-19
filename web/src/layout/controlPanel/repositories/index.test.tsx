import { fireEvent, render, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { Repository as Repo } from '../../../types';
import Repository from './index';
jest.mock('../../../api');

const getMockRepository = (fixtureId: string): Repo[] => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as Repo[];
};

const onAuthErrorMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
};

describe('Repository index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockRepository = getMockRepository('1');
    mocked(API).getRepositories.mockResolvedValue(mockRepository);

    const result = render(
      <Router>
        <Repository {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockRepository = getMockRepository('2');
      mocked(API).getRepositories.mockResolvedValue(mockRepository);

      render(
        <Router>
          <Repository {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getRepositories).toHaveBeenCalledTimes(1);
      });
    });

    it('removes loading spinner after getting repositories', async () => {
      const mockRepository = getMockRepository('3');
      mocked(API).getRepositories.mockResolvedValue(mockRepository);

      const { getByRole } = render(
        <Router>
          <Repository {...defaultProps} />
        </Router>
      );

      const spinner = await waitForElementToBeRemoved(() => getByRole('status'));

      expect(spinner).toBeTruthy();
      await waitFor(() => {});
    });

    it('displays no data component when no repositories', async () => {
      const mockRepository = getMockRepository('4');
      mocked(API).getRepositories.mockResolvedValue(mockRepository);

      const { getByTestId, getByText } = render(
        <Router>
          <Repository {...defaultProps} />
        </Router>
      );

      const noData = await waitFor(() => getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(getByText('Add your first repository!')).toBeInTheDocument();
      expect(getByTestId('addFirstRepoBtn')).toBeInTheDocument();

      await waitFor(() => {});
    });

    it('renders list with 3 repositories', async () => {
      const mockRepository = getMockRepository('5');
      mocked(API).getRepositories.mockResolvedValue(mockRepository);

      const { getByTestId, getAllByTestId } = render(
        <Router>
          <Repository {...defaultProps} />
        </Router>
      );

      const list = await waitFor(() => getByTestId('repoList'));

      expect(list).toBeInTheDocument();
      expect(getAllByTestId('repoCard')).toHaveLength(3);

      await waitFor(() => {});
    });

    it('calls getRepositories to click Refresh button', async () => {
      const mockRepository = getMockRepository('6');
      mocked(API).getRepositories.mockResolvedValue(mockRepository);

      const { getByTestId } = render(
        <Router>
          <Repository {...defaultProps} />
        </Router>
      );

      const refreshBtn = await waitFor(() => getByTestId('refreshRepoBtn'));
      expect(refreshBtn).toBeInTheDocument();
      fireEvent.click(refreshBtn);
      expect(API.getRepositories).toHaveBeenCalledTimes(2);

      await waitFor(() => {});
    });
  });

  describe('when getRepositories fails', () => {
    it('on 401 error', async () => {
      mocked(API).getRepositories.mockRejectedValue({ statusText: 'ErrLoginRedirect' });

      render(
        <Router>
          <Repository {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getRepositories).toHaveBeenCalledTimes(1);
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });

    it('on error different to 401', async () => {
      mocked(API).getRepositories.mockRejectedValue({ status: 500 });

      const { getByTestId } = render(
        <Router>
          <Repository {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getRepositories).toHaveBeenCalledTimes(1);
      });

      const noData = getByTestId('noData');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(/An error occurred getting the repositories, please try again later/i);
    });
  });
});
