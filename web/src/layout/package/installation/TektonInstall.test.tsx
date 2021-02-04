import { render } from '@testing-library/react';
import React from 'react';

import TektonInstall from './TektonInstall';

describe('TektonInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<TektonInstall contentUrl="https://url.com" />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<TektonInstall contentUrl="https://url.com" />);

      expect(getByText('kubectl apply -f https://url.com')).toBeInTheDocument();
    });

    it('renders private repo', () => {
      const { getByRole } = render(<TektonInstall contentUrl="https://url.com" isPrivate />);

      const alert = getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
