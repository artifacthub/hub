import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SeeAllModal from './SeeAllModal';

const getItems = (itemsNumber: number): JSX.Element[] => {
  return Array.from(Array(itemsNumber), (_, i) => <span data-testid="item" key={i}>{`item ${i}`}</span>);
};

const defaultProps = {
  title: 'title',
};

describe('SeeAllModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SeeAllModal items={getItems(12)} {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('opens modal with all items', async () => {
    render(<SeeAllModal items={getItems(12)} {...defaultProps} />);

    expect(screen.getByText('(12)')).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: 'See all entries' });
    expect(btn).toHaveTextContent('See all');
    expect(screen.getAllByTestId('item')).toHaveLength(3 + 5);
    expect(screen.getByText('Displaying only the first 5 entries')).toBeInTheDocument();

    await userEvent.click(btn);

    expect(await screen.findByRole('dialog')).toHaveClass('active d-block');

    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getAllByTestId('item')).toHaveLength(12 * 2 + 3 + 5);
  });

  it('does not render button when items list length is less than visible items number', () => {
    render(<SeeAllModal items={getItems(4)} {...defaultProps} />);

    expect(screen.queryByRole('button', { name: 'See all entries' })).toBeNull();
    expect(screen.getAllByTestId('item')).toHaveLength(4);
  });

  it('renders correct visible items number', () => {
    render(<SeeAllModal items={getItems(12)} visibleItems={8} {...defaultProps} />);

    expect(screen.getAllByTestId('item')).toHaveLength(8 * 2);
  });

  it('initializes with open modal', () => {
    render(<SeeAllModal items={getItems(12)} open {...defaultProps} />);

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveClass('active');

    expect(screen.getAllByTestId('item')).toHaveLength(32);
  });

  it('closes modal when packageId is a new one', async () => {
    const { rerender } = render(<SeeAllModal items={getItems(12)} open packageId="pkg1" {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(<SeeAllModal items={getItems(12)} packageId="pkg2" {...defaultProps} />);

    expect(await screen.findByRole('dialog')).not.toHaveClass('active d-block');
  });

  it('does not close modal when packageId is the same', async () => {
    const { rerender } = render(<SeeAllModal items={getItems(12)} open packageId="pkg1" {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(<SeeAllModal items={getItems(15)} open packageId="pkg1" {...defaultProps} />);

    expect(await screen.findByRole('dialog')).toHaveClass('active d-block');
  });

  it('renders modal with special content', () => {
    render(
      <SeeAllModal
        items={getItems(12)}
        itemsForModal={<>Special modal content</>}
        open
        packageId="pkg1"
        {...defaultProps}
      />
    );

    expect(screen.getByText('Special modal content')).toBeInTheDocument();
  });
});
