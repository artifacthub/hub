import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import ParamInfo from './ParamInfo';

const defaultProps = {
  element: <span>element</span>,
  info: 'this is a sample',
  fixedWidth: false,
};

describe('ParamInfo', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<ParamInfo {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<ParamInfo {...defaultProps} />);

      expect(screen.getByText('element')).toBeInTheDocument();
      expect(screen.getByTestId('infoText')).toBeInTheDocument();
      expect(screen.getByText('this is a sample')).toBeInTheDocument();
    });

    it('displays info dropdown to enter on info text and hides on leave', async () => {
      jest.useFakeTimers();

      render(<ParamInfo {...defaultProps} />);

      const infoDropdown = screen.getByTestId('infoDropdown');

      expect(infoDropdown).not.toHaveClass('visible');

      userEvent.hover(screen.getByTestId('infoText'));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(infoDropdown).toHaveClass('visible');

      userEvent.unhover(screen.getByTestId('infoText'));

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(infoDropdown).not.toHaveClass('visible');

      jest.useRealTimers();
    });

    it('hides info dropdown to leave it', async () => {
      jest.useFakeTimers();

      render(<ParamInfo {...defaultProps} />);

      const infoDropdown = screen.getByTestId('infoDropdown');

      userEvent.hover(screen.getByTestId('infoText'));
      userEvent.hover(screen.getByTestId('infoDropdown'));
      userEvent.unhover(screen.getByTestId('infoText'));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(infoDropdown).toHaveClass('visible');

      userEvent.unhover(screen.getByTestId('infoDropdown'));

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(infoDropdown).not.toHaveClass('visible');

      jest.useRealTimers();
    });
  });
});
