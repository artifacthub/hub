import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Checkbox from './Checkbox';

const onChangeMock = jest.fn();

const defaultProps = {
  name: 'checkbox',
  value: 'val',
  label: 'label',
  checked: false,
  onChange: onChangeMock,
  device: 'all',
};

describe('Checkbox', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<Checkbox {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders input and label', () => {
    render(<Checkbox {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
    expect(screen.getByLabelText(defaultProps.label)).toBeInTheDocument();
  });

  it('renders checked input with legend', () => {
    const props = {
      ...defaultProps,
      legend: 1,
      checked: true,
    };
    render(<Checkbox {...props} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
    const label = screen.getByTestId('checkboxLabel');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent(`${props.label}(${props.legend})`);
  });

  it('calls onChange to click checkbox label', async () => {
    render(<Checkbox {...defaultProps} />);
    await userEvent.click(screen.getByTestId('checkboxLabel'));
    expect(onChangeMock).toHaveBeenCalledTimes(1);
  });
});
