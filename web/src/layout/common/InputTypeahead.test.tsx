import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import InputTypeahead from './InputTypeahead';

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

describe('InputTypeahead', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<InputTypeahead {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content with selectedValues', () => {
    const { getByTestId, getAllByTestId, getByText } = render(<InputTypeahead {...defaultProps} />);

    expect(getByTestId('typeaheadBtn')).toBeInTheDocument();
    expect(getAllByTestId('typeaheadSelectedItem')).toHaveLength(2);
    expect(getByText(defaultProps.label)).toBeInTheDocument();
  });

  it('renders proper content without selectedValues', () => {
    const { getByTestId, getByText } = render(<InputTypeahead {...defaultProps} selected={{}} />);

    expect(getByTestId('typeaheadBtn')).toBeInTheDocument();
    expect(getByText(defaultProps.label)).toBeInTheDocument();
    expect(getByText('No test selected')).toBeInTheDocument();
  });

  it('opens dropdown', () => {
    const { getByTestId, getAllByTestId, getByText, getByPlaceholderText } = render(
      <InputTypeahead {...defaultProps} />
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
    const { getByText, getByTestId } = render(<InputTypeahead {...defaultProps} />);

    const item = getByText('Option key 1');

    fireEvent.click(item);

    expect(getByTestId('typeaheadDropdown')).toBeInTheDocument();
  });

  it('closes dropdown to click again title btn', () => {
    const { getByTestId, queryByTestId } = render(<InputTypeahead {...defaultProps} />);

    const btn = getByTestId('typeaheadBtn');

    fireEvent.click(btn);

    expect(getByTestId('typeaheadDropdown')).toBeInTheDocument();

    fireEvent.click(btn);

    expect(queryByTestId('typeaheadDropdown')).toBeNull();
  });

  it('renders options in correct order', () => {
    const { getByTestId, getAllByTestId } = render(<InputTypeahead {...defaultProps} />);

    const btn = getByTestId('typeaheadBtn');

    fireEvent.click(btn);

    const opts = getAllByTestId('typeaheadDropdownBtn');
    expect(opts[0]).toHaveTextContent('Option key 2(12)');
    expect(opts[1]).toHaveTextContent('Option key 1(7)');
    expect(opts[2]).toHaveTextContent('Option 1(19)');
    expect(opts[3]).toHaveTextContent('Option 2(17)');
  });

  it('unselects option', () => {
    const { getByTestId, getAllByTestId } = render(<InputTypeahead {...defaultProps} />);

    const btn = getByTestId('typeaheadBtn');

    fireEvent.click(btn);

    const opts = getAllByTestId('typeaheadDropdownBtn');

    fireEvent.click(opts[0]);

    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith('key1', 'opt2', false);
  });

  it('selects option', () => {
    const { getByTestId, getAllByTestId } = render(<InputTypeahead {...defaultProps} />);

    const btn = getByTestId('typeaheadBtn');

    fireEvent.click(btn);

    const opts = getAllByTestId('typeaheadDropdownBtn');

    fireEvent.click(opts[2]);

    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith('key2', 'opt11', true);
  });

  it('calls Clear all', () => {
    const { getByTestId } = render(<InputTypeahead {...defaultProps} />);

    const btn = getByTestId('typeaheadBtn');

    fireEvent.click(btn);

    const clearBtn = getByTestId('typeaheadClearBtn');

    fireEvent.click(clearBtn);

    expect(onResetSomeFiltersMock).toHaveBeenCalledTimes(1);
    expect(onResetSomeFiltersMock).toHaveBeenCalledWith(['key1']);
  });

  it('filters options on input change', () => {
    const { getByTestId, getAllByTestId, getAllByText } = render(<InputTypeahead {...defaultProps} />);

    const btn = getByTestId('typeaheadBtn');

    fireEvent.click(btn);

    expect(getAllByTestId('typeaheadDropdownBtn')).toHaveLength(4);

    const input = getByTestId('typeaheadInput');

    fireEvent.change(input, { target: { value: 'ke' } });

    expect(getAllByTestId('typeaheadDropdownBtn')).toHaveLength(2);
    expect(getAllByText('ke')).toHaveLength(2);
    expect(getAllByText('ke')[0]).toHaveClass('hightlighted');
  });

  it('renders placeholder when any results', () => {
    const { getByTestId, getAllByTestId, queryAllByTestId, getByText } = render(<InputTypeahead {...defaultProps} />);

    const btn = getByTestId('typeaheadBtn');

    fireEvent.click(btn);

    expect(getAllByTestId('typeaheadDropdownBtn')).toHaveLength(4);

    const input = getByTestId('typeaheadInput');

    fireEvent.change(input, { target: { value: 'test' } });

    expect(queryAllByTestId('typeaheadDropdownBtn')).toHaveLength(0);
    expect(getByText('Sorry, not matches found')).toBeInTheDocument();
  });
});
