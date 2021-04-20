import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import SchemaValuesSearch from './SchemaValuesSearch';

const onSearchMock = jest.fn();

const defaultProps = {
  paths: ['path1', 'path1.subpath1', 'path1.subpath2', 'path2'],
  onSearch: onSearchMock,
};

describe('SchemaValuesSearch', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<SchemaValuesSearch {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  it('renders component', () => {
    render(<SchemaValuesSearch {...defaultProps} />);
    expect(screen.getByTestId('typeaheadInput')).toBeInTheDocument();
  });

  it('displays options', () => {
    render(<SchemaValuesSearch {...defaultProps} />);

    userEvent.type(screen.getByTestId('typeaheadInput'), 'sub');

    expect(screen.getAllByTestId('typeaheadDropdownBtn')).toHaveLength(2);
  });

  it('calls onSearch with selected path', () => {
    render(<SchemaValuesSearch {...defaultProps} />);

    userEvent.type(screen.getByTestId('typeaheadInput'), 'sub');

    const opts = screen.getAllByTestId('typeaheadDropdownBtn');
    userEvent.click(opts[0]);

    expect(onSearchMock).toHaveBeenCalledTimes(1);
    expect(onSearchMock).toHaveBeenCalledWith('path1.subpath1');
  });

  it('calls onSearch twice', async () => {
    render(<SchemaValuesSearch {...defaultProps} activePath="path1.subpath1" />);

    userEvent.type(screen.getByTestId('typeaheadInput'), 'sub');

    const opts = screen.getAllByTestId('typeaheadDropdownBtn');
    userEvent.click(opts[0]);

    await waitFor(() => expect(onSearchMock).toHaveBeenCalledTimes(2));
    expect(onSearchMock).toHaveBeenNthCalledWith(1, undefined);
    expect(onSearchMock).toHaveBeenNthCalledWith(2, 'path1.subpath1');
  });
});
