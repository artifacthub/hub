import { render, screen } from '@testing-library/react';

import SubNavbar from './SubNavbar';

const defaultProps = {
  children: <div data-testid="children">Test</div>,
};

describe('SubNavbar', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SubNavbar {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<SubNavbar {...defaultProps} />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByTestId('children')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });
});
