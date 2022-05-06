import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<Tabs {...defaultProps} />);
    const btns = screen.getAllByRole('button', { name: /Open tab/ });
    expect(btns).toHaveLength(3);
    expect(btns[0]).toHaveTextContent('Tab 1');
    expect(btns[1]).toHaveTextContent('Tab 2');
    expect(btns[2]).toHaveTextContent('Tab 3');

    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('activates another tab', async () => {
    render(<Tabs {...defaultProps} />);

    expect(screen.getByText('Content 1')).toBeInTheDocument();

    const btns = screen.getAllByRole('button', { name: /Open tab/ });
    expect(btns[0]).toHaveClass('active');

    await userEvent.click(btns[2]);

    expect(await screen.findByText('Content 3')).toBeInTheDocument();
    expect(btns[2]).toHaveClass('active');
  });
});
