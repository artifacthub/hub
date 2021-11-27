import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import API from '../../api';
import { ErrorKind, Stats } from '../../types';
import HomeView from './index';
jest.mock('../../api');
jest.mock('./SearchTip', () => () => <div />);
jest.mock('../common/SampleQueries', () => () => <div />);
jest.mock('./RandomPackages', () => () => <div />);

const getMockStats = (fixtureId: string): Stats => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as Stats;
};

const defaultProps = {
  isSearching: true,
  onOauthFailed: false,
};

describe('Home index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockStats = getMockStats('1');
    mocked(API).getStats.mockResolvedValue(mockStats);

    const { asFragment } = render(
      <Router>
        <HomeView {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.getStats).toHaveBeenCalledTimes(1);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockStats = getMockStats('2');
      mocked(API).getStats.mockResolvedValue(mockStats);

      render(
        <Router>
          <HomeView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getStats).toHaveBeenCalledTimes(1);
      });
    });

    it('renders dash symbol when results are 0', async () => {
      const mockStats = getMockStats('4');
      mocked(API).getStats.mockResolvedValue(mockStats);

      const props = {
        ...defaultProps,
        isSearching: true,
      };

      render(
        <Router>
          <HomeView {...props} />
        </Router>
      );

      const emptyStats = await screen.findAllByText('-');
      expect(emptyStats).toHaveLength(2);
    });

    it('renders dash symbol when getStats call fails', async () => {
      mocked(API).getStats.mockRejectedValue({ kind: ErrorKind.Other });

      const props = {
        ...defaultProps,
        isSearching: true,
      };

      render(
        <Router>
          <HomeView {...props} />
        </Router>
      );

      await waitFor(() => expect(API.getStats).toHaveBeenCalledTimes(1));
      expect(screen.getAllByText('-')).toHaveLength(2);
    });

    it('renders project definition', async () => {
      const mockStats = getMockStats('5');
      mocked(API).getStats.mockResolvedValue(mockStats);

      render(
        <Router>
          <HomeView {...defaultProps} />
        </Router>
      );

      const heading = await screen.findByRole('banner');
      expect(heading).toBeInTheDocument();
      expect(screen.getByText(/Find, install and publish/g)).toBeInTheDocument();
      expect(screen.getByText('Kubernetes packages')).toBeInTheDocument();
    });
  });

  describe('External links', () => {
    it('renders proper links', async () => {
      const mockStats = getMockStats('5');
      mocked(API).getStats.mockResolvedValue(mockStats);

      render(
        <Router>
          <HomeView {...defaultProps} />
        </Router>
      );

      await waitFor(() => expect(API.getStats).toHaveBeenCalledTimes(1));

      const links = screen.getAllByRole('button');
      expect(links).toHaveLength(17);

      expect(links[2]).toHaveProperty('href', 'https://github.com/cncf/hub');
      expect(links[3]).toHaveProperty('href', 'https://cloud-native.slack.com/channels/artifact-hub');
      expect(links[4]).toHaveProperty('href', 'https://twitter.com/cncfartifacthub');

      // Docs link
      expect(links[5]).toHaveProperty('href', 'http://localhost/docs/topics/repositories');

      // Packages
      expect(links[6]).toHaveProperty('href', 'https://helm.sh/');
      expect(links[7]).toHaveProperty('href', 'https://falco.org/');
      expect(links[8]).toHaveProperty('href', 'https://www.openpolicyagent.org/');
      expect(links[9]).toHaveProperty('href', 'https://github.com/operator-framework');
      expect(links[10]).toHaveProperty('href', 'https://tinkerbell.org/');
      expect(links[11]).toHaveProperty('href', 'https://krew.sigs.k8s.io/');
      expect(links[12]).toHaveProperty('href', 'https://tekton.dev/');
      expect(links[13]).toHaveProperty('href', 'https://keda.sh/');
      expect(links[14]).toHaveProperty('href', 'https://coredns.io/');
      expect(links[15]).toHaveProperty('href', 'https://keptn.sh/');

      expect(links[16]).toHaveProperty('href', 'https://www.cncf.io/sandbox-projects/');
    });
  });
});
