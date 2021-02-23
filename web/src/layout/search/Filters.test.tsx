import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { Facets } from '../../types';
import Filters from './Filters';

const FacetsMock: Facets[] = [
  {
    title: 'Organization',
    filterKey: 'org',
    options: [
      {
        id: 'helmOrg',
        name: 'Helm org',
        total: 256,
      },
      {
        id: 'falco',
        name: 'Falco',
        total: 22,
      },
    ],
  },
  {
    title: 'User',
    filterKey: 'user',
    options: [
      {
        id: 'testUser',
        name: 'testUser',
        total: 1,
      },
    ],
  },
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
    title: 'Repository',
    filterKey: 'repo',
    options: [
      {
        id: 'stable',
        name: 'Stable',
        total: 203,
      },
      {
        id: 'incubator',
        name: 'Incubator',
        total: 53,
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

const defaultProps = {
  activeFilters: {},
  activeTsQuery: [],
  facets: FacetsMock,
  visibleTitle: false,
  onChange: onChangeMock,
  onResetSomeFilters: jest.fn(),
  onTsQueryChange: jest.fn(),
  onDeprecatedChange: onDeprecatedChangeMock,
  onOperatorsChange: jest.fn(),
  onVerifiedPublisherChange: onVerifiedPublisherChangeMock,
  onOfficialChange: onOfficialChangeMock,
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
    const result = render(<Filters {...defaultProps} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByLabelText, getAllByTestId } = render(<Filters {...defaultProps} />);

      expect(getAllByTestId('checkbox')).toHaveLength(23);
      expect(getByLabelText('Official')).toBeInTheDocument();
      expect(getByLabelText('Verified publishers')).toBeInTheDocument();
      expect(getByLabelText('Include deprecated')).toBeInTheDocument();
    });

    it('renders component with title', () => {
      const props = {
        ...defaultProps,
        visibleTitle: true,
      };
      const { getByText, queryByTestId } = render(<Filters {...props} />);

      expect(getByText('Filters')).toBeInTheDocument();
      expect(queryByTestId('resetFiltersBtn')).toBeNull();
    });

    it('renders reset btn when active filters is not empty and calls mock to click', () => {
      const props = {
        ...defaultProps,
        activeFilters: { kind: ['0'] },
        visibleTitle: true,
      };
      const { getByTestId } = render(<Filters {...props} />);
      const resetBtn = getByTestId('resetFiltersBtn');
      fireEvent.click(resetBtn);

      expect(onResetFiltersMock).toHaveBeenCalledTimes(1);
    });

    it('calls deprecated mock when deprecated checkbox is clicked', () => {
      const { getByLabelText } = render(<Filters {...defaultProps} />);

      const opt = getByLabelText('Include deprecated');
      expect(opt).toBeInTheDocument();
      fireEvent.click(opt);
      expect(onDeprecatedChangeMock).toHaveBeenCalledTimes(1);
    });

    it('calls verifiedPublisherChange mock when verified publisher checkbox is clicked', () => {
      const { getByLabelText } = render(<Filters {...defaultProps} />);

      const opt = getByLabelText('Verified publishers');
      expect(opt).toBeInTheDocument();
      fireEvent.click(opt);
      expect(onVerifiedPublisherChangeMock).toHaveBeenCalledTimes(1);
    });

    it('calls officalChange mock when official checkbox is clicked', () => {
      const { getByLabelText } = render(<Filters {...defaultProps} />);

      const opt = getByLabelText('Official');
      expect(opt).toBeInTheDocument();
      fireEvent.click(opt);
      expect(onOfficialChangeMock).toHaveBeenCalledTimes(1);
    });

    it('calls onchange mock when any checkbox is clicked', () => {
      const { getByLabelText } = render(<Filters {...defaultProps} />);

      const opt = getByLabelText(/Helm charts/g);
      expect(opt).toBeInTheDocument();
      fireEvent.click(opt);
      expect(onChangeMock).toHaveBeenCalledTimes(1);
    });

    it('renders facets in correct order', () => {
      const { getAllByTestId } = render(<Filters {...defaultProps} />);

      const titles = getAllByTestId('smallTitle');
      expect(titles).toHaveLength(7);

      expect(titles[0]).toHaveTextContent('Kind');
      expect(titles[1]).toHaveTextContent('Category');
      expect(titles[2]).toHaveTextContent('publisher');
      expect(titles[3]).toHaveTextContent('repository');
      expect(titles[4]).toHaveTextContent('license');
      expect(titles[5]).toHaveTextContent('Operator capabilities');
      expect(titles[6]).toHaveTextContent('Others');
    });

    it('renders all kind options', () => {
      const { getByText } = render(<Filters {...defaultProps} />);

      expect(getByText('Helm charts')).toBeInTheDocument();
      expect(getByText('OLM operators')).toBeInTheDocument();
      expect(getByText('Falco rules')).toBeInTheDocument();
      expect(getByText('OPA policies')).toBeInTheDocument();
    });

    it('renders other options', () => {
      const { getByText } = render(<Filters {...defaultProps} />);

      expect(getByText('Only operators')).toBeInTheDocument();
      expect(getByText('Include deprecated')).toBeInTheDocument();
    });

    it('renders license', () => {
      const { getByText } = render(<Filters {...defaultProps} />);

      expect(getByText('license')).toBeInTheDocument();
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
      const { queryByText } = render(<Filters {...props} />);

      expect(queryByText('License')).toBeNull();
    });

    it('render Operator capatibilities', () => {
      const { getByText } = render(<Filters {...defaultProps} />);

      expect(getByText('Operator capabilities')).toBeInTheDocument();
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

      const { queryByText } = render(<Filters {...props} />);

      expect(queryByText('Operator capabilities')).toBeNull();
    });
  });

  describe('Operator capabilities facets', () => {
    for (let i = 0; i < capabitiesTests.length; i++) {
      it('returns correct order', () => {
        const props = {
          ...defaultProps,
          facets: [capabitiesTests[i].input],
        };
        const { getAllByTestId } = render(<Filters {...props} />);
        const labels = getAllByTestId('checkboxLabel');

        for (let j = 0; j < capabitiesTests[i].output.length; j++) {
          expect(labels[12 + j]).toHaveTextContent(capabitiesTests[i].output[j]);
        }
      });
    }
  });
});
