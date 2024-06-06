import { render, screen } from '@testing-library/react';

import ReadmeWrapper from './index';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('react-markdown', () => (props: any) => {
  return <>{props.children}</>;
});
jest.mock('remark-gfm', () => () => <div />);
jest.mock('rehype-github-alerts', () => () => <div />);

const defaultProps = {
  packageName: 'package-name',
  markdownContent: 'test # Sample',
  scrollIntoView: jest.fn(),
  stopPkgLoading: jest.fn(),
};

describe('ReadmeWrapper', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<ReadmeWrapper {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders properly', () => {
      render(<ReadmeWrapper {...defaultProps} />);

      expect(screen.getByText(/package-name/)).toBeInTheDocument();
    });

    it('does not render image as title', () => {
      render(
        <ReadmeWrapper
          {...defaultProps}
          markdownContent='# ![HAProxy](https://github.com/haproxytech/kubernetes-ingress/raw/master/assets/images/haproxy-weblogo-210x49.png "HAProxy")\n\n## HAProxy Helm Chart'
        />
      );

      expect(screen.getByText('package-name')).toBeInTheDocument();
    });

    it('renders provided Readme title as title and not use package name', () => {
      render(<ReadmeWrapper {...defaultProps} markdownContent="# title" />);

      expect(screen.queryByText(/package-name/)).toBeNull();
      expect(screen.getByText(/title/)).toBeInTheDocument();
    });
  });
});
