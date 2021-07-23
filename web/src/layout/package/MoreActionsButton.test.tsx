import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import MoreActionsButton from './MoreActionsButton';

const defaultProps = {
  packageId: 'id',
  packageName: 'pkg',
  packageDescription: 'this is the description',
  visibleWidget: false,
};

const mockHistoryReplace = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    replace: mockHistoryReplace,
  }),
}));

describe('MoreActionsButton', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<MoreActionsButton {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<MoreActionsButton {...defaultProps} />);

      const btn = screen.getByRole('button', { name: 'Open menu' });
      expect(btn).toBeInTheDocument();
    });

    it('displays dropdown', () => {
      render(<MoreActionsButton {...defaultProps} />);

      const dropdown = screen.getByRole('menu');
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).not.toHaveClass('show');

      const btn = screen.getByRole('button', { name: 'Open menu' });
      expect(btn).toBeInTheDocument();

      userEvent.click(btn);

      expect(dropdown).toHaveClass('show');
      expect(screen.getByText('Embed widget')).toBeInTheDocument();
    });

    it('opens modal', () => {
      render(<MoreActionsButton {...defaultProps} />);

      const btn = screen.getByRole('button', { name: 'Open menu' });
      expect(btn).toBeInTheDocument();

      userEvent.click(btn);

      const widgetBtn = screen.getByRole('button', { name: 'Open embed widget modal' });
      expect(widgetBtn).toBeInTheDocument();

      userEvent.click(widgetBtn);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
      expect(mockHistoryReplace).toHaveBeenCalledWith({
        search: '?modal=widget',
        state: {
          fromStarredPage: undefined,
          searchUrlReferer: undefined,
        },
      });
    });
  });
});
