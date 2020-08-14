import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import AutoresizeTextarea from './AutoresizeTextarea';

interface Test {
  value: string;
  rows: number;
}

const tests: Test[] = [
  { value: 'Test', rows: 3 },
  { value: 'Line 1\nLine 2', rows: 3 },
  { value: 'Line 1\nLine 2\nLine 3', rows: 3 },
  { value: 'Line 1\nLine 2\nLine 3\nLine 4', rows: 4 },
  { value: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5', rows: 5 },
  { value: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10', rows: 10 },
];

const mockOnChange = jest.fn();

const defaultProps = {
  name: 'test',
  onChange: mockOnChange,
};

describe('AutoresizeTextarea', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<AutoresizeTextarea {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  for (let i = 0; i < tests.length; i++) {
    it('renders component', () => {
      const { getByTestId } = render(<AutoresizeTextarea {...defaultProps} value={tests[i].value} />);
      const textarea = getByTestId('testTextarea');
      expect(textarea).toHaveProperty('rows', tests[i].rows);
    });
  }

  it('calls onChange when textarea content is changed', () => {
    const { getByTestId } = render(<AutoresizeTextarea {...defaultProps} />);
    const textarea = getByTestId('testTextarea');
    fireEvent.change(textarea, { target: { value: 'test' } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });
});
