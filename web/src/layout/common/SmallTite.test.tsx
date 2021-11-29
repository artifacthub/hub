import { render, screen } from '@testing-library/react';

import SmallTitle from './SmallTitle';

const defaultProps = {
  text: 'title',
};

describe('SmallTitle', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<SmallTitle {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<SmallTitle {...defaultProps} />);
    expect(screen.getByTestId('smallTitle')).toBeInTheDocument();
    expect(screen.getByText(defaultProps.text)).toBeInTheDocument();
  });
});
