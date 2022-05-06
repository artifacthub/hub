import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ParamInfo from './ParamInfo';
jest.mock('react-markdown', () => () => <div />);
jest.mock('remark-gfm', () => () => <div />);

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
    const { asFragment } = render(<ParamInfo {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<ParamInfo {...defaultProps} />);

      expect(screen.getByText('element')).toBeInTheDocument();
      expect(screen.getByTestId('infoText')).toBeInTheDocument();
      expect(screen.getByText('this is a sample')).toBeInTheDocument();
    });

    it('displays info dropdown to enter on info text and hides on leave', async () => {
      jest.useFakeTimers('legacy');

      render(<ParamInfo {...defaultProps} />);

      const infoDropdown = screen.getByTestId('infoDropdown');

      expect(infoDropdown).not.toHaveClass('visible');

      await userEvent.hover(screen.getByTestId('infoText'));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(infoDropdown).toHaveClass('visible');

      await userEvent.unhover(screen.getByTestId('infoText'));

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(infoDropdown).not.toHaveClass('visible');

      jest.useRealTimers();
    });

    it('hides info dropdown to leave it', async () => {
      jest.useFakeTimers('legacy');

      render(<ParamInfo {...defaultProps} />);

      const infoDropdown = screen.getByTestId('infoDropdown');

      await userEvent.hover(screen.getByTestId('infoText'));
      await userEvent.hover(screen.getByTestId('infoDropdown'));
      await userEvent.unhover(screen.getByTestId('infoText'));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(infoDropdown).toHaveClass('visible');

      await userEvent.unhover(screen.getByTestId('infoDropdown'));

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(infoDropdown).not.toHaveClass('visible');

      jest.useRealTimers();
    });
  });
});
