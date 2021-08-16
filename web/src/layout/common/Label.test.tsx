import { render, screen } from '@testing-library/react';
import React from 'react';

import Label from './Label';

const defaultProps = {
  text: 'Label text',
};

describe('Label', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<Label {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<Label {...defaultProps} />);

    expect(screen.getByText('Label text')).toBeInTheDocument();
  });

  it('renders icon with custom bg', () => {
    render(<Label {...defaultProps} icon={<>icon</>} bgLeftIcon="#ffffff" />);

    const icon = screen.getByText('icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveStyle('background-color: #ffffff');
  });

  it('renders icon', () => {
    render(<Label {...defaultProps} icon={<>icon</>} />);

    const icon = screen.getByText('icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('labelIconWrapper');
  });
});
