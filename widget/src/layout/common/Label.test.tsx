import { render, screen } from '@testing-library/react';

import Label from './Label';

const defaultProps = {
  icon: <>icon</>,
  text: 'label',
};

describe('Label', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<Label {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders label', () => {
    render(<Label {...defaultProps} />);
    expect(screen.getByText('icon')).toBeInTheDocument();
    expect(screen.getByText('label')).toBeInTheDocument();
  });

  it('renders label with specific type', () => {
    render(<Label {...defaultProps} type="success" />);
    const icon = screen.getByText('icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('success');
  });
});
