import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SectionBtn from './SectionBtn';

const scrollIntoViewMock = jest.fn();
const onClickMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  title: 'Title',
  name: 'title',
  onClick: onClickMock,
};

describe('SectionBtn', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SectionBtn {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<SectionBtn {...defaultProps} />);

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to Title section' })).toBeInTheDocument();
    });

    it('clicks anchor', async () => {
      render(<SectionBtn {...defaultProps} />);

      const anchor = screen.getByRole('button', { name: 'Go to Title section' });
      expect(anchor).toBeInTheDocument();
      userEvent.click(anchor);

      await waitFor(() => {
        expect(onClickMock).toHaveBeenCalledTimes(1);
      });
    });

    it('scrolls to section', async () => {
      render(<SectionBtn {...defaultProps} visibleSection="title" />);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      });
    });

    it('renders right element', () => {
      render(<SectionBtn {...defaultProps} rightElement={<>element</>} />);

      expect(screen.getByText('element')).toBeInTheDocument();
    });
  });
});
