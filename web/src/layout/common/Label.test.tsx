import { render, screen } from '@testing-library/react';

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
    expect(icon.parentElement).toHaveStyle('background-color: #ffffff');
  });

  it('renders icon', () => {
    render(<Label {...defaultProps} icon={<>icon</>} />);

    const icon = screen.getByText('icon');
    expect(icon).toBeInTheDocument();
    expect(screen.getByTestId('label-wrapper')).toHaveClass('labelIconWrapper');
  });

  it('renders icon legend', () => {
    render(<Label {...defaultProps} iconLegend="legend" />);

    expect(screen.getByText('legend')).toBeInTheDocument();
  });

  it('renders success label', () => {
    render(<Label {...defaultProps} icon={<>icon</>} labelStyle="success" />);

    expect(screen.getByText('Label text')).toBeInTheDocument();
    expect(screen.getByTestId('label-wrapper')).not.toHaveClass('labelIconWrapper');
  });
});
