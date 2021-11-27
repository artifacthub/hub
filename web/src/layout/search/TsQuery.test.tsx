import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TsQuery from './TsQuery';

const onChangeMock = jest.fn();

const defaultProps = {
  active: [],
  device: 'desktop',
  onChange: onChangeMock,
};

describe('TsQuery', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<TsQuery {...defaultProps} />);

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<TsQuery {...defaultProps} />);

      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getAllByRole('checkbox')).toHaveLength(10);
    });

    it('renders with some checked options', () => {
      const props = {
        ...defaultProps,
        active: ['database', 'monitoring'],
      };
      render(<TsQuery {...props} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(10);
      expect(screen.getByLabelText('Database')).toBeInTheDocument();
      expect(checkboxes[0]).toBeChecked();
      expect(screen.getByLabelText('Integration and Delivery')).toBeInTheDocument();
      expect(checkboxes[1]).not.toBeChecked();
      expect(screen.getByLabelText('Logging and Tracing')).toBeInTheDocument();
      expect(checkboxes[2]).not.toBeChecked();
      expect(screen.getByLabelText('Machine learning')).toBeInTheDocument();
      expect(checkboxes[3]).not.toBeChecked();
      expect(screen.getByLabelText('Monitoring')).toBeInTheDocument();
      expect(checkboxes[4]).toBeChecked();
      expect(screen.getByLabelText('Networking')).toBeInTheDocument();
      expect(checkboxes[5]).not.toBeChecked();
      expect(screen.getByLabelText('Security')).toBeInTheDocument();
      expect(checkboxes[6]).not.toBeChecked();
      expect(screen.getByLabelText('Storage')).toBeInTheDocument();
      expect(checkboxes[7]).not.toBeChecked();
      expect(screen.getByLabelText('Streaming and Messaging')).toBeInTheDocument();
      expect(checkboxes[8]).not.toBeChecked();
      expect(screen.getByLabelText('Web applications')).toBeInTheDocument();
      expect(checkboxes[9]).not.toBeChecked();
    });

    it('calls on change event', () => {
      render(<TsQuery {...defaultProps} />);
      const opt1 = screen.getByLabelText('Database');
      userEvent.click(opt1);
      expect(onChangeMock).toHaveBeenCalledTimes(1);
    });
  });
});
