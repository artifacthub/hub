import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import BlockCodeButtons from './BlockCodeButtons';

const defaultProps = {
  filename: 'name',
  content: 'this is a sample',
};

const createObjectMock = jest.fn();

Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: createObjectMock,
  },
});

describe('BlockCodeButtons', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<BlockCodeButtons {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders component', async () => {
    const { getByTestId } = render(<BlockCodeButtons {...defaultProps} />);

    expect(getByTestId('ctcBtn')).toBeInTheDocument();
    expect(getByTestId('downloadBtn')).toBeInTheDocument();
  });

  it('download file', () => {
    const { getByTestId } = render(<BlockCodeButtons {...defaultProps} />);

    const btn = getByTestId('downloadBtn');
    fireEvent.click(btn);

    const blob = new Blob([defaultProps.content], {
      type: 'text/yaml',
    });

    const link = document.querySelector('a');
    expect(link).toBeInTheDocument();

    expect(createObjectMock).toHaveBeenCalledTimes(1);
    expect(createObjectMock).toHaveBeenCalledWith(blob);
  });
});
