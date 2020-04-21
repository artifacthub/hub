import { render } from '@testing-library/react';
import React from 'react';

import SmallTitle from './SmallTitle';

const defaultProps = {
  text: 'title',
};

describe('SmallTitle', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<SmallTitle {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByTestId, getByText } = render(<SmallTitle {...defaultProps} />);
    expect(getByTestId('smallTitle')).toBeInTheDocument();
    expect(getByText(defaultProps.text)).toBeInTheDocument();
  });
});
