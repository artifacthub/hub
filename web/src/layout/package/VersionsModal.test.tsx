import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import VersionsModal from './VersionsModal';
import { Package } from '../../types';
import { BrowserRouter as Router } from 'react-router-dom';

const getMockPackage = (fixtureId: string): Package => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/VersionsModal/${fixtureId}.json`) as Package;
};

const defaultProps = {
  title: 'title',
  sortedVersions: [
    { version: '0.1.3', appVersion: '0.2.0', ts: 1, containsSecurityUpdates: true, prerelease: false },
    { version: '0.1.2', appVersion: '0.2.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
    { version: '0.1.1', appVersion: '0.1.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
    { version: '0.1.0', appVersion: '0.1.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
  ],
  channels: [],
};

describe('VersionsModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockPackage = getMockPackage('1');
    const { asFragment } = render(
      <Router>
        <VersionsModal package={mockPackage} {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('opens modal', async () => {
    const mockPackage = getMockPackage('1');
    render(
      <Router>
        <VersionsModal package={mockPackage} {...defaultProps} />
      </Router>
    );
    const btn = screen.getByRole('button', { name: 'See all entries' });
    expect(btn).toHaveTextContent('See all');

    await userEvent.click(btn);

    expect(await screen.findByRole('dialog')).toHaveClass('active d-block');

    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('renders correct table', async () => {
    const mockPackage = getMockPackage('1');
    render(
      <Router>
        <VersionsModal package={mockPackage} {...defaultProps} />
      </Router>
    );

    const btn = screen.getByRole('button', { name: 'See all entries' });
    expect(btn).toHaveTextContent('See all');

    await userEvent.click(btn);

    expect(await screen.findByRole('dialog')).toHaveClass('active d-block');

    expect(screen.getAllByTestId('tr-version-row')).toHaveLength(4);
    expect(screen.getAllByTestId('tr-version-row')[0]).toHaveTextContent('0.1.3');
    expect(screen.getAllByTestId('tr-version-row')[1]).toHaveTextContent('0.1.2');
    expect(screen.getAllByTestId('tr-version-row')[2]).toHaveTextContent('0.1.1');
    expect(screen.getAllByTestId('tr-version-row')[3]).toHaveTextContent('0.1.0');
  });

  it('closes modal', async () => {
    const mockPackage = getMockPackage('1');
    render(
      <Router>
        <VersionsModal package={mockPackage} {...defaultProps} />
      </Router>
    );
    const btn = screen.getByRole('button', { name: 'See all entries' });
    expect(btn).toHaveTextContent('See all');

    await userEvent.click(btn);

    expect(await screen.findByRole('dialog')).toHaveClass('active d-block');

    expect(screen.getByText('title')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Close' });
    expect(closeBtn).toBeInTheDocument();

    await userEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toHaveClass('active d-block');
  });

  it('change table ordenation', async () => {
    const mockPackage = getMockPackage('2');
    render(
      <Router>
        <VersionsModal
          package={mockPackage}
          {...defaultProps}
          sortedVersions={[
            { version: '0.1.3', appVersion: '0.2.0', ts: 1, containsSecurityUpdates: true, prerelease: false },
            { version: '0.1.2', appVersion: '0.1.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
            { version: '0.1.1', appVersion: '0.2.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
            { version: '0.1.0', appVersion: '0.1.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
          ]}
        />
      </Router>
    );
    const btn = screen.getByRole('button', { name: 'See all entries' });
    expect(btn).toHaveTextContent('See all');

    await userEvent.click(btn);

    expect(await screen.findByRole('dialog')).toHaveClass('active d-block');

    expect(screen.getByText('title')).toBeInTheDocument();

    const sortByAppVersionBtn = screen.getByRole('button', { name: 'Sort by app version' });
    expect(sortByAppVersionBtn).toBeInTheDocument();

    await userEvent.click(sortByAppVersionBtn);

    expect(await screen.getByTestId('sort-app-version-icon')).toHaveClass('visible');

    expect(screen.getAllByTestId('tr-version-row')).toHaveLength(4);
    expect(screen.getAllByTestId('tr-version-row')[0]).toHaveTextContent('0.1.3');
    expect(screen.getAllByTestId('tr-version-row')[1]).toHaveTextContent('0.1.1');
    expect(screen.getAllByTestId('tr-version-row')[2]).toHaveTextContent('0.1.2');
    expect(screen.getAllByTestId('tr-version-row')[3]).toHaveTextContent('0.1.0');
  });
});
