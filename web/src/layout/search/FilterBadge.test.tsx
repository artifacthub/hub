import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FilterBadge from './FilterBadge';

const onClickMock = jest.fn();

const defaultProps = {
  type: 'Category',
  name: 'Test',
  onClick: onClickMock,
};

describe('FilterBadge', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<FilterBadge {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<FilterBadge {...defaultProps} />);

      expect(screen.getByText('Category:')).toBeInTheDocument();
      expect(screen.getByText(/Test/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Remove filter/ })).toBeInTheDocument();
    });

    it('calls onClick prop to click button', async () => {
      render(<FilterBadge {...defaultProps} />);

      const btn = screen.getByRole('button', { name: /Remove filter/ });
      await userEvent.click(btn);

      await waitFor(() => expect(onClickMock).toHaveBeenCalledTimes(1));
    });
  });
});
