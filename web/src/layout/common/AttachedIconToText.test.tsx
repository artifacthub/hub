import { render } from '@testing-library/react';
import React from 'react';

import AttachedIconToText from './AttachedIconToText';

const defaultProps = {
  text: 'abcdefghijkl',
  icon: <>icon</>,
  isVisible: true,
};

describe('AttachedIconToText', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<AttachedIconToText {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<AttachedIconToText {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders component', () => {
    const { getByText, getByTestId } = render(<AttachedIconToText {...defaultProps} />);

    expect(getByTestId('attachedIconToTextWrapper')).toBeInTheDocument();
    expect(getByText('icon')).toBeInTheDocument();
    for (let i = 0; i < defaultProps.text.length; i++) {
      expect(getByText(defaultProps.text[i])).toBeInTheDocument();
    }
  });
});
