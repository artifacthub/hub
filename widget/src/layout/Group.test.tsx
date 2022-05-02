import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { mocked } from 'jest-mock';

import API from '../api';
import { SearchResults } from '../types';
import Group from './Group';
jest.mock('../api');

jest.mock('moment', () => ({
  ...(jest.requireActual('moment') as {}),
  unix: () => ({
    fromNow: () => '3 hours ago',
  }),
}));

const defaultProps = {
  url: 'https://localhost:8000/api/v1/packages/search',
  loading: true,
  theme: 'light',
  responsive: true,
  header: false,
  stars: true,
};

const getMockGroup = (fixtureId: string): SearchResults => {
  return require(`./__fixtures__/Group/${fixtureId}.json`) as SearchResults;
};

describe('Group', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockGroup = getMockGroup('1');
    mocked(API).searchPackages.mockResolvedValue(mockGroup);

    const { asFragment } = render(<Group {...defaultProps} />);
    await waitFor(() => {
      expect(API.searchPackages).toHaveBeenCalledTimes(1);
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('status'));
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders component', async () => {
    const mockGroup = getMockGroup('2');
    mocked(API).searchPackages.mockResolvedValue(mockGroup);

    render(<Group {...defaultProps} />);

    expect(screen.getByTestId('wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('wrapper')).toHaveStyle('--color-ah-primary: #417598');
    expect(screen.getByRole('status')).toBeInTheDocument();

    await waitFor(() => {
      expect(API.searchPackages).toHaveBeenCalledTimes(1);
      expect(API.searchPackages).toHaveBeenCalledWith('https://localhost:8000', '');
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('status'));
    expect(screen.getAllByTestId('cardWrapper')).toHaveLength(5);
  });

  it('renders component with fixedWidth', async () => {
    const mockGroup = getMockGroup('3');
    mocked(API).searchPackages.mockResolvedValue(mockGroup);

    render(<Group {...defaultProps} responsive={false} width="1800" />);

    await waitFor(() => {
      expect(API.searchPackages).toHaveBeenCalledTimes(1);
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('status'));
    const wrapper = screen.getByTestId('wrapper');
    expect(wrapper).toHaveClass('fixedWidth');
    expect(wrapper).toHaveStyle('width: 1800px');
  });

  it('renders component with custom color', async () => {
    const mockGroup = getMockGroup('4');
    mocked(API).searchPackages.mockResolvedValue(mockGroup);

    render(<Group {...defaultProps} color="#F57C00" />);

    await waitFor(() => {
      expect(API.searchPackages).toHaveBeenCalledTimes(1);
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('status'));
    expect(screen.getByTestId('wrapper')).toHaveStyle('--color-ah-primary: #F57C00');
  });

  it('renders component with dark theme', async () => {
    const mockGroup = getMockGroup('5');
    mocked(API).searchPackages.mockResolvedValue(mockGroup);

    render(<Group {...defaultProps} theme="dark" />);

    await waitFor(() => {
      expect(API.searchPackages).toHaveBeenCalledTimes(1);
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('status'));
    expect(screen.getByTestId('wrapper')).toHaveStyle('--color-ah-primary: #131216');
  });

  describe('does not render component', () => {
    it('when package list is empty', async () => {
      const mockGroup = getMockGroup('6');
      mocked(API).searchPackages.mockResolvedValue(mockGroup);

      const { container } = render(<Group {...defaultProps} />);

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      await waitForElementToBeRemoved(() => screen.queryByRole('status'));

      expect(container).toBeEmptyDOMElement();
    });

    it('when searchPackages call fails', async () => {
      mocked(API).searchPackages.mockRejectedValue(null);

      const { container } = render(<Group {...defaultProps} />);

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      await waitForElementToBeRemoved(() => screen.queryByRole('status'));

      expect(container).toBeEmptyDOMElement();
    });
  });
});
