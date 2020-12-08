import { render } from '@testing-library/react';
import React from 'react';

import InputTypeaheadOptionItem from './InputTypeaheadOptionItem';

const defaultProps = {
  opt: {
    id: 'opt11',
    name: 'Option 1',
    total: 19,
    filterKey: 'key2',
    icon: <>icon</>,
  },
  name: 'Option 1',
  iconClassName: 'iconClass',
};

describe('InputTypeaheadOptionItem', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<InputTypeaheadOptionItem {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper component', () => {
    const { getByText } = render(<InputTypeaheadOptionItem {...defaultProps} />);

    expect(getByText('Option 1')).toBeInTheDocument();
    expect(getByText('(19)')).toBeInTheDocument();
    expect(getByText('icon')).toBeInTheDocument();
    expect(getByText('icon')).toHaveClass('iconClass');
  });
});
