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

      expect(getAllByTestId('checkbox')).toHaveLength(18);
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

    it('calls officalChange mock when official repositories checkbox is clicked', () => {
      const { getByLabelText } = render(<Filters {...defaultProps} />);

      const opt = getByLabelText('Official repositories');
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
      expect(titles).toHaveLength(5);

      expect(titles[0]).toHaveTextContent('Category');
      expect(titles[1]).toHaveTextContent('Kind');
      expect(titles[2]).toHaveTextContent('publisher');
      expect(titles[3]).toHaveTextContent('repository');
      expect(titles[4]).toHaveTextContent('Others');
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
  });
});
