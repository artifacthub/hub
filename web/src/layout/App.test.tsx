import React from 'react';
import { render } from '@testing-library/react';
import { Router } from 'react-router-dom'
import { createMemoryHistory } from 'history';
import App from './App';

describe('App', () => {
  it('renders correctly', () => {
    const { asFragment } = render(<App />);
    expect(asFragment).toMatchSnapshot();
  });
});
