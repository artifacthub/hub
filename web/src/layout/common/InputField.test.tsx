import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { ResourceKind } from '../../types';
import InputField from './InputField';
jest.mock('../../api');

const onChangeMock = jest.fn();

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
};

describe('InputField', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', () => {
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

  describe('calls checkAvailability', () => {
    it('value is available', async () => {
      mocked(API).checkAvailability.mockRejectedValue('');

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
      expect(input).toBeValid();
      await waitFor(() => {});
    });

    it('value is taken', async () => {
      mocked(API).checkAvailability.mockResolvedValue('');

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
      const input = screen.getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      expect(screen.getByText(defaultProps.invalidText.default)).toBeInTheDocument();
      input.blur();

      expect(API.checkAvailability).toBeCalledTimes(1);

      const invalidText = await waitFor(() => screen.getByText(defaultProps.invalidText.customError));
      expect(invalidText).toBeInTheDocument();
      expect(input).toBeInvalid();
    });
  });

  describe('calls isValidResource', () => {
    it('resource is valid', async () => {
      mocked(API).checkAvailability.mockRejectedValue('');

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
      expect(input).toBeValid();
      await waitFor(() => {});
    });

    it('resource is not valid', async () => {
      mocked(API).checkAvailability.mockRejectedValue('');

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
      const input = screen.getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      expect(screen.getByText(defaultProps.invalidText.default)).toBeInTheDocument();
      input.blur();

      expect(API.checkAvailability).toBeCalledTimes(1);

      const invalidText = await waitFor(() => screen.getByText(defaultProps.invalidText.customError));
      expect(invalidText).toBeInTheDocument();
      expect(input).toBeInvalid();
    });

    it('value is part of the excluded list', () => {
      mocked(API).checkAvailability.mockRejectedValue('');

      render(
        <InputField {...defaultProps} type="text" value="user1" validateOnBlur excludedValues={['user1']} autoFocus />
      );
      const input = screen.getByTestId(`${defaultProps.name}Input`) as HTMLInputElement;
      expect(screen.getByText(defaultProps.invalidText.default)).toBeInTheDocument();
      input.blur();

      const invalidText = screen.getByText(defaultProps.invalidText.excluded);
      expect(invalidText).toBeInTheDocument();
      expect(input).toBeInvalid();
    });
  });
});
