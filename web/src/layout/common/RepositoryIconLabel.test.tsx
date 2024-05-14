import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RepositoryKind } from '../../types';
import { prepareQueryString } from '../../utils/prepareQueryString';
import RepositoryIconLabel from './RepositoryIconLabel';

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

describe('RepositoryIconLabel', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<RepositoryIconLabel kind={RepositoryKind.Helm} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<RepositoryIconLabel kind={RepositoryKind.Helm} />);
    expect(screen.getAllByText('Helm chart')).toHaveLength(2);

    const icons = screen.getAllByAltText('Icon');
    expect(icons).toHaveLength(4);
    expect(icons[0]).toHaveProperty('src', 'http://localhost/static/media/helm-chart.svg');
    expect(icons[0]).toHaveClass('iconLight');
    expect(icons[1]).toHaveProperty('src', 'http://localhost/static/media/helm-chart-light.svg');
    expect(icons[1]).toHaveClass('iconDark');
  });

  it('renders proper content with isPlural', () => {
    render(<RepositoryIconLabel kind={RepositoryKind.Helm} isPlural />);
    expect(screen.getAllByText('Helm charts')).toHaveLength(2);
  });

  it('renders button', async () => {
    render(<RepositoryIconLabel kind={RepositoryKind.Helm} clickable />);
    const btn = screen.getByTestId('repoIconLabelLink');
    expect(btn).toBeInTheDocument();

    await userEvent.click(btn);
    expect(mockUseNavigate).toHaveBeenCalledTimes(1);
    expect(mockUseNavigate).toHaveBeenCalledWith({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: 1,
        filters: {
          kind: ['0'],
        },
      }),
    });
  });
});
