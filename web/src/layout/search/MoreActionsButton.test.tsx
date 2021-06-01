import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import MoreActionsButton from './MoreActionsButton';

jest.mock('react-color', () => ({
  SketchPicker: () => <>sketch</>,
}));

describe('MoreActionsButton', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<MoreActionsButton />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<MoreActionsButton />);

      const btn = screen.getByTestId('moreActionsBtn');
      expect(btn).toBeInTheDocument();
    });

    it('displays dropdown', () => {
      render(<MoreActionsButton />);

      const dropdown = screen.getByTestId('moreActionsDropdown');
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).not.toHaveClass('show');

      const btn = screen.getByTestId('moreActionsBtn');
      expect(btn).toBeInTheDocument();

      userEvent.click(btn);

      expect(dropdown).toHaveClass('show');
      expect(screen.getByText('Embed results')).toBeInTheDocument();
    });

    it('opens modal', () => {
      render(
        <>
          <meta name="artifacthub:siteName" content="test" />
          <MoreActionsButton />
        </>
      );

      const btn = screen.getByTestId('moreActionsBtn');
      expect(btn).toBeInTheDocument();

      userEvent.click(btn);

      const widgetBtn = screen.getByTestId('embedResultsWidget');
      expect(widgetBtn).toBeInTheDocument();

      userEvent.click(widgetBtn);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
