import { render } from '@testing-library/react';
import React from 'react';

import TOCList from './TOCList';

const defaultProps = {
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
          children: [],
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
  setVisibleTOC: jest.fn(),
  scrollIntoView: jest.fn(),
};

describe('TOCList', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<TOCList {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders properly', () => {
      const { getByText } = render(<TOCList {...defaultProps} />);

      expect(getByText('Title 1')).toBeInTheDocument();
      expect(getByText('Subtitle 1a')).toBeInTheDocument();
      expect(getByText('Opt 1')).toBeInTheDocument();
      expect(getByText('Opt 2')).toBeInTheDocument();
      expect(getByText('Subtitle 1b')).toBeInTheDocument();
      expect(getByText('Title 2')).toBeInTheDocument();
      expect(getByText('Subtitle 2')).toBeInTheDocument();
    });
  });
});
