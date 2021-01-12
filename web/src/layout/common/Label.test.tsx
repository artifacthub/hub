import { render } from '@testing-library/react';
import React from 'react';

import Label from './Label';

const defaultProps = {
  text: 'Label text',
};

describe('Label', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<Label {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByText } = render(<Label {...defaultProps} />);

    expect(getByText('Label text')).toBeInTheDocument();
  });

  it('renders icon with custom bg', () => {
    const { getByText } = render(<Label {...defaultProps} icon={<>icon</>} bgLeftIcon="#ffffff" />);

    const icon = getByText('icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveStyle('background-color: #ffffff');
  });

  it('renders icon', () => {
    const { getByText } = render(<Label {...defaultProps} icon={<>icon</>} />);

    const icon = getByText('icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('labelIconWrapper');
  });
});
