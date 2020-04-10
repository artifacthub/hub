import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import PaginationLimit from './PaginationLimit';

const updateLimitMock = jest.fn();

const defaultProps = {
  limit: 15,
  updateLimit: updateLimitMock,
  disabled: false,
};

describe('Filters', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<PaginationLimit {...defaultProps} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByLabelText, getByText } = render(<PaginationLimit {...defaultProps} />);

      expect(getByLabelText('pagination-limit')).toBeInTheDocument();
      expect(getByText('15'));
      expect(getByText('25'));
      expect(getByText('50'));
    });

    it('calls updateLimit on select change', () => {
      const { getByLabelText } = render(<PaginationLimit {...defaultProps} />);

      const select = getByLabelText('pagination-limit');
      fireEvent.change(select, { target: { value: '25' } });

      expect(updateLimitMock).toBeCalledTimes(1);
      expect(updateLimitMock).toHaveBeenCalledWith(25);
    });

    it('renders disabled select component', () => {
      const props = { ...defaultProps, disabled: true };
      const { getByLabelText } = render(<PaginationLimit {...props} />);

      const select = getByLabelText('pagination-limit');
      expect(select).toBeDisabled();
    });
  });
});
