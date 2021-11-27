import { render, screen } from '@testing-library/react';

import NoData from './NoData';

const defaultProps = {
  children: 'no data',
};

describe('NoData', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<NoData {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<NoData {...defaultProps} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(defaultProps.children)).toBeInTheDocument();
  });

  it('renders proper content with issues link visible', () => {
    render(<NoData {...defaultProps} issuesLinkVisible />);
    expect(screen.getByText(/If this error persists, please create an issue/i)).toBeInTheDocument();
    const link = screen.getByRole('button');
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('here');
    expect(link).toHaveAttribute('href', 'https://github.com/artifacthub/hub/issues/new/choose');
  });
});
