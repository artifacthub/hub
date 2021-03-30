import { render } from '@testing-library/react';
import React from 'react';

import TOCList from './TOCList';

const defaultProps = {
  toc: [
    {
      level: 1,
      link: 'title-1',
      title: 'Title 1',
      children: [
        {
          level: 2,
          link: 'subtitle-1a',
          title: 'Subtitle 1a',
          children: [
            {
              level: 3,
              link: 'opt-1',
              title: 'Opt 1',
            },
            {
              level: 3,
              link: 'opt-2',
              title: 'Opt 2',
            },
          ],
        },
        {
          level: 2,
          link: 'subtitle-1b',
          title: 'Subtitle 1b',
        },
      ],
    },
    {
      level: 1,
      link: 'title-2',
      title: 'Title 2',
      children: [
        {
          level: 2,
          link: 'subtitle-2',
          title: 'Subtitle 2',
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
