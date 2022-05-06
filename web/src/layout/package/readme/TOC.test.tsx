import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TOC from './TOC';
jest.mock('react-markdown', () => () => <div>Readme</div>);
jest.mock('remark-gfm', () => () => <div />);

const defaultProps = {
  title: 'Readme',
  toc: [
    {
      depth: 1,
      value: 'Title 1',
      children: [
        {
          depth: 2,
          value: 'Subtitle 1a',
          children: [
            {
              depth: 3,
              value: 'Opt 1',
              children: [],
            },
            {
              depth: 3,
              value: 'Opt 2',
              children: [],
            },
          ],
        },
        {
          depth: 2,
          value: 'Subtitle 1b',
        },
      ],
    },
    {
      depth: 1,
      value: 'Title 2',
      children: [
        {
          depth: 2,
          value: 'Subtitle 2',
          children: [],
        },
      ],
    },
  ],
  scrollIntoView: jest.fn(),
};

describe('TOC', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<TOC {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders properly', () => {
      render(<TOC {...defaultProps} />);

      expect(screen.getByText('Readme')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Table of contents/ })).toBeInTheDocument();
    });

    it('displays dropdown', async () => {
      render(<TOC {...defaultProps} />);

      const btn = screen.getByRole('button', { name: /Table of contents/ });
      await userEvent.click(btn);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('Title 1')).toBeInTheDocument();
      expect(screen.getByText('Subtitle 1a')).toBeInTheDocument();
      expect(screen.getByText('Opt 1')).toBeInTheDocument();
      expect(screen.getByText('Opt 2')).toBeInTheDocument();
      expect(screen.getByText('Subtitle 1b')).toBeInTheDocument();
      expect(screen.getByText('Title 2')).toBeInTheDocument();
      expect(screen.getByText('Subtitle 2')).toBeInTheDocument();
    });

    it('displays dropdown', async () => {
      render(<TOC {...defaultProps} />);

      const btn = screen.getByRole('button', { name: /Table of contents/ });
      await userEvent.click(btn);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await userEvent.click(btn);
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).toBeNull();
      });
    });

    it('renders support button', () => {
      render(<TOC {...defaultProps} supportLink="http://link.test" />);
      expect(screen.getByRole('button', { name: 'Open support link' })).toBeInTheDocument();
    });

    it('does not render component when list is empty', () => {
      const { container } = render(<TOC {...defaultProps} toc={[]} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
