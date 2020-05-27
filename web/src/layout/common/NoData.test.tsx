import { render } from '@testing-library/react';
import React from 'react';

import NoData from './NoData';

const defaultProps = {
  children: 'no data',
};

describe('NoData', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<NoData {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByTestId, getByText } = render(<NoData {...defaultProps} />);
    expect(getByTestId('noData')).toBeInTheDocument();
    expect(getByText(defaultProps.children)).toBeInTheDocument();
  });

  it('renders proper content with issues link visible', () => {
    const { getByRole, getByText } = render(<NoData {...defaultProps} issuesLinkVisible />);
    expect(getByText(/If this error persists, please create an issue/i)).toBeInTheDocument();
    const link = getByRole('button');
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('here');
    expect(link).toHaveAttribute('href', 'https://github.com/artifacthub/hub/issues/new/choose');
  });
});
