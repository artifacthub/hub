import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { MdImage } from 'react-icons/md';

import API from '../../api';
import { ErrorKind } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import InputFileField from './InputFileField';
jest.mock('../../api');
jest.mock('../../utils/alertDispatcher');

const onImageChangeMock = jest.fn();
const onAuthErrorMock = jest.fn();

const defaultProps = {
  name: 'test',
  label: 'message',
  circularCrop: false,
  onAuthError: onAuthErrorMock,
  onImageChange: onImageChangeMock,
};

describe('InputFileField', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<InputFileField {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<InputFileField {...defaultProps} />);
    expect(screen.getByLabelText(defaultProps.label)).toBeInTheDocument();
    expect(screen.getByLabelText('message')).toBeInTheDocument();
    expect(screen.getByLabelText('message')).toHaveClass('d-none');
    expect(screen.getByRole('button', { name: 'Add image' })).toBeInTheDocument();
    expect(screen.getByTestId('defaultIcon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add image' })).toHaveProperty('type', 'button');
  });

  it('renders custom placeholder icon', () => {
    render(<InputFileField {...defaultProps} placeholderIcon={<MdImage />} />);
    expect(screen.queryByTestId('defaultIcon')).toBeNull();
  });

  it('calls saveImage to click saveOriginalBtn button', async () => {
    mocked(API).saveImage.mockResolvedValue({ imageId: '16782' });
    render(<InputFileField {...defaultProps} />);
    const input = screen.getByLabelText('message');
    const file = new File(['(image)'], 'testImage.png', { type: 'image/png' });
    await userEvent.upload(input, file);

    expect(await screen.findByRole('dialog')).toHaveClass('d-block');

    const saveBtn = await screen.findByRole('button', { name: 'Save original' });
    await userEvent.click(saveBtn);

    await waitFor(() => expect(API.saveImage).toHaveBeenCalledTimes(1));

    expect(onImageChangeMock).toHaveBeenCalledTimes(1);
    expect(onImageChangeMock).toHaveBeenCalledWith('16782');
  });

  it('calls alertDispatcher when an error occurred to save image', async () => {
    mocked(API).saveImage.mockRejectedValue({ kind: ErrorKind.Other });
    render(<InputFileField {...defaultProps} />);
    const input = screen.getByLabelText('message');
    const file = new File(['(image)'], 'testImage.png', { type: 'image/png' });
    await userEvent.upload(input, file);

    expect(await screen.findByRole('dialog')).toHaveClass('d-block');

    const saveBtn = await screen.findByRole('button', { name: 'Save original' });
    await userEvent.click(saveBtn);

    await waitFor(() => expect(API.saveImage).toHaveBeenCalledTimes(1));

    expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
    expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
      type: 'danger',
      message: 'An error occurred saving the image, please try again later.',
    });
  });

  it('calls onAuthError when UnauthorizedError is returned', async () => {
    mocked(API).saveImage.mockRejectedValue({
      kind: ErrorKind.Unauthorized,
    });
    render(<InputFileField {...defaultProps} />);
    const input = screen.getByLabelText('message');
    const file = new File(['(image)'], 'testImage.png', { type: 'image/png' });
    await userEvent.upload(input, file);

    expect(await screen.findByRole('dialog')).toHaveClass('d-block');

    const saveBtn = await screen.findByRole('button', { name: 'Save original' });
    await userEvent.click(saveBtn);

    await waitFor(() => expect(API.saveImage).toHaveBeenCalledTimes(1));

    expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
  });

  it('calls alertDispatcher when file is not an image', async () => {
    mocked(API).saveImage.mockResolvedValue({ imageId: '16782' });
    render(<InputFileField {...defaultProps} />);
    const input = screen.getByLabelText('message');
    const file = new File(['(text)'], 'text.txt', { type: 'text/text' });
    await userEvent.upload(input, file);

    await waitFor(() => expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1));
    expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
      type: 'danger',
      message: 'Sorry, only images are accepted',
    });
  });
});
