import { render, screen } from '@testing-library/react';

import License from './License';

const defaultProps = {
  license: 'MIT',
};

describe('License', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<License {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<License {...defaultProps} />);

      expect(screen.getAllByText(defaultProps.license)).toHaveLength(2);

      const link = screen.getByRole('button', { hidden: true });
      expect(link).toHaveProperty('href', `https://choosealicense.com/licenses/${defaultProps.license.toLowerCase()}/`);
    });

    it('does not render external link when license is not on the available licenses links list', () => {
      render(<License license="xxx" />);

      expect(screen.getByText('xxx')).toBeInTheDocument();
      expect(screen.queryByRole('button', { hidden: true })).toBeNull();
    });

    it('does not render component when license is undefined', () => {
      const { container } = render(<License />);
      expect(container).toBeEmptyDOMElement();
    });

    it('does not render component when license is null', () => {
      const { container } = render(<License license={null} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
