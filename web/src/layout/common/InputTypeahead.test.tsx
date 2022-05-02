import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders options in correct order', () => {
    render(<InputTypeahead {...defaultProps} />);

    const opts = screen.getAllByTestId('typeaheadDropdownBtn');
    expect(opts[0]).toHaveTextContent('Option key 2 (12)');
    expect(opts[1]).toHaveTextContent('Option key 1 (7)');
    expect(opts[2]).toHaveTextContent('Option 1 (19)');
    expect(opts[3]).toHaveTextContent('Option 2 (17)');
  });

  it('unselects option', async () => {
    render(<InputTypeahead {...defaultProps} />);

    const opts = screen.getAllByTestId('typeaheadDropdownBtn');
    await userEvent.click(opts[0]);

    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith('key1', 'opt2', false);
  });

  it('selects option', async () => {
    render(<InputTypeahead {...defaultProps} />);

    const opts = screen.getAllByTestId('typeaheadDropdownBtn');
    await userEvent.click(opts[2]);

    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith('key2', 'opt11', true);
  });

  it('calls Clear all', async () => {
    render(<InputTypeahead {...defaultProps} />);

    const clearBtn = screen.getByRole('button', { name: 'Clear all' });
    await userEvent.click(clearBtn);

    expect(onClearMock).toHaveBeenCalledTimes(1);
  });

  it('does not render clear button', () => {
    render(<InputTypeahead {...defaultProps} visibleClear={false} />);

    expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
  });

  it('filters options on input change', async () => {
    render(<InputTypeahead {...defaultProps} />);

    expect(screen.getAllByTestId('typeaheadDropdownBtn')).toHaveLength(4);

    await userEvent.type(screen.getByRole('textbox'), 'ke');

    expect(screen.getAllByTestId('typeaheadDropdownBtn')).toHaveLength(2);
    expect(screen.getAllByText('ke')).toHaveLength(2);
    expect(screen.getAllByText('ke')[0]).toHaveClass('highlighted');
  });

  it('filters options on input change when displayItemsInValueLength is defined', async () => {
    render(<InputTypeahead {...defaultProps} displayItemsInValueLength={3} />);

    expect(screen.queryAllByTestId('typeaheadDropdownBtn')).toHaveLength(0);

    const input = screen.getByPlaceholderText('Search test');
    await userEvent.type(input, 'key');

    expect(screen.getAllByTestId('typeaheadDropdownBtn')).toHaveLength(2);
    expect(screen.getAllByText('key')).toHaveLength(2);
    expect(screen.getAllByText('key')[0]).toHaveClass('highlighted');

    await userEvent.type(input, 'ke');

    expect(screen.queryAllByTestId('typeaheadDropdownBtn')).toHaveLength(0);
  });

  it('renders placeholder when any results', async () => {
    render(<InputTypeahead {...defaultProps} />);

    expect(screen.getAllByTestId('typeaheadDropdownBtn')).toHaveLength(4);

    await userEvent.type(screen.getByPlaceholderText('Search test'), 'test');

    expect(screen.queryAllByTestId('typeaheadDropdownBtn')).toHaveLength(0);
    expect(screen.getByText('Sorry, no matches found')).toBeInTheDocument();
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
    it('highlightes first option', async () => {
      render(<InputTypeahead {...defaultProps} />);

      const options = screen.getAllByTestId('typeaheadDropdownBtn');
      expect(options).toHaveLength(4);

      await userEvent.type(screen.getByPlaceholderText('Search test'), '{arrowdown}');

      expect(itemScrollMock).toHaveBeenCalledTimes(1);
      expect(options[0]).toHaveClass('dropdown-item option selected highlighted');
    });

    it('highlightes last option', async () => {
      render(<InputTypeahead {...defaultProps} />);

      const options = screen.getAllByTestId('typeaheadDropdownBtn');
      expect(options).toHaveLength(4);

      await userEvent.type(screen.getByPlaceholderText('Search test'), '{arrowup}');

      expect(itemScrollMock).toHaveBeenCalledTimes(1);
      expect(options[3]).toHaveClass('dropdown-item option highlighted');
    });

    it('highlightes first option and unselects it', async () => {
      render(<InputTypeahead {...defaultProps} />);

      const options = screen.getAllByTestId('typeaheadDropdownBtn');
      expect(options).toHaveLength(4);

      const input = screen.getByPlaceholderText('Search test');
      await userEvent.type(input, '{arrowdown}');

      expect(itemScrollMock).toHaveBeenCalledTimes(1);
      expect(options[0]).toHaveClass('dropdown-item option selected highlighted');

      await userEvent.type(input, '{enter}');
      expect(onChangeMock).toHaveBeenCalledTimes(1);
      expect(onChangeMock).toHaveBeenCalledWith('key1', 'opt2', false);
    });

    it('highlightes last option and selects it', async () => {
      render(<InputTypeahead {...defaultProps} />);

      const options = screen.getAllByTestId('typeaheadDropdownBtn');
      expect(options).toHaveLength(4);

      const input = screen.getByPlaceholderText('Search test');
      await userEvent.type(input, '{arrowup}');

      expect(itemScrollMock).toHaveBeenCalledTimes(1);
      expect(options[3]).toHaveClass('dropdown-item option highlighted');

      await userEvent.type(input, '{enter}');
      expect(onChangeMock).toHaveBeenCalledTimes(1);
      expect(onChangeMock).toHaveBeenCalledWith('key2', 'opt12', true);
    });
  });
});
