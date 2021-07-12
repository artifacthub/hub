import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import TOC from './TOC';

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
    const result = render(<TOC {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders properly', () => {
      const { getByText, getByTestId } = render(<TOC {...defaultProps} />);

      expect(getByText('Readme')).toBeInTheDocument();
      expect(getByTestId('btnTOC')).toBeInTheDocument();
    });

    it('displays dropdown', () => {
      const { getByText, getByTestId } = render(<TOC {...defaultProps} />);

      const btn = getByTestId('btnTOC');
      fireEvent.click(btn);

      expect(getByTestId('dropdownTOC')).toBeInTheDocument();
      expect(getByText('Title 1')).toBeInTheDocument();
      expect(getByText('Subtitle 1a')).toBeInTheDocument();
      expect(getByText('Opt 1')).toBeInTheDocument();
      expect(getByText('Opt 2')).toBeInTheDocument();
      expect(getByText('Subtitle 1b')).toBeInTheDocument();
      expect(getByText('Title 2')).toBeInTheDocument();
      expect(getByText('Subtitle 2')).toBeInTheDocument();
    });

    it('displays dropdown', () => {
      const { queryByTestId, getByTestId } = render(<TOC {...defaultProps} />);

      const btn = getByTestId('btnTOC');
      fireEvent.click(btn);
      expect(getByTestId('dropdownTOC')).toBeInTheDocument();

      fireEvent.click(btn);
      expect(queryByTestId('dropdownTOC')).toBeNull();
    });

    it('does not render component when list is empty', () => {
      const { container } = render(<TOC {...defaultProps} toc={[]} />);

      expect(container).toBeEmptyDOMElement();
    });
  });
});
