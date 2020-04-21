import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import Sidebar from './Sidebar';

const defaultProps = {
  children: <span>Sidebar content</span>,
  header: 'title',
};

describe('Sidebar', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<Sidebar {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByTestId, getByText } = render(<Sidebar {...defaultProps} />);
    expect(getByTestId('openSidebarBtn')).toBeInTheDocument();
    expect(getByTestId('closeSidebarBtn')).toBeInTheDocument();
    expect(getByTestId('closeSidebarFooterBtn')).toBeInTheDocument();
    expect(getByText(defaultProps.header)).toBeInTheDocument();
    expect(getByText('Sidebar content')).toBeInTheDocument();
  });

  it('opens sidebar', () => {
    const { getByTestId } = render(<Sidebar {...defaultProps} />);
    const sidebar = getByTestId('sidebarContent');
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).not.toHaveClass('active');
    const btn = getByTestId('openSidebarBtn');
    fireEvent.click(btn);
    expect(sidebar).toHaveClass('active');
  });
});
