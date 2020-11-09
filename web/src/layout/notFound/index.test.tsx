import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import NotFoundView from './index';

describe('NotFoundView', () => {
  it('renders correctly', () => {
    const { asFragment } = render(
      <Router>
        <NotFoundView />
      </Router>
    );
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByText } = render(
      <Router>
        <NotFoundView />
      </Router>
    );
    expect(getByText('Error 404 - Page Not Found')).toBeInTheDocument();
    expect(getByText("The page you were looking for wasn't found")).toBeInTheDocument();
  });

  it('opens Home link', () => {
    const { getByText } = render(
      <Router>
        <NotFoundView />
      </Router>
    );

    fireEvent.click(getByText(/Back Home/i));
    expect(window.location.pathname).toBe('/');
  });
});
