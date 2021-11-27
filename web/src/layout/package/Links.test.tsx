import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';

import Links from './Links';

const defaultProps = {
  homeUrl: 'http://homelink/',
  links: [
    { name: 'customLink', url: 'http://customlink.com/' },
    { name: 'customLink1', url: 'http://customlink1.com/' },
  ],
};

describe('Links', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <Links {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <Links {...defaultProps} />
        </Router>
      );

      expect(screen.getByText('Links')).toBeInTheDocument();

      const links = screen.getAllByRole('button');
      expect(links).toHaveLength(3);

      const homeUrl = screen.getByText('Homepage');
      expect(homeUrl.closest('a')).toHaveProperty('href', defaultProps.homeUrl);

      expect(links[1]).toHaveTextContent(defaultProps.links[0].name);
      expect(links[1]).toHaveProperty('href', defaultProps.links[0].url);
      expect(links[2]).toHaveTextContent(defaultProps.links[1].name);
      expect(links[2]).toHaveProperty('href', defaultProps.links[1].url);
    });

    it('does not render component when links and homeUrl are not provided', () => {
      const { container } = render(
        <Router>
          <Links />
        </Router>
      );
      expect(container).toBeEmptyDOMElement();
    });
  });
});
