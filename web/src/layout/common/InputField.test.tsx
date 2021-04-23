import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
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
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByTestId, getByText } = render(<InputField {...defaultProps} type="text" />);
    const input = getByTestId(`${defaultProps.name}Input`);
    expect(input).toBeInTheDocument();
    expect(input).toHaveProperty('type', 'text');
    expect(input).toHaveProperty('placeholder', defaultProps.placeholder);
    expect(input).toHaveProperty('autocomplete', 'on');

    expect(getByText(defaultProps.label)).toBeInTheDocument();
    expect(getByText(defaultProps.validText)).toBeInTheDocument();
    expect(getByText(defaultProps.invalidText.default)).toBeInTheDocument();
    expect(getByText(defaultProps.additionalInfo)).toBeInTheDocument();
  });

  it('calls onChange event to update input', () => {
    const { getByTestId } = render(<InputField {...defaultProps} type="text" />);
    const input = getByTestId(`${defaultProps.name}Input`);
    fireEvent.change(input, { target: { value: 'test' } });
    expect(onChangeMock).toHaveBeenCalledTimes(1);
  });

  describe('validates input on blur', () => {
    it('valid field', () => {
      const { getByTestId } = render(
        <InputField {...defaultProps} type="password" validateOnBlur minLength={6} value="1qa2ws" autoFocus />
      );
      const input = getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      expect(input.minLength).toBe(6);
      input.blur();
      expect(input).toBeValid();
      expect(onSetValidationStatusMock).toHaveBeenCalledTimes(1);
    });

    it('invalid field', () => {
      const { getByTestId } = render(
        <InputField {...defaultProps} type="password" validateOnBlur minLength={6} required autoFocus />
      );
      const input = getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      expect(input).toBeRequired();
      input.blur();
      expect(input).toBeInvalid();
    });
  });

  describe('validates input on change', () => {
    it('valid field', () => {
      jest.useFakeTimers();

      const { getByTestId } = render(
        <InputField {...defaultProps} type="password" validateOnChange minLength={6} value="" autoFocus />
      );
      const input = getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      expect(input.minLength).toBe(6);
      fireEvent.change(input, { target: { value: '1qa2ws' } });

      act(() => {
        jest.runTimersToTime(300);
      });

      expect(onSetValidationStatusMock).toHaveBeenCalledTimes(1);
      expect(input).toBeValid();

      jest.useRealTimers();
    });

    it('invalid field', () => {
      jest.useFakeTimers();

      const { getByTestId } = render(
        <InputField {...defaultProps} type="text" value="" validateOnChange excludedValues={['user1']} autoFocus />
      );
      const input = getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'user1' } });

      act(() => {
        jest.runTimersToTime(300);
      });

      expect(onSetValidationStatusMock).toHaveBeenCalledTimes(1);
      expect(input).toBeInvalid();

      jest.useRealTimers();
    });
  });

  describe('calls checkAvailability', () => {
    it('value is available', async () => {
      mocked(API).checkAvailability.mockResolvedValue(true);

      const { getByTestId } = render(
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
      const input = getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      input.blur();
      expect(API.checkAvailability).toBeCalledTimes(1);
      await waitFor(() => {
        expect(input).toBeValid();
      });
    });

    it('value is taken', async () => {
      mocked(API).checkAvailability.mockResolvedValue(true);

      const { getByTestId, getByText } = render(
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
      const input = getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      expect(getByText(defaultProps.invalidText.default)).toBeInTheDocument();
      input.blur();

      expect(API.checkAvailability).toBeCalledTimes(1);

      const invalidText = await waitFor(() => getByText(defaultProps.invalidText.customError));
      expect(invalidText).toBeInTheDocument();
      expect(input).toBeInvalid();
    });

    it('checkAvailability validation is ignored when error is different to NotFoundResponse', async () => {
      mocked(API).checkAvailability.mockResolvedValue(true);

      const { getByTestId } = render(
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
      const input = getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      input.blur();
      expect(API.checkAvailability).toBeCalledTimes(1);
      await waitFor(() => {
        expect(input).toBeValid();
      });
    });
  });

  describe('calls isValidResource', () => {
    it('resource is valid', async () => {
      mocked(API).checkAvailability.mockResolvedValue(true);

      const { getByTestId } = render(
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
      const input = getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      input.blur();
      expect(API.checkAvailability).toBeCalledTimes(1);
      await waitFor(() => {
        expect(input).toBeValid();
      });
    });

    it('resource is not valid', async () => {
      mocked(API).checkAvailability.mockResolvedValue(false);

      const { getByTestId, getByText } = render(
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
      const input = getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      expect(getByText(defaultProps.invalidText.default)).toBeInTheDocument();
      input.blur();

      expect(API.checkAvailability).toBeCalledTimes(1);

      const invalidText = await waitFor(() => getByText(defaultProps.invalidText.customError));
      expect(invalidText).toBeInTheDocument();
      expect(input).toBeInvalid();
    });

    it('value is part of the excluded list', () => {
      mocked(API).checkAvailability.mockResolvedValue(false);

      const { getByTestId, getByText } = render(
        <InputField {...defaultProps} type="text" value="user1" validateOnBlur excludedValues={['user1']} autoFocus />
      );
      const input = getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      expect(getByText(defaultProps.invalidText.default)).toBeInTheDocument();
      input.blur();

      const invalidText = getByText(defaultProps.invalidText.excluded);
      expect(invalidText).toBeInTheDocument();
      expect(input).toBeInvalid();
    });
  });

  describe('calls checkPasswordStrength', () => {
    it('Password is strength', async () => {
      mocked(API).checkPasswordStrength.mockResolvedValue(true);

      const { getByTestId } = render(
        <InputField {...defaultProps} type="password" value="abc123" checkPasswordStrength validateOnBlur autoFocus />
      );
      const input = getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      input.blur();

      expect(API.checkPasswordStrength).toBeCalledTimes(1);
      expect(API.checkPasswordStrength).toHaveBeenCalledWith('abc123');

      await waitFor(() => {
        expect(input).toBeValid();
      });
    });

    it('Password is weak', async () => {
      mocked(API).checkPasswordStrength.mockRejectedValue({
        kind: ErrorKind.Other,
        message: 'Insecure password...',
      });

      const { getByTestId, getByText } = render(
        <InputField {...defaultProps} type="password" value="abc123" checkPasswordStrength validateOnBlur autoFocus />
      );
      const input = getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      input.blur();

      expect(API.checkPasswordStrength).toBeCalledTimes(1);
      expect(API.checkPasswordStrength).toHaveBeenCalledWith('abc123');

      const invalidText = await waitFor(() => getByText('Insecure password...'));
      expect(invalidText).toBeInTheDocument();
      expect(input).toBeInvalid();
    });
  });
});
