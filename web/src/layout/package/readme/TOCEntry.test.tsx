import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import TOCEntry from './TOCEntry';

const setVisibleTOCMock = jest.fn();
const scrollIntoViewMock = jest.fn();

const defaultProps = {
  entry: {
    title: 'Installing the Chart',
    level: 1,
    link: 'installing-the-chart',
  },
  level: 1,
  setVisibleTOC: setVisibleTOCMock,
  scrollIntoView: scrollIntoViewMock,
};

describe('TOCEntry', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<TOCEntry {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders properly', () => {
      const { getByText } = render(<TOCEntry {...defaultProps} />);

      const link = getByText('Installing the Chart');
      expect(link).toBeInTheDocument();
      expect(link).toHaveClass('level1');
      expect(link).toHaveProperty('href', 'http://localhost/#installing-the-chart');
    });

    it('clicks link', () => {
      const { getByText } = render(<TOCEntry {...defaultProps} />);

      const link = getByText('Installing the Chart');
      fireEvent.click(link);

      expect(setVisibleTOCMock).toHaveBeenCalledTimes(1);
      expect(setVisibleTOCMock).toHaveBeenCalledWith(false);
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      expect(scrollIntoViewMock).toHaveBeenCalledWith('#installing-the-chart');
    });
  });
});
