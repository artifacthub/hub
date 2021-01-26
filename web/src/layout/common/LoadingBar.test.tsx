import { render } from '@testing-library/react';
import React from 'react';

import LoadingBar from './LoadingBar';

describe('LoadingBar', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<LoadingBar />);
    expect(asFragment).toMatchSnapshot();
  });
});
