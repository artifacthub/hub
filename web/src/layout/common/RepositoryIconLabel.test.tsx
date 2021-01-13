import { render } from '@testing-library/react';
import React from 'react';

import { RepositoryKind } from '../../types';
import RepositoryIconLabel from './RepositoryIconLabel';

describe('RepositoryIconLabel', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<RepositoryIconLabel kind={RepositoryKind.Helm} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByText, getAllByAltText } = render(<RepositoryIconLabel kind={RepositoryKind.Helm} />);
    expect(getByText('Helm chart')).toBeInTheDocument();

    const icons = getAllByAltText('Icon');
    expect(icons).toHaveLength(2);
    expect(icons[0]).toHaveProperty('src', 'http://localhost/static/media/helm-chart.svg');
    expect(icons[0]).toHaveClass('iconLight');
    expect(icons[1]).toHaveProperty('src', 'http://localhost/static/media/helm-chart-light.svg');
    expect(icons[1]).toHaveClass('iconDark');
  });

  it('renders proper content with isPlural', () => {
    const { getByText } = render(<RepositoryIconLabel kind={RepositoryKind.Helm} isPlural />);
    expect(getByText('Helm charts')).toBeInTheDocument();
  });
});
