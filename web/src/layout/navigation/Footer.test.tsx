import { render } from '@testing-library/react';
import React from 'react';

import Footer from './Footer';

describe('Footer', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<Footer />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getAllByRole, getByRole } = render(<Footer />);

      expect(getByRole('contentinfo')).toBeInTheDocument();

      const links = getAllByRole('button');
      expect(links).toHaveLength(9);
      expect(links[0]).toHaveTextContent('Getting started');
      expect(links[1]).toHaveTextContent('API docs');
      expect(links[2]).toHaveTextContent('Blog');
      expect(links[3]).toHaveTextContent('Code of conduct');
      expect(links[4]).toHaveTextContent('Contributing');
      expect(links[5]).toHaveTextContent('GitHub');
      expect(links[6]).toHaveTextContent('Slack');
      expect(links[7]).toHaveTextContent('Twitter');
      expect(links[8]).toHaveTextContent('Apache License 2.0');

      expect(getByText('© The Artifact Hub Authors')).toBeInTheDocument();
    });

    it('adds proper styles for hiding footer', () => {
      const { getByRole } = render(<Footer isHidden />);

      const footer = getByRole('contentinfo');
      expect(footer).toHaveClass('invisibleFooter');
    });
  });
});
