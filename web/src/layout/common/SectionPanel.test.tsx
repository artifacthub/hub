import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import SectionPanel from './SectionPanel';

const defaultProps = {
  sections: [
    { name: 'opt0', displayName: 'Details 0', shortName: 'details_0', disabled: false },
    { name: 'opt1', displayName: 'Details 1', shortName: 'details_1', disabled: false },
    { name: 'opt2', displayName: 'Details 2', shortName: 'details_2', disabled: true },
  ],
  defaultSection: 'opt0',
  content: {
    opt0: <>Content 0</>,
    opt1: <>Content 1</>,
    opt2: <>Content 2</>,
  },
};

describe('SectionPanel', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<SectionPanel {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getAllByTestId, getByText } = render(<SectionPanel {...defaultProps} />);

    const btns = getAllByTestId('sectionBtn');

    expect(btns).toHaveLength(3);
    expect(btns[0]).toHaveTextContent(defaultProps.sections[0].displayName);
    expect(btns[1]).toHaveTextContent(defaultProps.sections[1].displayName);
    expect(btns[2]).toHaveTextContent(defaultProps.sections[2].displayName);
    expect(btns[2]).toBeDisabled();

    expect(getByText('Content 0')).toBeInTheDocument();
  });

  it('changes active section', () => {
    const { getAllByTestId, getByText } = render(<SectionPanel {...defaultProps} />);

    const btns = getAllByTestId('sectionBtn');
    fireEvent.click(btns[1]);

    expect(getByText('Content 1')).toBeInTheDocument();
  });

  it('renders with active section', () => {
    const { getByText } = render(<SectionPanel {...defaultProps} defaultSection="opt2" />);

    expect(getByText('Content 2')).toBeInTheDocument();
  });
});
