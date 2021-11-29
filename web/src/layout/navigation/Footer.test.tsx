import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';

import Footer from './Footer';

describe('Footer', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <Footer />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <Footer />
        </Router>
      );

      expect(screen.getByRole('contentinfo')).toBeInTheDocument();

      const links = screen.getAllByRole('button');
      expect(links).toHaveLength(6);
      expect(links[0]).toHaveTextContent('Documentation');
      expect(links[1]).toHaveTextContent('Blog');
      expect(links[2]).toHaveTextContent('GitHub');
      expect(links[3]).toHaveTextContent('Slack');
      expect(links[4]).toHaveTextContent('Twitter');
      expect(links[5]).toHaveTextContent('Apache License 2.0');

      const statsLink = screen.getByText('Statistics');
      expect(statsLink).toBeInTheDocument();
      expect(statsLink).toHaveAttribute('href', '/stats');

      expect(screen.getByText('© The Artifact Hub Authors')).toBeInTheDocument();
    });

    it('adds proper styles for hiding footer', () => {
      render(
        <Router>
          <Footer isHidden />
        </Router>
      );

      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveClass('invisibleFooter');
    });
  });
});
