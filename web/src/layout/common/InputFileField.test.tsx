import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import alertDispatcher from '../../utils/alertDispatcher';
import InputFileField from './InputFileField';
jest.mock('../../api');
jest.mock('../../utils/alertDispatcher');

const onImageChangeMock = jest.fn();
const onAuthErrorMock = jest.fn();

const defaultProps = {
  name: 'test',
  label: 'message',
  onAuthError: onAuthErrorMock,
  onImageChange: onImageChangeMock,
};

describe('InputFileField', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<InputFileField {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByLabelText, getByTestId } = render(<InputFileField {...defaultProps} />);
    expect(getByLabelText(defaultProps.label)).toBeInTheDocument();
    expect(getByTestId('inputFile')).toBeInTheDocument();
    expect(getByTestId('inputFile')).toHaveClass('d-none');
    expect(getByTestId('inputFileBtn')).toBeInTheDocument();
    expect(getByTestId('inputFileBtn')).toHaveProperty('type', 'button');
  });

  it('calls input file click to click button', async () => {
    mocked(API).saveImage.mockResolvedValue({ imageId: '16782' });
    const { getByTestId } = render(<InputFileField {...defaultProps} />);
    const input = getByTestId('inputFile');
    const file = new File(['(image)'], 'testImage.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(API.saveImage).toHaveBeenCalledTimes(1));

    expect(onImageChangeMock).toHaveBeenCalledTimes(1);
    expect(onImageChangeMock).toHaveBeenCalledWith('16782');
  });

  it('calls alertDispatcher when an error occurred to save image', async () => {
    mocked(API).saveImage.mockRejectedValue({ statusText: 'error' });
    const { getByTestId } = render(<InputFileField {...defaultProps} />);
    const input = getByTestId('inputFile');
    const file = new File(['(image)'], 'testImage.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(API.saveImage).toHaveBeenCalledTimes(1));

    expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
    expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
      type: 'danger',
      message: 'An error occurred saving the image, please try again later',
    });
  });

  it('calls onAuthError when ErrLoginRedirect is returned', async () => {
    mocked(API).saveImage.mockRejectedValue({ statusText: 'ErrLoginRedirect' });
    const { getByTestId } = render(<InputFileField {...defaultProps} />);
    const input = getByTestId('inputFile');
    const file = new File(['(image)'], 'testImage.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(API.saveImage).toHaveBeenCalledTimes(1));

    expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
  });

  it('calls alertDispatcher when file is not an image', async () => {
    mocked(API).saveImage.mockResolvedValue({ imageId: '16782' });
    const { getByTestId } = render(<InputFileField {...defaultProps} />);
    const input = getByTestId('inputFile');
    const file = new File(['(text)'], 'text.txt', { type: 'text/text' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1));
    expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
      type: 'danger',
      message: 'Sorry, only images are accepted',
    });
  });
});
