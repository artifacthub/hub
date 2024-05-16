import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../../api';
import { ErrorKind } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import Values from './';
jest.mock('../../../api');
jest.mock('../../../utils/alertDispatcher');

const mockUseNavigate = jest.fn();
const scrollToMock = jest.fn();
const itemScrollMock = jest.fn();

Object.defineProperty(HTMLElement.prototype, 'scroll', { configurable: true, value: itemScrollMock });
window.HTMLElement.prototype.scrollTo = scrollToMock;

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

jest.mock('react-syntax-highlighter', () => () => <div id="line_59">port:</div>);

const defaultProps = {
  packageId: 'id',
  version: '0.1.0',
  visibleValues: false,
  normalizedName: 'pkg',
  sortedVersions: [
    { version: '1.1.1', ts: 1, containsSecurityUpdates: false, prerelease: false },
    { version: '1.1.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
    { version: '1.0.1', ts: 1, containsSecurityUpdates: false, prerelease: false },
    { version: '1.0.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
  ],
};

const YAMLSample = `nameOverride: ""
fullnameOverride: ""
imagePullSecrets: []
imageTag: ""
dynamicResourceNamePrefixEnabled: false
pullPolicy: IfNotPresent
restrictedHTTPClient: false

log:
  level: info
  pretty: false

db:
  host: ""
  port: "5432"
  database: hub
  user: postgres
  password: postgres

email:
  fromName: ""
  from: ""
  replyTo: ""
  smtp:
    auth: plain
    host: ""
    port: 587
    username: ""
    password: ""

creds:
  dockerUsername: ""
  dockerPassword: ""
  githubToken: ""

images:
  store: pg

events:
  scanningErrors: false
  trackingErrors: false

dbMigrator:
  job:
    image:
      repository: artifacthub/db-migrator
  loadSampleData: true
  configDir: "/home/db-migrator/.cfg"

hub:
  ingress:
    enabled: true
    annotations:
      kubernetes.io/ingress.class: nginx
    rules: []
    tls: []
  service:
    type: NodePort
    port: 80
  deploy:
    readinessGates: []
    replicaCount: 1
    image:
      repository: artifacthub/hub
    resources: {}
  server:
    allowPrivateRepositories: false
    allowUserSignUp: true
    cacheDir: ""
    configDir: "/home/hub/.cfg"
    baseURL: ""
    shutdownTimeout: 10s
    motd: ""
    motdSeverity: info
    basicAuth:
      enabled: false
      username: hub
      password: changeme
    cookie:
      hashKey: default-unsafe-key
      secure: false
    csrf:
      authKey: default-unsafe-key
      secure: false
    oauth:
      github:
        enabled: false
        clientID: ""
        clientSecret: ""
        redirectURL: ""
        scopes:
          - read:user
          - user:email
      google:
        enabled: false
        clientID: ""
        clientSecret: ""
        redirectURL: ""
        scopes:
          - https://www.googleapis.com/auth/userinfo.email
          - https://www.googleapis.com/auth/userinfo.profile
      oidc:
        enabled: false
        issuerURL: ""
        clientID: ""
        clientSecret: ""
        redirectURL: ""
        scopes:
          - openid
          - profile
          - email
        skipEmailVerifiedCheck: false
    xffIndex: 0
  analytics:
    gaTrackingID: ""
  theme:
    colors:
      primary: "#417598"
      secondary: "#2D4857"
    images:
      appleTouchIcon192: "/static/media/logo192_v2.png"
      appleTouchIcon512: "/static/media/logo512_v2.png"
      openGraphImage: "/static/media/artifactHub_v2.png"
      shortcutIcon: "/static/media/logo_v2.png"
      websiteLogo: "/static/media/logo/artifacthub-brand-white.svg"
    sampleQueries: []
    siteName: "Artifact hub"

scanner:
  cronjob:
    image:
      repository: artifacthub/scanner
    resources: {}
  concurrency: 10
  trivyURL: ""
  cacheDir: ""
  configDir: "/home/scanner/.cfg"

tracker:
  cronjob:
    image:
      repository: artifacthub/tracker
    resources: {}
  cacheDir: ""
  configDir: "/home/tracker/.cfg"
  concurrency: 10
  repositoriesNames: []
  repositoriesKinds: []
  bypassDigestCheck: false

trivy:
  deploy:
    image: aquasec/trivy:0.20.2
    resources: {}
  persistence:
    enabled: false
    size: 10Gi

# Values for postgresql chart dependency
postgresql:
  enabled: true
  image:
    repository: postgres
    tag: 12
  persistence:
    mountPath: /data
  postgresqlUsername: postgres
  postgresqlPassword: postgres
  postgresqlDatabase: hub
  postgresqlDataDir: /data/pgdata
`;

describe('Values', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    mocked(API).getChartValues.mockResolvedValue(YAMLSample);

    const { asFragment } = render(
      <Router>
        <Values {...defaultProps} visibleValues />
      </Router>
    );

    await waitFor(() => {
      expect(API.getChartValues).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      mocked(API).getChartValues.mockResolvedValue(YAMLSample);

      render(
        <Router>
          <Values {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: /Open default values modal/ });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(1);
        expect(API.getChartValues).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    });

    it('opens modal', async () => {
      mocked(API).getChartValues.mockResolvedValue(YAMLSample);

      render(
        <Router>
          <Values {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: /Open default values modal/ });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(1);
        expect(mockUseNavigate).toHaveBeenCalledTimes(1);
        expect(mockUseNavigate).toHaveBeenCalledWith(
          {
            search: '?modal=values',
          },
          { replace: true, state: null }
        );
      });

      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
      expect(screen.getAllByText('Default values')).toHaveLength(2);
    });

    it('closes modal', async () => {
      mocked(API).getChartValues.mockResolvedValue(YAMLSample);

      render(
        <Router>
          <Values {...defaultProps} visibleValues />
        </Router>
      );

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      const close = screen.getByRole('button', { name: 'Close modal' });
      await userEvent.click(close);

      expect(mockUseNavigate).toHaveBeenCalledTimes(1);
      expect(mockUseNavigate).toHaveBeenCalledWith('', { replace: true, state: null });

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('opens modal with empty values', async () => {
      mocked(API).getChartValues.mockResolvedValue('');

      render(
        <Router>
          <Values {...defaultProps} visibleValues />
        </Router>
      );

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
    });

    it('calls again to getChartValues when version is different', async () => {
      mocked(API).getChartValues.mockResolvedValue(YAMLSample);

      const { rerender } = render(
        <Router>
          <Values {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: /Open default values modal/ });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(1);
        expect(API.getChartValues).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      const close = screen.getByText('Close');
      await userEvent.click(close);

      rerender(
        <Router>
          <Values {...defaultProps} version="1.0.0" />
        </Router>
      );

      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(2);
        expect(API.getChartValues).toHaveBeenCalledWith(defaultProps.packageId, '1.0.0');
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('calls again to getChartValues when packageId is different', async () => {
      mocked(API).getChartValues.mockResolvedValue(YAMLSample);

      const { rerender } = render(
        <Router>
          <Values {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: /Open default values modal/ });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(1);
        expect(API.getChartValues).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      const close = screen.getByText('Close');
      await userEvent.click(close);

      rerender(
        <Router>
          <Values {...defaultProps} packageId="id2" />
        </Router>
      );

      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(2);
        expect(API.getChartValues).toHaveBeenCalledWith('id2', defaultProps.version);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('closes modal when a new pkg is open', async () => {
      mocked(API).getChartValues.mockResolvedValue(YAMLSample);

      const { rerender } = render(
        <Router>
          <Values {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: /Open default values modal/ });
      await userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(API.getChartValues).toHaveBeenCalledTimes(1);

      rerender(
        <Router>
          <Values {...defaultProps} packageId="id2" />
        </Router>
      );

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    describe('search', () => {
      it('renders search bar', async () => {
        mocked(API).getChartValues.mockResolvedValue(YAMLSample);

        render(
          <Router>
            <Values {...defaultProps} visibleValues />
          </Router>
        );

        await waitFor(() => {
          expect(API.getChartValues).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByRole('dialog')).toBeInTheDocument();

        await userEvent.type(screen.getByRole('textbox'), 'name');

        const opts = await screen.findAllByTestId('typeaheadDropdownBtn');
        expect(opts).toHaveLength(10);
        expect(opts[0]).toHaveTextContent('nameOverride');
        expect(opts[1]).toHaveTextContent('fullnameOverride');
        expect(opts[2]).toHaveTextContent('dynamicResourceNamePrefixEnabled');
        expect(opts[3]).toHaveTextContent('email.fromName');
        expect(opts[4]).toHaveTextContent('email.smtp.username');
        expect(opts[5]).toHaveTextContent('creds.dockerUsername');
        expect(opts[6]).toHaveTextContent('hub.server.basicAuth.username');
        expect(opts[7]).toHaveTextContent('hub.theme.siteName');
        expect(opts[8]).toHaveTextContent('tracker.repositoriesNames');
        expect(opts[9]).toHaveTextContent('postgresql.postgresqlUsername');
      });

      it('clicks option after searching', async () => {
        mocked(API).getChartValues.mockResolvedValue(YAMLSample);

        render(
          <Router>
            <Values {...defaultProps} visibleValues />
          </Router>
        );

        await waitFor(() => {
          expect(API.getChartValues).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByRole('dialog')).toBeInTheDocument();

        await userEvent.type(screen.getByRole('textbox'), 'name');

        const opts = screen.getAllByTestId('typeaheadDropdownBtn');

        await userEvent.click(opts[8]);

        await waitFor(() => {
          expect(mockUseNavigate).toHaveBeenCalledTimes(1);
          expect(mockUseNavigate).toHaveBeenCalledWith(
            { search: '?modal=values&path=tracker.repositoriesNames' },
            {
              replace: true,
              state: null,
            }
          );
        });
      });

      it('goes to correct position when querystring path is defined', async () => {
        mocked(API).getChartValues.mockResolvedValue(YAMLSample);

        render(
          <Router>
            <Values {...defaultProps} visibleValues visibleValuesPath="hub.service.port" />
          </Router>
        );

        await waitFor(() => {
          expect(API.getChartValues).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByRole('dialog')).toBeInTheDocument();

        await waitFor(() => {
          expect(scrollToMock).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('when fails', () => {
      it('on NotFound', async () => {
        mocked(API).getChartValues.mockRejectedValue({
          kind: ErrorKind.NotFound,
        });

        render(
          <Router>
            <Values {...defaultProps} />
          </Router>
        );

        const btn = screen.getByRole('button', { name: /Open default values modal/ });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.getChartValues).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message:
              'We could not find the default values for this chart version. Please check that the chart tgz package still exists in the source repository as it might not be available anymore.',
            dismissOn: 10000,
          });
        });
      });

      it('default error', async () => {
        mocked(API).getChartValues.mockRejectedValue({ kind: ErrorKind.Other });

        render(
          <Router>
            <Values {...defaultProps} />
          </Router>
        );

        const btn = screen.getByRole('button', { name: /Open default values modal/ });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.getChartValues).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message: 'An error occurred getting chart default values, please try again later.',
          });
        });

        await waitFor(() => {
          expect(mockUseNavigate).toHaveBeenCalledTimes(2);
          expect(mockUseNavigate).toHaveBeenLastCalledWith('', { replace: true, state: null });
        });
      });
    });
  });
});
