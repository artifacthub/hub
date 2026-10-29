import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { prepareQueryString } from '../../utils/prepareQueryString';
import PackageCategoryLabel from './PackageCategoryLabel';

const mockUseNavigate = jest.fn();

vi.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

const defaultProps = {
  category: 9,
  categoryDisplayName: 'Analytics',
};

describe('PackageCategoryLabel', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<PackageCategoryLabel {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders the category display name', () => {
    render(<PackageCategoryLabel {...defaultProps} />);
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by Analytics')).toBeInTheDocument();
  });

  it('does not render anything when the category is not defined', () => {
    const { container } = render(<PackageCategoryLabel categoryDisplayName="Analytics" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render anything when the category display name is not defined', () => {
    const { container } = render(<PackageCategoryLabel category={9} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('filters packages by category on click', async () => {
    render(<PackageCategoryLabel {...defaultProps} deprecated />);
    await userEvent.click(screen.getByLabelText('Filter by Analytics'));

    expect(mockUseNavigate).toHaveBeenCalledTimes(1);
    expect(mockUseNavigate).toHaveBeenCalledWith({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: 1,
        filters: { category: ['9'] },
        deprecated: true,
      }),
    });
  });
});
