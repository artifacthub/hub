import { render, screen } from '@testing-library/react';

import { RepositoryKind } from '../../types';
import RepositoryIcon from './RepositoryIcon';

const defaultProps = {
  baseUrl: 'https://localhost:8000',
};

describe('RepositoryIcon', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<RepositoryIcon {...defaultProps} kind={RepositoryKind.Helm} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders icon', () => {
    render(<RepositoryIcon {...defaultProps} kind={RepositoryKind.Helm} />);
    expect(screen.getByTestId('repoIcon')).toBeInTheDocument();
  });

  it('renders icon with specific classname', () => {
    render(<RepositoryIcon {...defaultProps} kind={RepositoryKind.Helm} className="test" />);
    expect(screen.getByTestId('repoIcon')).toHaveClass('test');
  });
});
