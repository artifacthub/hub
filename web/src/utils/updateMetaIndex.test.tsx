import { render } from '@testing-library/react';

import updateMetaIndex from './updateMetaIndex';

interface Test {
  title?: string;
  description?: string;
}

const tests: Test[] = [
  {
    title: 'airflow 6.8.0 · helm/stable',
    description: 'Airflow is a platform to programmatically author, schedule and monitor workflows',
  },
  {
    title: 'trusted-registry-images 0.1.0 · falco',
    description: 'Open Policy Agent policy for running only images from a trusted repository',
  },
  {
    title: 'contour 0.3.2 · rimusz/rimusz',
    description: 'A Helm chart for Heptio Contour',
  },
  {
    title: 'snapscheduler 1.2.0 · backube/backube-helm-charts',
    description: 'An operator to take scheduled snapshots of Kubernetes persistent volumes',
  },
  {
    title: 'cassandra 0.15.0 · helm/incubator',
    description:
      'Apache Cassandra is a free and open-source distributed database management system designed to handle large amounts of data across many commodity servers, providing high availability with no single point of failure.',
  },
];

const placeholder = {
  title: 'Artifact Hub',
  description: 'Find, install and publish Cloud Native packages',
};

describe('updateMetaIndex', () => {
  it('renders default meta tags values', () => {
    const { container } = render(
      <>
        <title></title>
        <meta name="description" content="" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="" />
        <meta property="og:description" content="" />
        <meta property="og:image" content="{{ .baseURL }}/static/media/artifactHub_v2.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="" />
        <meta name="twitter:description" content="" />
        <meta name="twitter:image:src" content="{{ .baseURL }}/static/media/artifactHub_v2.png" />
      </>
    );

    updateMetaIndex();
    expect(container.querySelector(`meta[name='description']`)).toHaveAttribute('content', placeholder.description);
    expect(container.querySelector(`meta[property='og:description']`)).toHaveAttribute(
      'content',
      placeholder.description
    );
    expect(container.querySelector(`meta[name='twitter:description']`)).toHaveAttribute(
      'content',
      placeholder.description
    );
  });

  for (let i = 0; i < tests.length; i++) {
    it('returns proper object', () => {
      const { container } = render(
        <>
          <title></title>
          <meta name="description" content="" />
          <meta property="og:type" content="website" />
          <meta property="og:title" content="" />
          <meta property="og:description" content="" />
          <meta property="og:image" content="{{ .baseURL }}/static/media/artifactHub_v2.png" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="" />
          <meta name="twitter:description" content="" />
          <meta name="twitter:image:src" content="{{ .baseURL }}/static/media/artifactHub_v2.png" />
        </>
      );

      updateMetaIndex(tests[i].title, tests[i].description);
      expect(document.title).toBe(tests[i].title);
      expect(container.querySelector(`meta[property='og:title']`)).toHaveAttribute('content', tests[i].title);
      expect(container.querySelector(`meta[name='twitter:title']`)).toHaveAttribute('content', tests[i].title);
      expect(container.querySelector(`meta[name='description']`)).toHaveAttribute('content', tests[i].description);
      expect(container.querySelector(`meta[property='og:description']`)).toHaveAttribute(
        'content',
        tests[i].description
      );
      expect(container.querySelector(`meta[name='twitter:description']`)).toHaveAttribute(
        'content',
        tests[i].description
      );
    });
  }
});
