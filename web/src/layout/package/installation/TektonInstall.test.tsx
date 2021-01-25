import { render } from '@testing-library/react';
import React from 'react';

import TektonInstall from './TektonInstall';

describe('TektonInstall', () => {
  it('creates snapshot', () => {
    const result = render(<TektonInstall contentUrl="https://url.com" />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<TektonInstall contentUrl="https://url.com" />);

      expect(getByText('kubectl apply -f https://url.com')).toBeInTheDocument();
    });
  });
});
