import { render } from '@testing-library/react';
import React from 'react';

import Platforms from './Platforms';

const defaultProps = {
  platforms: ['darwin', 'linux', 'windows'],
};

describe('Platforms', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<Platforms {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getAllByTestId } = render(<Platforms {...defaultProps} />);

      expect(getByText('Supported platforms')).toBeInTheDocument();
      const platforms = getAllByTestId('platformBadge');
      expect(platforms).toHaveLength(3);
    });

    it('renders only uniq platfoms', () => {
      const { getAllByTestId } = render(<Platforms platforms={[...defaultProps.platforms, 'darwin']} />);

      const platforms = getAllByTestId('platformBadge');
      expect(platforms).toHaveLength(3);
    });

    it('does not render component if platforms is undefined', () => {
      const { container } = render(<Platforms />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
