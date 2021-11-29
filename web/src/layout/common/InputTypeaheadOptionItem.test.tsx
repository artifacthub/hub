import { render, screen } from '@testing-library/react';

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
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper component', () => {
    render(<InputTypeaheadOptionItem {...defaultProps} />);

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('(19)')).toBeInTheDocument();
    expect(screen.getByText('icon')).toBeInTheDocument();
    expect(screen.getByText('icon')).toHaveClass('iconClass');
  });
});
