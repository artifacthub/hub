import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import InputTypeahead from './InputTypeahead';

const onChangeMock = jest.fn();
const onClearMock = jest.fn();

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
  onClear: onClearMock,
  visibleClear: true,
};

const itemScrollMock = jest.fn();

Object.defineProperty(HTMLElement.prototype, 'scroll', { configurable: true, value: itemScrollMock });

describe('InputTypeahead', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<InputTypeahead {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders options in correct order', () => {
    const { getAllByTestId } = render(<InputTypeahead {...defaultProps} />);

    const opts = getAllByTestId('typeaheadDropdownBtn');
    expect(opts[0]).toHaveTextContent('Option key 2 (12)');
    expect(opts[1]).toHaveTextContent('Option key 1 (7)');
    expect(opts[2]).toHaveTextContent('Option 1 (19)');
    expect(opts[3]).toHaveTextContent('Option 2 (17)');
  });

  it('unselects option', () => {
    const { getAllByTestId } = render(<InputTypeahead {...defaultProps} />);

    const opts = getAllByTestId('typeaheadDropdownBtn');

    fireEvent.click(opts[0]);

    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith('key1', 'opt2', false);
  });

  it('selects option', () => {
    const { getAllByTestId } = render(<InputTypeahead {...defaultProps} />);

    const opts = getAllByTestId('typeaheadDropdownBtn');

    fireEvent.click(opts[2]);

    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith('key2', 'opt11', true);
  });

  it('calls Clear all', () => {
    const { getByTestId } = render(<InputTypeahead {...defaultProps} />);

    const clearBtn = getByTestId('typeaheadClearBtn');
    fireEvent.click(clearBtn);

    expect(onClearMock).toHaveBeenCalledTimes(1);
  });

  it('does not render clear button', () => {
    const { queryByTestId } = render(<InputTypeahead {...defaultProps} visibleClear={false} />);

    expect(queryByTestId('typeaheadClearBtn')).toBeNull();
  });

  it('filters options on input change', () => {
    const { getByTestId, getAllByTestId, getAllByText } = render(<InputTypeahead {...defaultProps} />);

    expect(getAllByTestId('typeaheadDropdownBtn')).toHaveLength(4);

    const input = getByTestId('typeaheadInput');
    fireEvent.change(input, { target: { value: 'ke' } });

    expect(getAllByTestId('typeaheadDropdownBtn')).toHaveLength(2);
    expect(getAllByText('ke')).toHaveLength(2);
    expect(getAllByText('ke')[0]).toHaveClass('hightlighted');
  });

  it('filters options on input change when displayItemsInValueLength is defined', () => {
    const { getByTestId, queryAllByTestId, getAllByTestId, getAllByText } = render(
      <InputTypeahead {...defaultProps} displayItemsInValueLength={3} />
    );

    expect(queryAllByTestId('typeaheadDropdownBtn')).toHaveLength(0);

    const input = getByTestId('typeaheadInput');
    fireEvent.change(input, { target: { value: 'key' } });

    expect(getAllByTestId('typeaheadDropdownBtn')).toHaveLength(2);
    expect(getAllByText('key')).toHaveLength(2);
    expect(getAllByText('key')[0]).toHaveClass('hightlighted');

    fireEvent.change(input, { target: { value: 'ke' } });

    expect(queryAllByTestId('typeaheadDropdownBtn')).toHaveLength(0);
  });

  it('renders placeholder when any results', () => {
    const { getByTestId, getAllByTestId, queryAllByTestId, getByText } = render(<InputTypeahead {...defaultProps} />);

    expect(getAllByTestId('typeaheadDropdownBtn')).toHaveLength(4);

    const input = getByTestId('typeaheadInput');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(queryAllByTestId('typeaheadDropdownBtn')).toHaveLength(0);
    expect(getByText('Sorry, no matches found')).toBeInTheDocument();
  });

  it('does not render component when options list is empty', () => {
    const props = {
      ...defaultProps,
      label: 'Empty list',
      options: [],
    };
    const { container } = render(<InputTypeahead {...props} />);

    expect(container).toBeEmptyDOMElement();
  });

  describe('on key down', () => {
    it('highlightes first option', () => {
      const { getByTestId, getAllByTestId } = render(<InputTypeahead {...defaultProps} />);

      const options = getAllByTestId('typeaheadDropdownBtn');
      expect(options).toHaveLength(4);

      const input = getByTestId('typeaheadInput');
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      expect(itemScrollMock).toHaveBeenCalledTimes(1);
      expect(options[0]).toHaveClass('dropdown-item option selected hightlighted');
    });

    it('highlightes last option', () => {
      const { getByTestId, getAllByTestId } = render(<InputTypeahead {...defaultProps} />);

      const options = getAllByTestId('typeaheadDropdownBtn');
      expect(options).toHaveLength(4);

      const input = getByTestId('typeaheadInput');
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      expect(itemScrollMock).toHaveBeenCalledTimes(1);
      expect(options[3]).toHaveClass('dropdown-item option hightlighted');
    });

    it('highlightes first option and unselects it', () => {
      const { getByTestId, getAllByTestId } = render(<InputTypeahead {...defaultProps} />);

      const options = getAllByTestId('typeaheadDropdownBtn');
      expect(options).toHaveLength(4);

      const input = getByTestId('typeaheadInput');
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      expect(itemScrollMock).toHaveBeenCalledTimes(1);
      expect(options[0]).toHaveClass('dropdown-item option selected hightlighted');

      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChangeMock).toHaveBeenCalledTimes(1);
      expect(onChangeMock).toHaveBeenCalledWith('key1', 'opt2', false);
    });

    it('highlightes last option and selects it', () => {
      const { getByTestId, getAllByTestId } = render(<InputTypeahead {...defaultProps} />);

      const options = getAllByTestId('typeaheadDropdownBtn');
      expect(options).toHaveLength(4);

      const input = getByTestId('typeaheadInput');
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      expect(itemScrollMock).toHaveBeenCalledTimes(1);
      expect(options[3]).toHaveClass('dropdown-item option hightlighted');

      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChangeMock).toHaveBeenCalledTimes(1);
      expect(onChangeMock).toHaveBeenCalledWith('key2', 'opt12', true);
    });
  });
});
