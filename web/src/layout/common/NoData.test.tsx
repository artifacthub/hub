import { render } from '@testing-library/react';
import React from 'react';

import NoData from './NoData';

const defaultProps = {
  children: 'no data',
};

describe('NoData', () => {
  it('renders correctly', () => {
    const { asFragment } = render(<NoData {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByTestId, getByText } = render(<NoData {...defaultProps} />);
    expect(getByTestId('noData')).toBeInTheDocument();
    expect(getByText(defaultProps.children)).toBeInTheDocument();
  });
});
