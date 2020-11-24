import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import Tabs from './Tabs';

const defaultProps = {
  tabs: [
    {
      name: 'tab1',
      title: 'Tab 1',
      content: <>Content 1</>,
    },
    {
      name: 'tab2',
      title: 'Tab 2',
      content: <>Content 2</>,
    },
    {
      name: 'tab3',
      title: 'Tab 3',
      content: <>Content 3</>,
    },
  ],
  active: 'tab1',
  noDataContent: 'no data',
};

describe('Tabs', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<Tabs {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getAllByTestId, getByText } = render(<Tabs {...defaultProps} />);
    const btns = getAllByTestId('tabBtn');
    expect(btns).toHaveLength(3);
    expect(btns[0]).toHaveTextContent('Tab 1');
    expect(btns[1]).toHaveTextContent('Tab 2');
    expect(btns[2]).toHaveTextContent('Tab 3');

    expect(getByText('Content 1')).toBeInTheDocument();
  });

  it('activates another tab', () => {
    const { getAllByTestId, getByText } = render(<Tabs {...defaultProps} />);

    expect(getByText('Content 1')).toBeInTheDocument();

    const btns = getAllByTestId('tabBtn');
    expect(btns[0]).toHaveClass('active');

    fireEvent.click(btns[2]);

    waitFor(() => {
      expect(btns[2]).toHaveClass('active');
      expect(getByText('Content 3')).toBeInTheDocument();
    });
  });
});
