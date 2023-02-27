import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Facets } from '../../types';
import Filters from './Filters';

const FacetsMock: Facets[] = [
  {
    title: 'Kind',
    filterKey: 'kind',
    options: [
      {
        id: 0,
        name: 'Helm charts',
        total: 1520,
      },
      {
        id: 3,
        name: 'OLM operators',
        total: 152,
      },
      {
        id: 1,
        name: 'Falco rules',
        total: 21,
      },
      {
        id: 2,
        name: 'OPA policies',
        total: 1,
      },
    ],
  },
  {
    title: 'Category',
    filterKey: 'category',
    options: [
      {
        id: 2,
        name: 'Database',
        total: 32,
      },
      {
        id: 3,
        name: 'Integration & delivery',
        total: 10,
      },
    ],
  },
  {
    title: 'License',
    filterKey: 'license',
    options: [
      {
        id: 'Apache-2.0',
        name: 'Apache-2.0',
        total: 3,
      },
      {
        id: 'MIT',
        name: 'MIT',
        total: 1,
      },
    ],
  },
  {
    title: 'Operator capabilities',
    filterKey: 'capabilities',
    options: [
      {
        id: 'basic install',
        name: 'basic install',
        total: 73,
      },
      {
        id: 'seamless upgrades',
        name: 'seamless upgrades',
        total: 33,
      },
      {
        id: 'full lifecycle',
        name: 'full lifecycle',
        total: 25,
      },
      {
        id: 'deep insights',
        name: 'deep insights',
        total: 17,
      },
      {
        id: 'auto pilot',
        name: 'auto pilot',
        total: 9,
      },
    ],
  },
];

const onDeprecatedChangeMock = jest.fn();
const onResetFiltersMock = jest.fn();
const onChangeMock = jest.fn();
const onFacetExpandableChangeMock = jest.fn();
const onVerifiedPublisherChangeMock = jest.fn();
const onOfficialChangeMock = jest.fn();
const onCNCFChangeMock = jest.fn();

const defaultProps = {
  forceCollapseList: false,
  activeFilters: {},
  facets: FacetsMock,
  visibleTitle: false,
  device: 'desktop',
  onChange: onChangeMock,
  onResetSomeFilters: jest.fn(),
  onDeprecatedChange: onDeprecatedChangeMock,
  onOperatorsChange: jest.fn(),
  onVerifiedPublisherChange: onVerifiedPublisherChangeMock,
  onOfficialChange: onOfficialChangeMock,
  onCNCFChange: onCNCFChangeMock,
  onResetFilters: onResetFiltersMock,
  onFacetExpandableChange: onFacetExpandableChangeMock,
  deprecated: false,
  operators: false,
  verifiedPublisher: false,
  official: false,
};

interface CapabilitiesTest {
  input: Facets;
  output: string[];
}

const capabitiesTests: CapabilitiesTest[] = [
  {
    input: {
      title: 'Operator capabilities',
      filterKey: 'capabilities',
      options: [
        {
          id: 'basic install',
          name: 'basic install',
          total: 73,
        },
        {
          id: 'seamless upgrades',
          name: 'seamless upgrades',
          total: 33,
        },
        {
          id: 'full lifecycle',
          name: 'full lifecycle',
          total: 25,
        },
        {
          id: 'deep insights',
          name: 'deep insights',
          total: 17,
        },
        {
          id: 'auto pilot',
          name: 'auto pilot',
          total: 9,
        },
      ],
    },
    output: ['basic install(73)', 'seamless upgrades(33)', 'full lifecycle(25)', 'deep insights(17)', 'auto pilot(9)'],
  },
  {
    input: {
      title: 'Operator capabilities',
      filterKey: 'capabilities',
      options: [
        {
          id: 'seamless upgrades',
          name: 'seamless upgrades',
          total: 33,
        },
        {
          id: 'full lifecycle',
          name: 'full lifecycle',
          total: 25,
        },
        {
          id: 'deep insights',
          name: 'deep insights',
          total: 17,
        },
        {
          id: 'basic install',
          name: 'basic install',
          total: 8,
        },
        {
          id: 'auto pilot',
          name: 'auto pilot',
          total: 9,
        },
      ],
    },
    output: ['basic install(8)', 'seamless upgrades(33)', 'full lifecycle(25)', 'deep insights(17)', 'auto pilot(9)'],
  },
  {
    input: {
      title: 'Operator capabilities',
      filterKey: 'capabilities',
      options: [
        {
          id: 'auto pilot',
          name: 'auto pilot',
          total: 29,
        },
        {
          id: 'seamless upgrades',
          name: 'seamless upgrades',
          total: 27,
        },
        {
          id: 'deep insights',
          name: 'deep insights',
          total: 17,
        },
        {
          id: 'basic install',
          name: 'basic install',
          total: 8,
        },
        {
          id: 'full lifecycle',
          name: 'full lifecycle',
          total: 2,
        },
      ],
    },
    output: ['basic install(8)', 'seamless upgrades(27)', 'full lifecycle(2)', 'deep insights(17)', 'auto pilot(29)'],
  },
  {
    input: {
      title: 'Operator capabilities',
      filterKey: 'capabilities',
      options: [
        {
          id: 'auto pilot',
          name: 'auto pilot',
          total: 29,
        },
        {
          id: 'basic install',
          name: 'basic install',
          total: 8,
        },
        {
          id: 'full lifecycle',
          name: 'full lifecycle',
          total: 2,
        },
      ],
    },
    output: ['basic install(8)', 'full lifecycle(2)', 'auto pilot(29)'],
  },
];

describe('Filters', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<Filters {...defaultProps} />);

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<Filters {...defaultProps} />);

      expect(screen.getAllByRole('checkbox')).toHaveLength(18);
      expect(screen.getByLabelText('Official')).toBeInTheDocument();
      expect(screen.getByLabelText('Verified publishers')).toBeInTheDocument();
      expect(screen.getByLabelText('CNCF')).toBeInTheDocument();
      expect(screen.getByLabelText('Include deprecated')).toBeInTheDocument();
    });

    it('renders component with title', () => {
      const props = {
        ...defaultProps,
        visibleTitle: true,
      };
      render(<Filters {...props} />);

      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Reset filters/ })).toBeNull();
    });

    it('renders reset btn when active filters is not empty and calls mock to click', async () => {
      const props = {
        ...defaultProps,
        activeFilters: { kind: ['0'] },
        visibleTitle: true,
      };
      render(<Filters {...props} />);
      const resetBtn = screen.getByRole('button', { name: /Reset filters/ });
      await userEvent.click(resetBtn);

      await waitFor(() => expect(onResetFiltersMock).toHaveBeenCalledTimes(1));
    });

    it('calls deprecated mock when deprecated checkbox is clicked', async () => {
      render(<Filters {...defaultProps} />);

      const opt = screen.getByLabelText('Include deprecated');
      expect(opt).toBeInTheDocument();
      await userEvent.click(opt);
      expect(onDeprecatedChangeMock).toHaveBeenCalledTimes(1);
    });

    it('calls verifiedPublisherChange mock when verified publisher checkbox is clicked', async () => {
      render(<Filters {...defaultProps} />);

      const opt = screen.getByLabelText('Verified publishers');
      expect(opt).toBeInTheDocument();
      await userEvent.click(opt);

      await waitFor(() => expect(onVerifiedPublisherChangeMock).toHaveBeenCalledTimes(1));
    });

    it('calls officalChange mock when official checkbox is clicked', async () => {
      render(<Filters {...defaultProps} />);

      const opt = screen.getByLabelText('Official');
      expect(opt).toBeInTheDocument();
      await userEvent.click(opt);

      await waitFor(() => expect(onOfficialChangeMock).toHaveBeenCalledTimes(1));
    });

    it('calls CNCFChange mock when CNCF checkbox is clicked', async () => {
      render(<Filters {...defaultProps} />);

      const opt = screen.getByLabelText('CNCF');
      expect(opt).toBeInTheDocument();
      await userEvent.click(opt);

      await waitFor(() => expect(onCNCFChangeMock).toHaveBeenCalledTimes(1));
    });

    it('calls onchange mock when any checkbox is clicked', async () => {
      render(<Filters {...defaultProps} />);

      const opt = screen.getByLabelText(/Helm charts/);
      expect(opt).toBeInTheDocument();
      await userEvent.click(opt);

      await waitFor(() => expect(onChangeMock).toHaveBeenCalledTimes(1));
    });

    it('renders facets in correct order', () => {
      render(<Filters {...defaultProps} />);

      const titles = screen.getAllByTestId('smallTitle');
      expect(titles).toHaveLength(5);

      expect(titles[0]).toHaveTextContent('Kind');
      expect(titles[1]).toHaveTextContent('Category');
      expect(titles[2]).toHaveTextContent('License');
      expect(titles[3]).toHaveTextContent('Operator capabilities');
      expect(titles[4]).toHaveTextContent('Others');
    });

    it('renders all kind options', () => {
      render(<Filters {...defaultProps} />);

      expect(screen.getByText('Helm charts')).toBeInTheDocument();
      expect(screen.getByText('OLM operators')).toBeInTheDocument();
      expect(screen.getByText('Falco rules')).toBeInTheDocument();
      expect(screen.getByText('OPA policies')).toBeInTheDocument();
    });

    it('renders other options', () => {
      render(<Filters {...defaultProps} />);

      expect(screen.getByText('Only operators')).toBeInTheDocument();
      expect(screen.getByText('Include deprecated')).toBeInTheDocument();
    });

    it('renders license', () => {
      render(<Filters {...defaultProps} />);

      expect(screen.getByText('License')).toBeInTheDocument();
    });

    it('does not render license when no options', () => {
      const props = {
        ...defaultProps,
        facets: [
          {
            title: 'License',
            filterKey: 'license',
            options: [],
          },
        ],
      };
      render(<Filters {...props} />);

      expect(screen.queryByText('License')).toBeNull();
    });

    it('render Operator capatibilities', () => {
      render(<Filters {...defaultProps} />);

      expect(screen.getByText('Operator capabilities')).toBeInTheDocument();
    });

    it('does not render Operator capatibilities', () => {
      const props = {
        ...defaultProps,
        facets: [
          {
            title: 'Operator capabilities',
            filterKey: 'capabilities',
            options: [],
          },
        ],
      };

      render(<Filters {...props} />);

      expect(screen.queryByText('Operator capabilities')).toBeNull();
    });
  });

  describe('Operator capabilities facets', () => {
    for (let i = 0; i < capabitiesTests.length; i++) {
      it('returns correct order', () => {
        const props = {
          ...defaultProps,
          facets: [capabitiesTests[i].input],
        };
        render(<Filters {...props} />);
        const labels = screen.getAllByTestId('checkboxLabel');

        for (let j = 0; j < capabitiesTests[i].output.length; j++) {
          expect(labels[3 + j]).toHaveTextContent(capabitiesTests[i].output[j]);
        }
      });
    }
  });
});
