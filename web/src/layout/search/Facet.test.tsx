import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { FacetOption } from '../../types';
import Facet from './Facet';

const optionsMock: FacetOption[] = [
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
  {
    id: 'incubator',
    name: 'Incubator',
    total: 53,
  },
  {
    id: 'stable',
    name: 'Stable',
    total: 203,
  },
];

const onChangeMock = jest.fn();

const defaultProps = {
  active: [],
  title: 'Chart Repository',
  filterKey: 'repo',
  options: optionsMock,
  onChange: onChangeMock,
};

describe('Filters', () => {
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

      expect(getAllByTestId('checkbox')).toHaveLength(4);
      expect(getByText('Chart Repository')).toBeInTheDocument();
      expect(getByTestId('smallTitle')).toBeInTheDocument();
    });

    it('renders component with subtitle', () => {
      const props = {
        ...defaultProps,
        displaySubtitle: true,
      };
      const { getByText, queryByTestId } = render(<Facet {...props} />);

      expect(getByText('Chart Repository')).toBeInTheDocument();
      expect(queryByTestId('smallTitle')).toBeNull();
    });

    it('calls onchange mock when any checkbox is clicked', () => {
      const { getByLabelText } = render(<Facet {...defaultProps} />);

      const opt = getByLabelText(/Stable/g);
      expect(opt).toBeInTheDocument();
      fireEvent.click(opt);
      expect(onChangeMock).toHaveBeenCalledTimes(1);
    });

    it('renders chart repositories in correct order', () => {
      const { getAllByTestId } = render(<Facet {...defaultProps} />);

      const opts = getAllByTestId('checkboxLabel');
      expect(opts).toHaveLength(4);

      expect(opts[0]).toHaveTextContent('Stable(203)');
      expect(opts[1]).toHaveTextContent('Incubator(53)');
      expect(opts[2]).toHaveTextContent('Test(6)');
      expect(opts[3]).toHaveTextContent('Test1(8)');
    });

    it('renders chart repositories in correct order when not special repositories are selected', () => {
      const props = {
        ...defaultProps,
        active: ['test1'],
      };
      const { getAllByTestId } = render(<Facet {...props} />);

      const opts = getAllByTestId('checkboxLabel');
      expect(opts).toHaveLength(4);

      expect(opts[0]).toHaveTextContent('Test1(8)');
      expect(opts[1]).toHaveTextContent('Stable(203)');
      expect(opts[2]).toHaveTextContent('Incubator(53)');
      expect(opts[3]).toHaveTextContent('Test(6)');
    });

    it('renders chart repositories in correct order when a mix of special and not special repositories are selected', () => {
      const props = {
        ...defaultProps,
        active: ['test1', 'stable'],
      };
      const { getAllByTestId } = render(<Facet {...props} />);

      const opts = getAllByTestId('checkboxLabel');
      expect(opts).toHaveLength(4);

      expect(opts[0]).toHaveTextContent('Stable(203)');
      expect(opts[1]).toHaveTextContent('Test1(8)');
      expect(opts[2]).toHaveTextContent('Incubator(53)');
      expect(opts[3]).toHaveTextContent('Test(6)');
    });
  });
});
