import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import AnchorHeader from './AnchorHeader';

interface Test {
  title: string;
  id: string;
}

const tests: Test[] = [
  { title: 'Title', id: 'title' },
  { title: 'Unexpected spawned process', id: 'unexpected-spawned-process' },
  { title: 'Configure TLS', id: 'configure-tls' },
  { title: 'TL;DR;', id: 'tl-dr' },
  { title: 'Git-Sync sidecar container', id: 'git-sync-sidecar-container' },
  { title: 'Init-container git connection ssh', id: 'init-container-git-connection-ssh' },
  { title: 'To 2.8.3+', id: 'to-2-8-3' },
  {
    title: "Let's Encrypt domain verification using DNS challenge",
    id: 'let-s-encrypt-domain-verification-using-dns-challenge',
  },
  { title: 'Example: AWS Route 53', id: 'example-aws-route-53' },
  { title: 'FAQs', id: 'faqs' },
];

const scrollIntoViewMock = jest.fn();

const defaultProps = {
  level: 2,
  title: 'Header',
  scrollIntoView: scrollIntoViewMock,
};

describe('AnchorHeader', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<AnchorHeader {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders header properly', () => {
    const { getByText } = render(<AnchorHeader {...defaultProps} />);
    const header = getByText(/Header/i);
    expect(header).toBeInTheDocument();
    expect(header.tagName).toBe('H2');
  });

  it('calls scroll into view', () => {
    const { getByTestId } = render(<AnchorHeader {...defaultProps} />);
    const link = getByTestId('anchorHeaderLink');
    expect(link).toBeInTheDocument();
    fireEvent.click(link);
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
  });

  for (let i = 0; i < tests.length; i++) {
    it('renders proper id and href from title', () => {
      const { getByTestId, getByText } = render(<AnchorHeader {...defaultProps} title={tests[i].title} />);
      expect(getByText(new RegExp(tests[i].title, 'i'))).toBeInTheDocument();
      const link = getByTestId('anchorHeaderLink');
      expect(link).toHaveProperty('href', `http://localhost/#${tests[i].id}`);
      const anchor = getByTestId('anchor');
      expect(anchor).toHaveProperty('id', tests[i].id);
    });
  }
});
