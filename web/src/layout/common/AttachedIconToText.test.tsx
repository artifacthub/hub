import { render, screen } from '@testing-library/react';

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
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders component', () => {
    render(<AttachedIconToText {...defaultProps} />);

    expect(screen.getByTestId('attachedIconToTextWrapper')).toBeInTheDocument();
    expect(screen.getByText('icon')).toBeInTheDocument();
    for (let i = 0; i < defaultProps.text.length; i++) {
      expect(screen.getByText(defaultProps.text[i])).toBeInTheDocument();
    }
  });
});
