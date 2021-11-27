import { render, screen } from '@testing-library/react';

import RSSLinkTitle from './RSSLinkTitle';

const defaultProps = {
  packageId: 'id',
  normalizedName: 'test',
  version: '1.0',
  repository: {
    repositoryId: '0acb228c-17ab-4e50-85e9-ffc7102ea423',
    kind: 0,
    name: 'stable',
    url: 'repoUrl',
    userAlias: 'user',
  },
  title: 'Title',
};

describe('RSSLinkTitle', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<RSSLinkTitle {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<RSSLinkTitle {...defaultProps} />);
    expect(screen.getByText(defaultProps.title)).toBeInTheDocument();
    expect(screen.getByText('RSS')).toBeInTheDocument();
    const link = screen.getByRole('button');
    expect(link).toBeInTheDocument();
    expect(link).toHaveProperty('href', 'http://localhost/api/v1/packages/helm/stable/test/feed/rss');
  });
});
