import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FullScreenModal from './FullScreenModal';

const onCloseMock = jest.fn();

const defaultProps = {
  children: <>test</>,
  open: true,
  onClose: onCloseMock,
};

describe('FullScreenModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<FullScreenModal {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<FullScreenModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes modal pressing ESC', async () => {
      const { container } = render(<FullScreenModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('does not render component', () => {
    it('when openStatus is false', () => {
      const { container } = render(<FullScreenModal {...defaultProps} open={false} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
