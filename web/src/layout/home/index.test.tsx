import { render, screen, waitFor } from '@testing-library/react';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../api';
import { ErrorKind, Stats } from '../../types';
import HomeView from './index';
jest.mock('../../api');
jest.mock('./SearchTip', () => () => <div />);
jest.mock('../common/SampleQueries', () => () => <div />);
jest.mock('./RandomPackages', () => () => <div />);
jest.mock('../../utils/bannerDispatcher', () => ({
  getBanner: () => null,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockOutletContextData: any = {
  isSearching: false,
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useOutletContext: () => mockOutletContextData,
}));

const getMockStats = (fixtureId: string): Stats => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/index/${fixtureId}.json`) as Stats;
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
        <HomeView />
      </Router>
    );

    await waitFor(() => {
      expect(API.getStats).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Cloud Native packages')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockStats = getMockStats('2');
      mocked(API).getStats.mockResolvedValue(mockStats);

      render(
        <Router>
          <HomeView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getStats).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('Cloud Native packages')).toBeInTheDocument();
    });

    it('renders dash symbol when results are 0', async () => {
      const mockStats = getMockStats('4');
      mocked(API).getStats.mockResolvedValue(mockStats);

      render(
        <Router>
          <HomeView />
        </Router>
      );

      const emptyStats = await screen.findAllByText('-');
      expect(emptyStats).toHaveLength(2);
    });

    it('renders dash symbol when getStats call fails', async () => {
      mocked(API).getStats.mockRejectedValue({ kind: ErrorKind.Other });

      render(
        <Router>
          <HomeView />
        </Router>
      );

      await waitFor(() => expect(API.getStats).toHaveBeenCalledTimes(1));
      expect(await screen.findAllByText('-')).toHaveLength(2);
    });

    it('renders project definition', async () => {
      const mockStats = getMockStats('5');
      mocked(API).getStats.mockResolvedValue(mockStats);

      render(
        <Router>
          <HomeView />
        </Router>
      );

      const heading = await screen.findByRole('banner');
      expect(heading).toBeInTheDocument();
      expect(await screen.findByText(/Find, install and publish/)).toBeInTheDocument();
      expect(await screen.findByText('Cloud Native packages')).toBeInTheDocument();
    });
  });

  describe('External links', () => {
    it('renders proper links', async () => {
      const mockStats = getMockStats('5');
      mocked(API).getStats.mockResolvedValue(mockStats);

      render(
        <Router>
          <HomeView />
        </Router>
      );

      await waitFor(() => expect(API.getStats).toHaveBeenCalledTimes(1));

      const links = await screen.findAllByRole('button');
      expect(links).toHaveLength(30);

      expect(links[2]).toHaveProperty('href', 'https://github.com/artifacthub/hub');
      expect(links[3]).toHaveProperty('href', 'https://cloud-native.slack.com/channels/artifact-hub');
      expect(links[4]).toHaveProperty('href', 'https://twitter.com/cncfartifacthub');

      // Docs link
      expect(links[5]).toHaveProperty('href', 'http://localhost/docs/topics/repositories');

      // Packages
      expect(links[6]).toHaveProperty('href', 'https://argoproj.github.io/argo-workflows/');
      expect(links[7]).toHaveProperty('href', 'https://backstage.io/plugins');
      expect(links[8]).toHaveProperty('href', 'https://opencontainers.org/');
      expect(links[9]).toHaveProperty('href', 'https://coredns.io/');
      expect(links[10]).toHaveProperty('href', 'https://falco.org/');
      expect(links[11]).toHaveProperty('href', 'https://headlamp.dev/');
      expect(links[12]).toHaveProperty('href', 'https://helm.sh/');
      expect(links[13]).toHaveProperty('href', 'https://www.inspektor-gadget.io/');
      expect(links[14]).toHaveProperty('href', 'https://kcl-lang.io/');
      expect(links[15]).toHaveProperty('href', 'https://keda.sh/');
      expect(links[16]).toHaveProperty('href', 'https://keptn.sh/');
      expect(links[17]).toHaveProperty('href', 'https://github.com/knative/client');
      expect(links[18]).toHaveProperty('href', 'https://krew.sigs.k8s.io/');
      expect(links[19]).toHaveProperty('href', 'https://kubearmor.io/');
      expect(links[20]).toHaveProperty('href', 'https://www.kubewarden.io/');
      expect(links[21]).toHaveProperty('href', 'https://www.kyverno.io/');
      expect(links[22]).toHaveProperty('href', 'https://meshery.io/');
      expect(links[23]).toHaveProperty('href', 'https://github.com/operator-framework');
      expect(links[24]).toHaveProperty('href', 'https://www.openpolicyagent.org/');
      expect(links[25]).toHaveProperty('href', 'https://www.opencost.io/');
      expect(links[26]).toHaveProperty('href', 'https://radapp.io/');
      expect(links[27]).toHaveProperty('href', 'https://tekton.dev/');
      expect(links[28]).toHaveProperty('href', 'https://tinkerbell.org/');

      expect(links[29]).toHaveProperty('href', 'https://www.cncf.io/projects/');
    });
  });
});
