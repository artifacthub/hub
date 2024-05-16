import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import SectionPanel from './SectionPanel';

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

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
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <SectionPanel {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(
      <Router>
        <SectionPanel {...defaultProps} />
      </Router>
    );

    const btns = screen.getAllByRole('button', { name: /Go to section/ });

    expect(btns).toHaveLength(3);
    expect(btns[0]).toHaveTextContent(defaultProps.sections[0].displayName);
    expect(btns[1]).toHaveTextContent(defaultProps.sections[1].displayName);
    expect(btns[2]).toHaveTextContent(defaultProps.sections[2].displayName);
    expect(btns[2]).toBeDisabled();

    expect(screen.getByText('Content 0')).toBeInTheDocument();
  });

  it('changes active section', async () => {
    render(
      <Router>
        <SectionPanel {...defaultProps} />
      </Router>
    );

    const btns = screen.getAllByRole('button', { name: /Go to section/ });
    await userEvent.click(btns[1]);

    expect(mockUseNavigate).toHaveBeenCalledTimes(1);
    expect(mockUseNavigate).toHaveBeenCalledWith('/opt1');
  });

  it('renders with a different default section', () => {
    render(
      <Router>
        <SectionPanel {...defaultProps} defaultSection="opt2" />
      </Router>
    );

    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('renders with active section', () => {
    render(
      <Router>
        <SectionPanel {...defaultProps} defaultSection="opt0" activeSection="opt1" />
      </Router>
    );

    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });
});
