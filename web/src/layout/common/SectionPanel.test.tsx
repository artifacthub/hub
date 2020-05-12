import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import SectionPanel from './SectionPanel';

const defaultProps = {
  sections: [
    { index: 0, name: 'Details 0', shortName: 'details_0', disabled: false },
    { index: 1, name: 'Details 1', shortName: 'details_1', disabled: false },
    { index: 2, name: 'Details 2', shortName: 'details_2', disabled: true },
  ],
  content: {
    0: <>Content 0</>,
    1: <>Content 1</>,
    2: <>Content 2</>,
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
    expect(btns[0]).toHaveTextContent(defaultProps.sections[0].name);
    expect(btns[1]).toHaveTextContent(defaultProps.sections[1].name);
    expect(btns[2]).toHaveTextContent(defaultProps.sections[2].name);
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
    const { getByText } = render(<SectionPanel {...defaultProps} defaultSection={2} />);

    expect(getByText('Content 2')).toBeInTheDocument();
  });
});
