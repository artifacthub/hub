import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import SchemaValuesSearch from './SchemaValuesSearch';

const onSearchMock = jest.fn();

const defaultProps = {
  paths: ['path1', 'path1.subpath1', 'path1.subpath2', 'path2'],
  onSearch: onSearchMock,
};

describe('SchemaValuesSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<SchemaValuesSearch {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  it('renders component', () => {
    const { getByTestId } = render(<SchemaValuesSearch {...defaultProps} />);
    expect(getByTestId('typeaheadInput')).toBeInTheDocument();
  });

  it('displays options', () => {
    const { getByTestId, getAllByTestId } = render(<SchemaValuesSearch {...defaultProps} />);

    const input = getByTestId('typeaheadInput');
    fireEvent.change(input, { target: { value: 'sub' } });

    expect(getAllByTestId('typeaheadDropdownBtn')).toHaveLength(2);
  });

  it('calls onSearch with selected path', () => {
    const { getByTestId, getAllByTestId } = render(<SchemaValuesSearch {...defaultProps} />);

    const input = getByTestId('typeaheadInput');
    fireEvent.change(input, { target: { value: 'sub' } });

    const opts = getAllByTestId('typeaheadDropdownBtn');
    fireEvent.click(opts[0]);

    expect(onSearchMock).toHaveBeenCalledTimes(1);
    expect(onSearchMock).toHaveBeenCalledWith('path1.subpath1');
  });

  it('calls onSearch twice', async () => {
    const { getByTestId, getAllByTestId } = render(
      <SchemaValuesSearch {...defaultProps} activePath="path1.subpath1" />
    );

    const input = getByTestId('typeaheadInput');
    fireEvent.change(input, { target: { value: 'sub' } });

    const opts = getAllByTestId('typeaheadDropdownBtn');
    fireEvent.click(opts[0]);

    await waitFor(() => {
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 10);

      expect(onSearchMock).toHaveBeenCalledTimes(2);
      expect(onSearchMock).toHaveBeenNthCalledWith(1, undefined);
      expect(onSearchMock).toHaveBeenNthCalledWith(2, 'path1.subpath1');
    });
  });
});
