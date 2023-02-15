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
      expect(links).toHaveLength(9);
      expect(links[0]).toHaveTextContent('Documentation');
      expect(links[1]).toHaveTextContent('Blog');
      expect(links[2]).toHaveTextContent('GitHub');
      expect(links[3]).toHaveTextContent('Slack');
      expect(links[4]).toHaveTextContent('Twitter');
      expect(links[5]).toHaveTextContent('Apache License 2.0');
      expect(links[6]).toHaveTextContent('The Linux Foundation');
      expect(links[7]).toHaveTextContent('Trademark Usage');
      expect(links[8]).toHaveTextContent('Privacy Policy');

      const statsLink = screen.getByText('Statistics');
      expect(statsLink).toBeInTheDocument();
      expect(statsLink).toHaveAttribute('href', '/stats');

      expect(screen.getByText('© The Artifact Hub Authors')).toBeInTheDocument();
      expect(
        screen.getByText(
          /The Linux Foundation has registered trademarks and uses trademarks. For a list of trademarks of The Linux Foundation/
        )
      ).toBeInTheDocument();
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
