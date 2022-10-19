import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';

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
    const { asFragment } = render(
      <Router>
        <TOCList {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders properly', () => {
      render(
        <Router>
          <TOCList {...defaultProps} />
        </Router>
      );

      expect(screen.getByText('Title 1')).toBeInTheDocument();
      expect(screen.getByText('Subtitle 1a')).toBeInTheDocument();
      expect(screen.getByText('Opt 1')).toBeInTheDocument();
      expect(screen.getByText('Opt 2')).toBeInTheDocument();
      expect(screen.getByText('Subtitle 1b')).toBeInTheDocument();
      expect(screen.getByText('Title 2')).toBeInTheDocument();
      expect(screen.getByText('Subtitle 2')).toBeInTheDocument();
    });
  });
});
