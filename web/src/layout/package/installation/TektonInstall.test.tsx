import { render, screen } from '@testing-library/react';
import React from 'react';

import TektonInstall from './TektonInstall';

describe('TektonInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<TektonInstall contentUrl="https://url.com" />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<TektonInstall contentUrl="https://url.com" />);

      expect(screen.getByText('kubectl apply -f https://url.com')).toBeInTheDocument();
    });

    it('renders private repo', () => {
      render(<TektonInstall contentUrl="https://url.com" isPrivate />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
