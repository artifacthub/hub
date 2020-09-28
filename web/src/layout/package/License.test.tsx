import { render } from '@testing-library/react';
import React from 'react';

import License from './License';

const defaultProps = {
  license: 'MIT',
};

describe('License', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<License {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByRole } = render(<License {...defaultProps} />);

      expect(getByText(defaultProps.license)).toBeInTheDocument();

      const link = getByRole('button');
      expect(link).toHaveProperty('href', `https://choosealicense.com/licenses/${defaultProps.license.toLowerCase()}/`);
    });

    it('does not render external link when license is not on the available licenses links list', () => {
      const { getByText, queryByRole } = render(<License license="xxx" />);

      expect(getByText('xxx')).toBeInTheDocument();
      expect(queryByRole('button')).toBeNull();
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
