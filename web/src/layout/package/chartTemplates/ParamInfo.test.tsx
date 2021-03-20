import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import ParamInfo from './ParamInfo';

const defaultProps = {
  element: <span>element</span>,
  info: 'this is a sample',
  fixedWidth: false,
};

describe('ParamInfo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<ParamInfo {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByTestId } = render(<ParamInfo {...defaultProps} />);

      expect(getByText('element')).toBeInTheDocument();
      expect(getByTestId('infoText')).toBeInTheDocument();
      expect(getByText('this is a sample')).toBeInTheDocument();
    });

    it('displays info dropdown to enter on info text and hides on leave', async () => {
      const { getByTestId } = render(<ParamInfo {...defaultProps} />);

      expect(getByTestId('infoDropdown')).not.toHaveClass('visible');

      fireEvent.mouseEnter(getByTestId('infoText'));
      await waitFor(() => {
        expect(getByTestId('infoDropdown')).toHaveClass('visible');
      });

      fireEvent.mouseLeave(getByTestId('infoText'));
      await waitFor(() => {
        expect(getByTestId('infoDropdown')).not.toHaveClass('visible');
      });
    });

    it('hides info dropdown to leave it', async () => {
      const { getByTestId } = render(<ParamInfo {...defaultProps} />);
      fireEvent.mouseEnter(getByTestId('infoText'));

      fireEvent.mouseEnter(getByTestId('infoDropdown'));
      fireEvent.mouseLeave(getByTestId('infoText'));
      await waitFor(() => {
        expect(getByTestId('infoDropdown')).toHaveClass('visible');
      });

      fireEvent.mouseLeave(getByTestId('infoDropdown'));
      await waitFor(() => {
        expect(getByTestId('infoDropdown')).not.toHaveClass('visible');
      });
    });
  });
});
