import { render, screen } from '@testing-library/react';

import Label from './Label';

const defaultProps = {
  type: 'official',
};

describe('Label', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<Label {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders official', () => {
    render(<Label {...defaultProps} />);
    expect(screen.getByTitle('official')).toBeInTheDocument();
  });

  it('renders valuesSchema', () => {
    render(<Label type="valuesSchema" />);
    expect(screen.getByTitle('valuesSchema')).toBeInTheDocument();
  });
});
