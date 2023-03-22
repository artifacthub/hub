import { render, screen } from '@testing-library/react';

import { RepositoryKind } from '../../types';
import RepositoryIconLabel from './RepositoryIconLabel';

const defaultProps = {
  baseUrl: 'https://localhost:8000',
  theme: 'light',
};

describe('RepositoryIconLabel', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<RepositoryIconLabel {...defaultProps} kind={RepositoryKind.Helm} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders icon', () => {
    render(<RepositoryIconLabel {...defaultProps} kind={RepositoryKind.Helm} />);
    expect(screen.getByText('Helm chart')).toBeInTheDocument();
    expect(screen.getByTestId('repoIcon')).toBeInTheDocument();
  });

  it('renders icon label for dark theme', () => {
    render(<RepositoryIconLabel {...defaultProps} kind={RepositoryKind.Helm} theme="dark" />);
    expect(screen.getByTestId('repoIcon')).toHaveClass('grayedOut');
  });

  it('does not render when repo does not belong to the repo list', () => {
    const { container } = render(<RepositoryIconLabel {...defaultProps} kind={30 as RepositoryKind} />);
    expect(container).toBeEmptyDOMElement();
  });
});
