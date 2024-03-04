import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { mocked } from 'jest-mock';

import API from '../../api';
import { ErrorKind, ResourceKind } from '../../types';
import InputField from './InputField';
jest.mock('../../api');

const onChangeMock = jest.fn();
const onSetValidationStatusMock = jest.fn();

const defaultProps = {
  label: 'label',
  name: 'name',
  value: '',
  validText: 'valid text',
  invalidText: {
    default: 'invalid text',
    customError: 'custom error',
    excluded: 'excluded error',
  },
  placeholder: 'placeholder',
  autoComplete: 'on',
  additionalInfo: 'additional info',
  onChange: onChangeMock,
  setValidationStatus: onSetValidationStatusMock,
};

describe('InputField', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<InputField {...defaultProps} type="text" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<InputField {...defaultProps} type="text" />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveProperty('type', 'text');
    expect(input).toHaveProperty('placeholder', defaultProps.placeholder);
    expect(input).toHaveProperty('autocomplete', 'on');

    expect(screen.getByText(defaultProps.label)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.validText)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.invalidText.default)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.additionalInfo)).toBeInTheDocument();
  });

  it('calls onChange event to update input', () => {
    render(<InputField {...defaultProps} type="text" />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(onChangeMock).toHaveBeenCalledTimes(1);
  });

  describe('validates input on blur', () => {
    it('valid field', async () => {
      render(<InputField {...defaultProps} type="password" validateOnBlur minLength={6} value="1qa2ws" autoFocus />);
      const input = screen.getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      expect(input.minLength).toBe(6);

      act(() => {
        input.blur();
      });

      expect(input).toBeValid();
      expect(onSetValidationStatusMock).toHaveBeenCalledTimes(1);
    });

    it('invalid field', () => {
      render(<InputField {...defaultProps} type="password" validateOnBlur minLength={6} required autoFocus />);
      const input = screen.getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      expect(input).toBeRequired();

      act(() => {
        input.blur();
      });

      expect(input).toBeInvalid();
    });
  });

  describe('validates input on change', () => {
    it('valid field', () => {
      jest.useFakeTimers();

      render(<InputField {...defaultProps} type="password" validateOnChange minLength={6} value="" autoFocus />);
      const input = screen.getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      expect(input.minLength).toBe(6);
      fireEvent.change(input, { target: { value: '1qa2ws' } });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onSetValidationStatusMock).toHaveBeenCalledTimes(1);
      expect(input).toBeValid();

      jest.useRealTimers();
    });

    it('invalid field', () => {
      jest.useFakeTimers();

      render(
        <InputField {...defaultProps} type="text" value="" validateOnChange excludedValues={['user1']} autoFocus />
      );
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'user1' } });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onSetValidationStatusMock).toHaveBeenCalledTimes(1);
      expect(input).toBeInvalid();

      jest.useRealTimers();
    });
  });

  describe('calls checkAvailability', () => {
    xit('value is available', async () => {
      mocked(API).checkAvailability.mockResolvedValue(true);

      render(
        <InputField
          {...defaultProps}
          type="text"
          value="userAlias"
          validateOnBlur
          checkAvailability={{
            isAvailable: true,
            resourceKind: ResourceKind.userAlias,
            excluded: [],
          }}
          autoFocus
        />
      );
      const input = screen.getByRole('textbox');

      act(() => {
        input.blur();
      });

      await waitFor(() => {
        expect(API.checkAvailability).toBeCalledTimes(1);
      });

      await waitFor(() => {
        expect(input).toBeValid();
      });
    });

    it('value is taken', async () => {
      mocked(API).checkAvailability.mockResolvedValue(true);

      render(
        <InputField
          {...defaultProps}
          type="text"
          value="userAlias"
          validateOnBlur
          checkAvailability={{
            isAvailable: true,
            resourceKind: ResourceKind.userAlias,
            excluded: [],
          }}
          autoFocus
        />
      );
      const input = screen.getByRole('textbox');
      expect(screen.getByText(defaultProps.invalidText.default)).toBeInTheDocument();
      act(() => {
        input.blur();
      });

      await waitFor(() => {
        expect(API.checkAvailability).toBeCalledTimes(1);
      });

      const invalidText = await screen.findByText(defaultProps.invalidText.customError);
      expect(invalidText).toBeInTheDocument();
      expect(input).toBeInvalid();
    });

    xit('checkAvailability validation is ignored when error is different to NotFoundResponse', async () => {
      mocked(API).checkAvailability.mockResolvedValue(true);

      render(
        <InputField
          {...defaultProps}
          type="text"
          value="userAlias"
          validateOnBlur
          checkAvailability={{
            isAvailable: true,
            resourceKind: ResourceKind.userAlias,
            excluded: [],
          }}
          autoFocus
        />
      );
      const input = screen.getByRole('textbox');
      act(() => {
        input.blur();
      });
      await waitFor(() => {
        expect(API.checkAvailability).toHaveBeenCalledWith({ resourceKind: 'userAlias', value: 'userAlias' });
      });
      await waitFor(() => {
        expect(input).toBeValid();
      });
    });
  });

  describe('calls isValidResource', () => {
    it('resource is valid', async () => {
      mocked(API).checkAvailability.mockResolvedValue(true);

      render(
        <InputField
          {...defaultProps}
          type="text"
          value="userAlias"
          validateOnBlur
          checkAvailability={{
            isAvailable: false,
            resourceKind: ResourceKind.userAlias,
            excluded: [],
          }}
          autoFocus
        />
      );
      const input = screen.getByRole('textbox');
      act(() => {
        input.blur();
      });
      await waitFor(() => {
        expect(API.checkAvailability).toBeCalledTimes(1);
      });
      expect(await screen.findByTestId(`${defaultProps.name}Input`)).toBeValid();
    });

    it('resource is not valid', async () => {
      mocked(API).checkAvailability.mockResolvedValue(false);

      render(
        <InputField
          {...defaultProps}
          type="text"
          value="userAlias"
          validateOnBlur
          checkAvailability={{
            isAvailable: false,
            resourceKind: ResourceKind.userAlias,
            excluded: [],
          }}
          autoFocus
        />
      );
      const input = screen.getByRole('textbox');
      expect(screen.getByText(defaultProps.invalidText.default)).toBeInTheDocument();
      act(() => {
        input.blur();
      });

      await waitFor(() => {
        expect(API.checkAvailability).toBeCalledTimes(1);
      });

      const invalidText = await screen.findByText(defaultProps.invalidText.customError);
      expect(invalidText).toBeInTheDocument();
      expect(input).toBeInvalid();
    });

    it('value is part of the excluded list', async () => {
      mocked(API).checkAvailability.mockResolvedValue(false);

      render(
        <InputField {...defaultProps} type="text" value="user1" validateOnBlur excludedValues={['user1']} autoFocus />
      );
      const input = screen.getByRole('textbox');
      expect(screen.getByText(defaultProps.invalidText.default)).toBeInTheDocument();
      act(() => {
        input.blur();
      });

      expect(await screen.findByText(defaultProps.invalidText.excluded)).toBeInTheDocument();
      expect(input).toBeInvalid();
    });
  });

  describe('calls checkPasswordStrength', () => {
    it('Password is strength', async () => {
      mocked(API).checkPasswordStrength.mockResolvedValue(true);

      render(
        <InputField {...defaultProps} type="password" value="abc123" checkPasswordStrength validateOnBlur autoFocus />
      );
      const input = screen.getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      act(() => {
        input.blur();
      });

      await waitFor(() => {
        expect(API.checkPasswordStrength).toBeCalledTimes(1);
        expect(API.checkPasswordStrength).toHaveBeenCalledWith('abc123');
      });

      await waitFor(() => {
        expect(input).toBeValid();
      });
    });

    it('Password is weak', async () => {
      mocked(API).checkPasswordStrength.mockRejectedValue({
        kind: ErrorKind.Other,
        message: 'Insecure password...',
      });

      render(
        <InputField {...defaultProps} type="password" value="abc123" checkPasswordStrength validateOnBlur autoFocus />
      );
      const input = screen.getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      act(() => {
        input.blur();
      });

      await waitFor(() => {
        expect(API.checkPasswordStrength).toBeCalledTimes(1);
        expect(API.checkPasswordStrength).toHaveBeenCalledWith('abc123');
      });

      const invalidText = await screen.findByText('Insecure password...');
      expect(invalidText).toBeInTheDocument();
      expect(input).toBeInvalid();
    });
  });
});
