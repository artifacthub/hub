import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import NotFoundView from './index';

describe('NotFoundView', () => {
  it('renders correctly', () => {
    const { asFragment } = render(
      <Router>
        <NotFoundView />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(
      <Router>
        <NotFoundView />
      </Router>
    );
    expect(screen.getByText('Error 404 - Page Not Found')).toBeInTheDocument();
    expect(screen.getByText("The page you were looking for wasn't found")).toBeInTheDocument();
  });

  it('opens Home link', async () => {
    render(
      <Router>
        <NotFoundView />
      </Router>
    );

    await userEvent.click(screen.getByText(/Back Home/i));
    expect(window.location.pathname).toBe('/');
  });
});
