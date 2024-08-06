import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import { ContentDefaultModalKind } from '../../types';
import ContentDefaultModal from './ContentDefaultModal';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const isVisibleItemInContainer = require('../../utils/isVisibleItemInContainer');

jest.mock('../../utils/isVisibleItemInContainer', () => jest.fn());

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
  useLocation: () => ({
    state: null,
  }),
}));

const scrollIntoViewMock = jest.fn();
window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  packageId: 'id',
  kind: ContentDefaultModalKind.CustomResourcesDefinition,
  language: 'yaml',
  modalName: 'crds',
  visibleModal: false,
  btnModalContent: <>Btn</>,
  normalizedName: 'pkg',
  title: 'CRDs',
  files: [
    {
      kind: 'AquaCsp',
      name: 'aquacsps.operator.aquasec.com',
      version: 'v1alpha1',
      description: 'Aqua Security CSP Deployment with Aqua Operator',
      displayName: 'AquaCsp',
      example: {
        kind: 'AquaCsp',
        spec: {
          infra: { version: '6.0', namespace: 'aqua', requirements: true, serviceAccount: 'aqua-sa' },
          route: true,
          common: {
            dbDiskSize: 10,
            databaseSecret: { key: 'db-password', name: 'aqua-database-password' },
            imagePullSecret: 'aqua-registry',
          },
          server: {
            image: {
              tag: '<<IMAGE TAG>>',
              registry: 'registry.aquasec.com',
              pullPolicy: 'Always',
              repository: 'console',
            },
            service: 'LoadBalancer',
            replicas: 1,
          },
          gateway: {
            image: {
              tag: '<<IMAGE TAG>>',
              registry: 'registry.aquasec.com',
              pullPolicy: 'Always',
              repository: 'gateway',
            },
            service: 'ClusterIP',
            replicas: 1,
          },
          database: {
            image: {
              tag: '<<IMAGE TAG>>',
              registry: 'registry.aquasec.com',
              pullPolicy: 'Always',
              repository: 'database',
            },
            service: 'ClusterIP',
            replicas: 1,
          },
        },
        metadata: { name: 'aqua', namespace: 'aqua' },
        apiVersion: 'operator.aquasec.com/v1alpha1',
      },
    },
    {
      kind: 'AquaDatabase',
      name: 'aquadatabases.operator.aquasec.com',
      version: 'v1alpha1',
      description: 'Aqua Security Database Deployment with Aqua Operator',
      displayName: 'AquaDatabase',
      example: {
        kind: 'AquaDatabase',
        spec: {
          infra: { version: '6.0', serviceAccount: 'aqua-sa' },
          common: { splitDb: false, imagePullSecret: 'aqua-registry' },
          deploy: {
            image: { tag: '<<IMAGE TAG>>', registry: 'registry.aquasec.com', repository: 'database' },
            service: 'ClusterIP',
            replicas: 1,
          },
          diskSize: 10,
        },
        metadata: { name: 'aqua', namespace: 'aqua' },
        apiVersion: 'operator.aquasec.com/v1alpha1',
      },
    },
    {
      kind: 'AquaEnforcer',
      name: 'aquaenforcers.operator.aquasec.com',
      version: 'v1alpha1',
      description: 'Aqua Security Enforcer Deployment with Aqua Operator',
      displayName: 'AquaEnforcer',
    },
  ],
};

describe('Content default modal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    isVisibleItemInContainer.mockImplementation(() => true);
  });

  it('creates snapshot', async () => {
    const { asFragment } = render(
      <Router>
        <ContentDefaultModal {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('opens modal', async () => {
    render(<ContentDefaultModal {...defaultProps} />);

    const btn = screen.getByRole('button', { name: 'Open CRDs modal' });
    await userEvent.click(btn);

    expect(screen.getByRole('dialog')).toHaveClass('d-block');

    expect(mockUseNavigate).toHaveBeenCalledTimes(1);
    expect(mockUseNavigate).toHaveBeenCalledWith(
      { pathname: undefined, search: '?modal=crds&file=aquacsps.operator.aquasec.com' },
      {
        state: null,
        replace: true,
      }
    );

    expect(screen.getByText(/This package version contains/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Show CRDs/ })).toHaveLength(3);
  });

  it('filters file', async () => {
    render(
      <Router>
        <ContentDefaultModal {...defaultProps} visibleModal />
      </Router>
    );

    expect(screen.getByRole('dialog')).toHaveClass('d-block');
    expect(screen.getAllByRole('button', { name: /Show CRDs/ })).toHaveLength(3);

    const input = screen.getByPlaceholderText('Search by name or resource kind');
    expect(input).toBeInTheDocument();
    await userEvent.type(input, 'database');

    expect(screen.getAllByRole('button', { name: /Show CRDs/ })).toHaveLength(1);
  });

  it('displays warning message when no matches', async () => {
    render(
      <Router>
        <ContentDefaultModal {...defaultProps} visibleModal />
      </Router>
    );

    expect(screen.getByRole('dialog')).toHaveClass('d-block');
    expect(screen.getAllByRole('button', { name: /Show CRDs/ })).toHaveLength(3);

    const input = screen.getByPlaceholderText('Search by name or resource kind');
    expect(input).toBeInTheDocument();
    await userEvent.type(input, 'notmatch');

    expect(screen.getByText('Sorry, no matches found')).toBeInTheDocument();
  });

  it('renders message when not example provided', async () => {
    render(
      <Router>
        <ContentDefaultModal {...defaultProps} visibleModal />
      </Router>
    );

    expect(screen.getByRole('dialog')).toHaveClass('d-block');
    expect(screen.getAllByRole('button', { name: /Show CRDs/ })).toHaveLength(3);
    await userEvent.click(screen.getAllByRole('button', { name: /Show CRDs/ })[2]);

    expect(screen.getByText('Aqua Security Enforcer Deployment with Aqua Operator')).toBeInTheDocument();
    expect(screen.getByText('No example provided')).toBeInTheDocument();
  });

  it('scrolls to active file when is not visible', async () => {
    isVisibleItemInContainer.mockImplementation(() => false);

    render(
      <Router>
        <ContentDefaultModal visibleFile="aquadatabases.operator.aquasec.com" {...defaultProps} visibleModal />
      </Router>
    );

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('does not render component', () => {
    it('when files array is empty', () => {
      const { container } = render(
        <Router>
          <ContentDefaultModal {...defaultProps} visibleModal files={[]} />
        </Router>
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('when files is undefined', () => {
      const { container } = render(
        <Router>
          <ContentDefaultModal {...defaultProps} visibleModal files={undefined} />
        </Router>
      );
      expect(container).toBeEmptyDOMElement();
    });
  });
});
