import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { mocked } from 'jest-mock';

import API from '../api';
import { PackageSummary } from '../types';
import Widget from './Widget';
jest.mock('../api');

jest.mock('moment', () => ({
  ...(jest.requireActual('moment') as {}),
  unix: () => ({
    fromNow: () => '3 hours ago',
  }),
}));

const defaultProps = {
  url: 'https://localhost:8000/packages/helm/artifact-hub/artifact-hub',
  theme: 'light',
  responsive: false,
  header: true,
  inGroup: false,
  stars: true,
};

const getMockPkg = (fixtureId: string): PackageSummary => {
  return require(`./__fixtures__/Widget/${fixtureId}.json`) as PackageSummary;
};

describe('Widget', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockPkg = getMockPkg('1');
    mocked(API).getPackageInfo.mockResolvedValue(mockPkg);

    const { asFragment } = render(<Widget {...defaultProps} />);
    await waitFor(() => {
      expect(API.getPackageInfo).toHaveBeenCalledTimes(1);
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('status'));
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders component', async () => {
    const mockPkg = getMockPkg('2');
    mocked(API).getPackageInfo.mockResolvedValue(mockPkg);

    render(<Widget {...defaultProps} />);

    await waitFor(() => {
      expect(API.getPackageInfo).toHaveBeenCalledTimes(1);
      expect(API.getPackageInfo).toHaveBeenCalledWith(
        'https://localhost:8000',
        '/packages/helm/artifact-hub/artifact-hub'
      );
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('status'));

    const mainWrapper = screen.getByTestId('mainWrapper');
    expect(mainWrapper).toBeInTheDocument();
    expect(mainWrapper).toHaveStyle('--color-ah-primary: #417598');

    expect(await screen.findByText('artifact-hub')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Artifact Hub is a web-based application that enables finding, installing, and publishing Kubernetes packages.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTitle('logo')).toBeInTheDocument();
    expect(screen.getAllByText(/Artifact Hub/)).toHaveLength(2);
    expect(screen.getByText('26')).toBeInTheDocument();
    expect(screen.getByText(/Published by/)).toBeInTheDocument();
    expect(screen.getByText(/Version/)).toBeInTheDocument();
    expect(screen.getByText('0.20.0')).toBeInTheDocument();
    expect(screen.getByTitle('logo')).toBeInTheDocument();
    expect(screen.getByTitle('helm')).toBeInTheDocument();
    expect(screen.getByText('Helm chart')).toBeInTheDocument();
    expect(screen.getByTitle('official')).toBeInTheDocument();
    expect(screen.getByTitle('verified')).toBeInTheDocument();
    expect(screen.getByText('Updated 3 hours ago')).toBeInTheDocument();

    const image = screen.getByAltText('Logo artifact-hub');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/image/3cfb161e-2652-43b9-ada1-c1ced4b20111');
    expect(image).toHaveProperty(
      'srcset',
      'https://localhost:8000/image/3cfb161e-2652-43b9-ada1-c1ced4b20111@1x 1x, https://localhost:8000/image/3cfb161e-2652-43b9-ada1-c1ced4b20111@2x 2x, https://localhost:8000/image/3cfb161e-2652-43b9-ada1-c1ced4b20111@3x 3x, https://localhost:8000/image/3cfb161e-2652-43b9-ada1-c1ced4b20111@4x 4x'
    );
  });

  it('does not render header', async () => {
    const mockPkg = getMockPkg('3');
    mocked(API).getPackageInfo.mockResolvedValue(mockPkg);

    render(<Widget {...defaultProps} header={false} />);

    await waitFor(() => {
      expect(API.getPackageInfo).toHaveBeenCalledTimes(1);
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('status'));
    expect(screen.queryByTitle('logo')).toBeNull();
  });

  it('does not render stars', async () => {
    const mockPkg = getMockPkg('12');
    mocked(API).getPackageInfo.mockResolvedValue(mockPkg);

    render(<Widget {...defaultProps} stars={false} />);

    await waitFor(() => {
      expect(API.getPackageInfo).toHaveBeenCalledTimes(1);
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('status'));
    expect(screen.queryByText('13')).toBeNull();
  });

  it('renders responsive card', async () => {
    const mockPkg = getMockPkg('4');
    mocked(API).getPackageInfo.mockResolvedValue(mockPkg);

    render(<Widget {...defaultProps} responsive={true} />);

    await waitFor(() => {
      expect(API.getPackageInfo).toHaveBeenCalledTimes(1);
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('status'));
    const wrapper = screen.getByTestId('cardWrapper');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass('responsive');
  });

  it('does not call to getPackageInfo when packageSummary is defined', () => {
    const mockPkg = getMockPkg('5');

    render(<Widget {...defaultProps} packageSummary={mockPkg} />);

    waitFor(() => {
      expect(API.getPackageInfo).toHaveBeenCalledTimes(0);
    });

    expect(screen.getByText('artifact-hub')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Artifact Hub is a web-based application that enables finding, installing, and publishing Kubernetes packages.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTitle('logo')).toBeInTheDocument();
    expect(screen.getAllByText(/Artifact Hub/)).toHaveLength(2);
    expect(screen.getByText('26')).toBeInTheDocument();
    expect(screen.getByText(/Published by/)).toBeInTheDocument();
    expect(screen.getByText(/Version/)).toBeInTheDocument();
    expect(screen.getByText('0.20.0')).toBeInTheDocument();
    expect(screen.getByTitle('logo')).toBeInTheDocument();
    expect(screen.getByTitle('helm')).toBeInTheDocument();
    expect(screen.getByText('Helm chart')).toBeInTheDocument();
    expect(screen.getByTitle('official')).toBeInTheDocument();
    expect(screen.getByTitle('verified')).toBeInTheDocument();
    expect(screen.getByText('Updated 3 hours ago')).toBeInTheDocument();

    const image = screen.getByAltText('Logo artifact-hub');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/image/3cfb161e-2652-43b9-ada1-c1ced4b20111');
    expect(image).toHaveProperty(
      'srcset',
      'https://localhost:8000/image/3cfb161e-2652-43b9-ada1-c1ced4b20111@1x 1x, https://localhost:8000/image/3cfb161e-2652-43b9-ada1-c1ced4b20111@2x 2x, https://localhost:8000/image/3cfb161e-2652-43b9-ada1-c1ced4b20111@3x 3x, https://localhost:8000/image/3cfb161e-2652-43b9-ada1-c1ced4b20111@4x 4x'
    );
  });

  it('renders custom color', async () => {
    const mockPkg = getMockPkg('5');
    mocked(API).getPackageInfo.mockResolvedValue(mockPkg);

    render(<Widget {...defaultProps} color="#F57C00" />);

    await waitFor(() => {
      expect(API.getPackageInfo).toHaveBeenCalledTimes(1);
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('status'));
    const mainWrapper = screen.getByTestId('mainWrapper');
    expect(mainWrapper).toBeInTheDocument();
    expect(mainWrapper).toHaveStyle('--color-ah-primary: inherit');

    const cardWrapper = screen.getByTestId('cardWrapper');
    expect(cardWrapper).toHaveStyle('border: 3px solid var(--color-ah-primary)');
  });

  it('renders dark theme', async () => {
    const mockPkg = getMockPkg('6');
    mocked(API).getPackageInfo.mockResolvedValue(mockPkg);

    render(<Widget {...defaultProps} theme="dark" />);

    await waitFor(() => {
      expect(API.getPackageInfo).toHaveBeenCalledTimes(1);
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('status'));
    const mainWrapper = screen.getByTestId('mainWrapper');
    expect(mainWrapper).toBeInTheDocument();
    expect(mainWrapper).toHaveStyle('--color-ah-primary: #131216');
  });

  it('renders a big stars number', async () => {
    const mockPkg = getMockPkg('7');
    mocked(API).getPackageInfo.mockResolvedValue(mockPkg);

    render(<Widget {...defaultProps} />);

    await waitFor(() => {
      expect(API.getPackageInfo).toHaveBeenCalledTimes(1);
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('status'));
    expect(screen.getByText('2.69k')).toBeInTheDocument();
  });

  it('renders inGroup card without badges', async () => {
    const mockPkg = getMockPkg('8');
    mocked(API).getPackageInfo.mockResolvedValue(mockPkg);

    render(<Widget {...defaultProps} withBadges={false} inGroup={true} />);

    await waitFor(() => {
      expect(API.getPackageInfo).toHaveBeenCalledTimes(1);
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('status'));
    const cardBody = screen.getByTestId('cardBody');
    expect(cardBody).toBeInTheDocument();
    expect(cardBody).toHaveClass('groupedItem');
    expect(cardBody).toHaveStyle('height: 225px');
  });

  it('renders inGroup card with badges', async () => {
    const mockPkg = getMockPkg('9');
    mocked(API).getPackageInfo.mockResolvedValue(mockPkg);

    render(<Widget {...defaultProps} withBadges={true} inGroup={true} />);

    await waitFor(() => {
      expect(API.getPackageInfo).toHaveBeenCalledTimes(1);
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('status'));
    const cardBody = screen.getByTestId('cardBody');
    expect(cardBody).toBeInTheDocument();
    expect(cardBody).toHaveClass('groupedItem');
    expect(cardBody).toHaveStyle('height: 255px');
  });

  describe('renders different pkg cards', () => {
    it('renders helm-plugin', () => {
      const mockPkg = getMockPkg('10');

      render(<Widget {...defaultProps} packageSummary={mockPkg} />);

      expect(screen.getByText('Helm plugin')).toBeInTheDocument();
    });

    it('renders OLM operator', () => {
      const mockPkg = getMockPkg('11');

      render(<Widget {...defaultProps} packageSummary={mockPkg} />);

      expect(screen.getByText('OLM operator')).toBeInTheDocument();
    });
  });

  it('renders inGroup card with badges', async () => {
    const mockPkg = getMockPkg('9');
    mocked(API).getPackageInfo.mockResolvedValue(mockPkg);

    render(<Widget {...defaultProps} withBadges={true} inGroup={true} />);

    await waitFor(() => {
      expect(API.getPackageInfo).toHaveBeenCalledTimes(1);
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('status'));
    const cardBody = screen.getByTestId('cardBody');
    expect(cardBody).toBeInTheDocument();
    expect(cardBody).toHaveClass('groupedItem');
    expect(cardBody).toHaveStyle('height: 255px');
  });

  describe('does not render component', () => {
    it('when packageSummary and url are undefined', () => {
      const { container } = render(<Widget {...defaultProps} url={undefined} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('when error to getPackageInfo', async () => {
      mocked(API).getPackageInfo.mockRejectedValue(null);

      const { container } = render(<Widget {...defaultProps} />);

      await waitFor(() => {
        expect(API.getPackageInfo).toHaveBeenCalledTimes(1);
      });

      await waitForElementToBeRemoved(() => screen.queryByRole('status'));
      await waitFor(() => {
        expect(container).toBeEmptyDOMElement();
      });
    });
  });
});
