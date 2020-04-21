import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import Pagination from './Pagination';

const mockOnChange = jest.fn();

describe('Pagination', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<Pagination limit={15} total={45} offset={0} active={1} onChange={mockOnChange} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('does not render component when page is only one', () => {
    const { queryByRole } = render(<Pagination limit={15} total={13} offset={0} active={1} onChange={mockOnChange} />);
    expect(queryByRole('navigation')).toBeNull();
  });

  it('renders active button correctly', () => {
    const { getByText } = render(<Pagination limit={15} total={25} offset={0} active={1} onChange={mockOnChange} />);

    const page1Btn = getByText('1');
    expect(page1Btn).toBeInTheDocument();
    expect(page1Btn.closest('li')).toHaveClass('page-item active');
  });

  it('disables previous button when page 1 button is active', () => {
    const { getByText } = render(<Pagination limit={15} total={25} offset={0} active={1} onChange={mockOnChange} />);

    const prevBtn = getByText('Previous');
    expect(prevBtn).toBeInTheDocument();
    expect(prevBtn.closest('li')).toHaveClass('page-item disabled');
  });

  it('disables next button when page 1 button is active', () => {
    const { getByText } = render(<Pagination limit={15} total={50} offset={0} active={4} onChange={mockOnChange} />);

    const nextBtn = getByText('Next');
    expect(nextBtn).toBeInTheDocument();
    expect(nextBtn.closest('li')).toHaveClass('page-item disabled');
  });

  it('calls onChange event when not active page button is clicked', () => {
    const { getByText } = render(<Pagination limit={15} total={50} offset={0} active={1} onChange={mockOnChange} />);

    const page2Btn = getByText('2');
    expect(page2Btn).toBeInTheDocument();
    fireEvent.click(page2Btn);
    expect(mockOnChange).toHaveBeenCalled();
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('does not call onChange event when active page button is clicked', () => {
    const { getByText } = render(<Pagination limit={15} total={50} offset={0} active={1} onChange={mockOnChange} />);

    const page1Btn = getByText('1');
    expect(page1Btn).toBeInTheDocument();
    fireEvent.click(page1Btn);
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('renders 2 ellipsis notation when required', () => {
    const { getAllByText } = render(
      <Pagination limit={15} total={110} offset={0} active={5} onChange={mockOnChange} />
    );

    const ellipsisSpan = getAllByText('...');
    expect(ellipsisSpan).toHaveLength(2);
  });

  it('renders 1 ellipsis notation when required', () => {
    const { getAllByText } = render(
      <Pagination limit={15} total={110} offset={0} active={1} onChange={mockOnChange} />
    );

    const ellipsisSpan = getAllByText('...');
    expect(ellipsisSpan).toHaveLength(1);
  });
});
