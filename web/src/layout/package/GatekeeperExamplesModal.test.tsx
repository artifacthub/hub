import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GatekeeperExamplesModal from './GatekeeperExamplesModal';

const isVisibleItemInContainer = require('../../utils/isVisibleItemInContainer');

jest.mock('../../utils/isVisibleItemInContainer', () => jest.fn());

const mockHistoryReplace = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    replace: mockHistoryReplace,
  }),
}));

const scrollIntoViewMock = jest.fn();
window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  packageId: '32fd95b2-8c7f-4467-99d6-72e34d4527cb',
  visibleModal: false,
  normalizedName: 'containerresourceratios',
  examples: [
    {
      name: 'memory-ratio-only',
      cases: [
        {
          name: 'constraint',
          path: 'samples/container-must-meet-ratio/constraint.yaml',
          content:
            'apiVersion: constraints.gatekeeper.sh/v1beta1\nkind: K8sContainerRatios\nmetadata:\n  name: container-must-meet-ratio\nspec:\n  match:\n    kinds:\n      - apiGroups: [""]\n        kinds: ["Pod"]\n  parameters:\n    ratio: "2"\n',
        },
        {
          name: 'example-allowed',
          path: 'samples/container-must-meet-ratio/example_allowed.yaml',
          content:
            'apiVersion: v1\nkind: Pod\nmetadata:\n  name: opa-disallowed\n  labels:\n    owner: me.agilebank.demo\nspec:\n  containers:\n    - name: opa\n      image: openpolicyagent/opa:0.9.2\n      args:\n        - "run"\n        - "--server"\n        - "--addr=localhost:8080"\n      resources:\n        limits:\n          cpu: "200m"\n          memory: "200Mi"\n        requests:\n          cpu: "100m"\n          memory: "100Mi"\n',
        },
        {
          name: 'example-disallowed',
          path: 'samples/container-must-meet-ratio/example_disallowed.yaml',
          content:
            'apiVersion: v1\nkind: Pod\nmetadata:\n  name: opa-disallowed\n  labels:\n    owner: me.agilebank.demo\nspec:\n  containers:\n    - name: opa\n      image: openpolicyagent/opa:0.9.2\n      args:\n        - "run"\n        - "--server"\n        - "--addr=localhost:8080"\n      resources:\n        limits:\n          cpu: "800m"\n          memory: "2Gi"\n        requests:\n          cpu: "100m"\n          memory: "100Mi"\n',
        },
      ],
    },
    {
      name: 'memory-and-cpu-ratios',
      cases: [
        {
          name: 'constraint',
          path: 'samples/container-must-meet-memory-and-cpu-ratio/constraint.yaml',
          content:
            'apiVersion: constraints.gatekeeper.sh/v1beta1\nkind: K8sContainerRatios\nmetadata:\n  name: container-must-meet-memory-and-cpu-ratio\nspec:\n  match:\n    kinds:\n      - apiGroups: [""]\n        kinds: ["Pod"]\n  parameters:\n    ratio: "1"\n    cpuRatio: "10"\n',
        },
        {
          name: 'example-allowed',
          path: 'samples/container-must-meet-memory-and-cpu-ratio/example_allowed.yaml',
          content:
            'apiVersion: v1\nkind: Pod\nmetadata:\n  name: opa-allowed\n  labels:\n    owner: me.agilebank.demo\nspec:\n  containers:\n    - name: opa\n      image: openpolicyagent/opa:0.9.2\n      args:\n        - "run"\n        - "--server"\n        - "--addr=localhost:8080"\n      resources:\n        limits:\n          cpu: "4"\n          memory: "2Gi"\n        requests:\n          cpu: "1"\n          memory: "2Gi"\n',
        },
        {
          name: 'example-disallowed',
          path: 'samples/container-must-meet-memory-and-cpu-ratio/example_disallowed.yaml',
          content:
            'apiVersion: v1\nkind: Pod\nmetadata:\n  name: opa-disallowed\n  labels:\n    owner: me.agilebank.demo\nspec:\n  containers:\n    - name: opa\n      image: openpolicyagent/opa:0.9.2\n      args:\n        - "run"\n        - "--server"\n        - "--addr=localhost:8080"\n      resources:\n        limits:\n          cpu: "4"\n          memory: "2Gi"\n        requests:\n          cpu: "100m"\n          memory: "2Gi"\n',
        },
      ],
    },
  ],
  searchUrlReferer: { pageNumber: 1, filters: { kind: ['14'] }, deprecated: false, sort: 'relevance' },
};

describe('Gatekeeper examples modal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    isVisibleItemInContainer.mockImplementation(() => true);
  });

  it('creates snapshot', async () => {
    const { asFragment } = render(<GatekeeperExamplesModal {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('opens modal', async () => {
    render(<GatekeeperExamplesModal {...defaultProps} />);

    const btn = screen.getByRole('button', { name: 'Open examples modal' });
    await userEvent.click(btn);

    expect(screen.getByRole('dialog')).toHaveClass('d-block');

    expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
    expect(mockHistoryReplace).toHaveBeenCalledWith({
      search: '?modal=examples&example=memory-ratio-only&file=constraint',
      state: {
        fromStarredPage: undefined,
        searchUrlReferer: {
          deprecated: false,
          filters: {
            kind: ['14'],
          },
          pageNumber: 1,
          sort: 'relevance',
        },
      },
    });

    expect(screen.getByText(/This package version contains/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Show case/ })).toHaveLength(6);
  });

  it('filters examples', async () => {
    render(<GatekeeperExamplesModal {...defaultProps} visibleModal />);

    expect(screen.getByRole('dialog')).toHaveClass('d-block');
    expect(screen.getAllByRole('button', { name: /Show case/ })).toHaveLength(6);

    const input = screen.getByPlaceholderText('Search by name');
    expect(input).toBeInTheDocument();
    await userEvent.type(input, 'disallowed');

    expect(screen.getAllByRole('button', { name: /Show case/ })).toHaveLength(2);
  });

  it('displays warning message when no matches', async () => {
    render(<GatekeeperExamplesModal {...defaultProps} visibleModal />);

    expect(screen.getByRole('dialog')).toHaveClass('d-block');
    expect(screen.getAllByRole('button', { name: /Show case/ })).toHaveLength(6);

    const input = screen.getByPlaceholderText('Search by name');
    expect(input).toBeInTheDocument();
    await userEvent.type(input, 'notmatch');

    expect(screen.getByText('Sorry, no matches found')).toBeInTheDocument();
  });

  it('scrolls to active example when is not visible', async () => {
    isVisibleItemInContainer.mockImplementation(() => false);

    render(
      <GatekeeperExamplesModal
        visibleExample="memory-and-cpu-ratios"
        visibleFile="example-disallowed"
        {...defaultProps}
        visibleModal
      />
    );

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('does not render component', () => {
    it('when examples array is empty', () => {
      const { container } = render(<GatekeeperExamplesModal {...defaultProps} visibleModal examples={[]} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('when examples is undefined', () => {
      const { container } = render(<GatekeeperExamplesModal {...defaultProps} visibleModal examples={undefined} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
