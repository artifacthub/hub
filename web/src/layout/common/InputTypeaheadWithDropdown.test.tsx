import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import InputTypeaheadWithDropdown from './InputTypeaheadWithDropdown';

const onChangeMock = jest.fn();
const onResetSomeFiltersMock = jest.fn();

const defaultProps = {
  label: 'test',
  options: [
    {
      id: 'opt11',
      name: 'Option 1',
      total: 19,
      filterKey: 'key2',
    },
    {
      id: 'opt12',
      name: 'Option 2',
      total: 17,
      filterKey: 'key2',
    },
    {
      id: 'opt1',
      name: 'Option key 1',
      total: 7,
      filterKey: 'key1',
    },
    {
      id: 'opt2',
      name: 'Option key 2',
      total: 12,
      filterKey: 'key1',
    },
  ],
  selected: {
    key1: ['opt1', 'opt2'],
  },
  onChange: onChangeMock,
  onResetSomeFilters: onResetSomeFiltersMock,
};

describe('InputTypeaheadWithDropdown', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<InputTypeaheadWithDropdown {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content with selectedValues', () => {
    render(<InputTypeaheadWithDropdown {...defaultProps} />);

    expect(screen.getAllByTestId('typeaheadSelectedItem')).toHaveLength(2);
    expect(screen.getByText(defaultProps.label)).toBeInTheDocument();
  });

  it('renders proper content without selectedValues', () => {
    render(<InputTypeaheadWithDropdown {...defaultProps} selected={{}} />);

    expect(screen.getByText(defaultProps.label)).toBeInTheDocument();
    expect(screen.getByText('No test selected')).toBeInTheDocument();
  });

  it('renders selected options in correct order', () => {
    render(<InputTypeaheadWithDropdown {...defaultProps} />);

    const opts = screen.getAllByTestId('typeaheadSelectedItem');
    expect(opts[0]).toHaveTextContent('Option key 2 (12)');
    expect(opts[1]).toHaveTextContent('Option key 1 (7)');
  });

  it('opens dropdown', () => {
    render(<InputTypeaheadWithDropdown {...defaultProps} />);

    userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search test')).toBeInTheDocument();
    expect(screen.getAllByTestId('typeaheadDropdownBtn')).toHaveLength(4);
    expect(screen.getByText('Clear all')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeInTheDocument();
  });

  it('opens dropdown to click over selected item', () => {
    render(<InputTypeaheadWithDropdown {...defaultProps} />);

    userEvent.click(screen.getByText('Option key 1'));

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('calls Clear all', () => {
    render(<InputTypeaheadWithDropdown {...defaultProps} />);

    userEvent.click(screen.getByRole('button', { name: /Typeahead for/ }));
    userEvent.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(onResetSomeFiltersMock).toHaveBeenCalledTimes(1);
    expect(onResetSomeFiltersMock).toHaveBeenCalledWith(['key1']);
  });
});
