import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import PaginationLimit from './PaginationLimit';

const updateLimitMock = jest.fn();

const defaultProps = {
  limit: 20,
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
      expect(getByText('20'));
      expect(getByText('40'));
      expect(getByText('60'));
    });

    it('calls updateLimit on select change', () => {
      const { getByLabelText } = render(<PaginationLimit {...defaultProps} />);

      const select = getByLabelText('pagination-limit');
      fireEvent.change(select, { target: { value: '60' } });

      expect(updateLimitMock).toBeCalledTimes(1);
      expect(updateLimitMock).toHaveBeenCalledWith(60);
    });

    it('renders disabled select component', () => {
      const props = { ...defaultProps, disabled: true };
      const { getByLabelText } = render(<PaginationLimit {...props} />);

      const select = getByLabelText('pagination-limit');
      expect(select).toBeDisabled();
    });

    it('calls updateLimit with default value when limit is not valid', () => {
      render(<PaginationLimit {...defaultProps} limit={15} />);

      expect(updateLimitMock).toBeCalledTimes(1);
      expect(updateLimitMock).toHaveBeenCalledWith(20);
    });
  });
});
