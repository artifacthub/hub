import { fireEvent, render } from '@testing-library/react';
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
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content with selectedValues', () => {
    const { getAllByTestId, getByText } = render(<InputTypeaheadWithDropdown {...defaultProps} />);

    expect(getAllByTestId('typeaheadSelectedItem')).toHaveLength(2);
    expect(getByText(defaultProps.label)).toBeInTheDocument();
  });

  it('renders proper content without selectedValues', () => {
    const { getByText } = render(<InputTypeaheadWithDropdown {...defaultProps} selected={{}} />);

    expect(getByText(defaultProps.label)).toBeInTheDocument();
    expect(getByText('No test selected')).toBeInTheDocument();
  });

  it('renders selected options in correct order', () => {
    const { getAllByTestId } = render(<InputTypeaheadWithDropdown {...defaultProps} />);

    const opts = getAllByTestId('typeaheadSelectedItem');
    expect(opts[0]).toHaveTextContent('Option key 2 (12)');
    expect(opts[1]).toHaveTextContent('Option key 1 (7)');
  });

  it('opens dropdown', () => {
    const { getByTestId, getAllByTestId, getByText, getByPlaceholderText } = render(
      <InputTypeaheadWithDropdown {...defaultProps} />
    );

    const btn = getByTestId('typeaheadBtn');

    fireEvent.click(btn);

    expect(getByTestId('typeaheadDropdown')).toBeInTheDocument();
    expect(getByTestId('typeaheadInput')).toBeInTheDocument();
    expect(getByPlaceholderText('Search test')).toBeInTheDocument();
    expect(getAllByTestId('typeaheadDropdownBtn')).toHaveLength(4);
    expect(getByText('Clear all')).toBeInTheDocument();
    expect(getByTestId('typeaheadClearBtn')).toBeInTheDocument();
  });

  it('opens dropdown to click over selected item', () => {
    const { getByText, getByTestId } = render(<InputTypeaheadWithDropdown {...defaultProps} />);

    const item = getByText('Option key 1');

    fireEvent.click(item);

    expect(getByTestId('typeaheadDropdown')).toBeInTheDocument();
  });

  it('calls Clear all', () => {
    const { getByTestId } = render(<InputTypeaheadWithDropdown {...defaultProps} />);

    const btn = getByTestId('typeaheadBtn');

    fireEvent.click(btn);

    const clearBtn = getByTestId('typeaheadClearBtn');

    fireEvent.click(clearBtn);

    expect(onResetSomeFiltersMock).toHaveBeenCalledTimes(1);
    expect(onResetSomeFiltersMock).toHaveBeenCalledWith(['key1']);
  });
});
