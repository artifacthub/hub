import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

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
    expect(asFragment).toMatchSnapshot();
  });

  it('opens modal with all items', () => {
    const { getByTestId, queryAllByTestId, getByText } = render(<SeeAllModal items={getItems(12)} {...defaultProps} />);

    const btn = getByTestId('seeAllModalBtn');
    expect(btn).toHaveTextContent('See all');
    expect(queryAllByTestId('item')).toHaveLength(3 + 5);

    fireEvent.click(btn);

    waitFor(() => {
      expect(getByText('Displaying only the first 5 entries')).toBeInTheDocument();
      expect(getByText('title')).toBeInTheDocument();
      expect(queryAllByTestId('item')).toHaveLength(12);
    });
  });

  it('does not render button when items list length is less than visible items number', () => {
    const { queryByTestId, queryAllByTestId } = render(<SeeAllModal items={getItems(4)} {...defaultProps} />);

    expect(queryByTestId('seeAllModalBtn')).toBeNull();
    expect(queryAllByTestId('item')).toHaveLength(4);
  });

  it('renders correct visible items number', () => {
    const { queryAllByTestId } = render(<SeeAllModal items={getItems(12)} visibleItems={8} {...defaultProps} />);

    expect(queryAllByTestId('item')).toHaveLength(8 * 2);
  });

  it('initializes with open modal', () => {
    const { getByRole, queryAllByTestId } = render(<SeeAllModal items={getItems(12)} open {...defaultProps} />);

    const modal = getByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveClass('active');

    expect(queryAllByTestId('item')).toHaveLength(32);
  });

  it('closes modal when packageId is a new one', () => {
    const { getByRole, queryByRole, rerender } = render(
      <SeeAllModal items={getItems(12)} open packageId="pkg1" {...defaultProps} />
    );

    expect(getByRole('dialog')).toBeInTheDocument();

    rerender(<SeeAllModal items={getItems(12)} open packageId="pkg2" {...defaultProps} />);

    waitFor(() => {
      expect(queryByRole('modal')).toBeNull();
    });
  });

  it('does not close modal when packageId is the same', () => {
    const { getByRole, rerender } = render(
      <SeeAllModal items={getItems(12)} open packageId="pkg1" {...defaultProps} />
    );

    expect(getByRole('dialog')).toBeInTheDocument();

    rerender(<SeeAllModal items={getItems(15)} open packageId="pkg1" {...defaultProps} />);

    waitFor(() => {
      expect(getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('renders modal with special content', () => {
    const { getByText } = render(
      <SeeAllModal
        items={getItems(12)}
        itemsForModal={<>Special modal content</>}
        open
        packageId="pkg1"
        {...defaultProps}
      />
    );

    expect(getByText('Special modal content')).toBeInTheDocument();
  });
});
