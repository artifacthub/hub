import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import TsQuery from './TsQuery';

const onChangeMock = jest.fn();

const defaultProps = {
  active: [],
  onChange: onChangeMock,
};

describe('TsQuery', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<TsQuery {...defaultProps} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getAllByTestId, getByText } = render(<TsQuery {...defaultProps} />);

      expect(getByText('Category')).toBeInTheDocument();
      expect(getAllByTestId('checkbox')).toHaveLength(10);
    });

    it('renders with some checked options', () => {
      const props = {
        ...defaultProps,
        active: ['database', 'monitoring'],
      };
      const { getAllByTestId, getByLabelText } = render(<TsQuery {...props} />);

      const checkboxes = getAllByTestId('checkbox');
      expect(checkboxes).toHaveLength(10);
      expect(getByLabelText('Database')).toBeInTheDocument();
      expect(checkboxes[0]).toBeChecked();
      expect(getByLabelText('Integration and Delivery')).toBeInTheDocument();
      expect(checkboxes[1]).not.toBeChecked();
      expect(getByLabelText('Logging and Tracing')).toBeInTheDocument();
      expect(checkboxes[2]).not.toBeChecked();
      expect(getByLabelText('Machine learning')).toBeInTheDocument();
      expect(checkboxes[3]).not.toBeChecked();
      expect(getByLabelText('Monitoring')).toBeInTheDocument();
      expect(checkboxes[4]).toBeChecked();
      expect(getByLabelText('Networking')).toBeInTheDocument();
      expect(checkboxes[5]).not.toBeChecked();
      expect(getByLabelText('Security')).toBeInTheDocument();
      expect(checkboxes[6]).not.toBeChecked();
      expect(getByLabelText('Storage')).toBeInTheDocument();
      expect(checkboxes[7]).not.toBeChecked();
      expect(getByLabelText('Streaming and Messaging')).toBeInTheDocument();
      expect(checkboxes[8]).not.toBeChecked();
      expect(getByLabelText('Web applications')).toBeInTheDocument();
      expect(checkboxes[9]).not.toBeChecked();
    });

    it('calls on change event', () => {
      const { getByLabelText } = render(<TsQuery {...defaultProps} />);
      const opt1 = getByLabelText('Database');
      fireEvent.click(opt1);
      expect(onChangeMock).toHaveBeenCalledTimes(1);
    });
  });
});
