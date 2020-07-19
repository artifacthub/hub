import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { FacetOption } from '../../types';
import Facet from './Facet';

const optionsMock: FacetOption[] = [
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
  {
    id: 'test',
    name: 'Test',
    total: 6,
  },
  {
    id: 'test1',
    name: 'Test1',
    total: 8,
  },
];

const onChangeMock = jest.fn();
const onFacetExpandableChangeMock = jest.fn();

const defaultProps = {
  active: [],
  title: 'Repository',
  filterKey: 'repo',
  options: optionsMock,
  onChange: onChangeMock,
  onFacetExpandableChange: onFacetExpandableChangeMock,
  isExpanded: false,
};

interface Test {
  props: {
    title: string;
    filterKey: string;
    active: string[];
    options: FacetOption[];
  };
  checkboxes: string[];
}

describe('Facet', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<Facet {...defaultProps} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByTestId, getAllByTestId } = render(<Facet {...defaultProps} />);

      expect(getAllByTestId('checkbox')).toHaveLength(3);
      expect(getByText('Repository')).toBeInTheDocument();
      expect(getByTestId('smallTitle')).toBeInTheDocument();
    });

    it('renders component with subtitle', () => {
      const props = {
        ...defaultProps,
        displaySubtitle: true,
      };
      const { getByText, queryByTestId } = render(<Facet {...props} />);

      expect(getByText('Repository')).toBeInTheDocument();
      expect(queryByTestId('smallTitle')).toBeNull();
    });

    it('calls onchange mock when any checkbox is clicked', () => {
      const { getByLabelText } = render(<Facet {...defaultProps} />);

      const opt = getByLabelText(/Stable/g);
      expect(opt).toBeInTheDocument();
      fireEvent.click(opt);
      expect(onChangeMock).toHaveBeenCalledTimes(1);
    });
  });
});
