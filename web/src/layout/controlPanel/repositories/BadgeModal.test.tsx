import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { Repository } from '../../../types';
import BadgeModal from './BadgeModal';

const repoMock: Repository = {
  kind: 0,
  name: 'repoTest',
  displayName: 'Repo test',
  url: 'http://test.repo',
};

const defaultProps = {
  open: true,
  repository: repoMock,
  onClose: jest.fn(),
};

describe('Badge Modal - repositories section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<BadgeModal {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders markdown tab', () => {
      const { getByTestId, getByText, getByAltText, getAllByTestId, getAllByText } = render(
        <BadgeModal {...defaultProps} />
      );

      expect(getByText('Get badge')).toBeInTheDocument();
      expect(getAllByText('Markdown')).toHaveLength(2);
      expect(getByTestId('badgeModalContent')).toBeInTheDocument();
      expect(getAllByTestId('tabBtn')).toHaveLength(2);

      const badge = getByAltText('Artifact HUB badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveProperty(
        'src',
        `https://img.shields.io/endpoint?url=http://localhost/badge/repository/${repoMock.name}`
      );
      expect(
        getByText(
          `[![Artifact HUB](https://img.shields.io/endpoint?url=http://localhost/badge/repository/${repoMock.name})](http://localhost/packages/search?repo=${repoMock.name})`
        )
      ).toBeInTheDocument();
    });

    it('renders ascii tab', () => {
      const { getByText, getByAltText, getAllByTestId, getAllByText } = render(<BadgeModal {...defaultProps} />);

      expect(getAllByText('AsciiDoc')).toHaveLength(2);
      const btns = getAllByTestId('tabBtn');
      expect(btns[1]).toHaveTextContent('AsciiDoc');
      fireEvent.click(btns[1]);

      const badge = getByAltText('Artifact HUB badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveProperty(
        'src',
        `https://img.shields.io/endpoint?url=http://localhost/badge/repository/${repoMock.name}`
      );
      expect(
        getByText(
          `http://localhost/packages/search?repo=${repoMock.name}[image:https://img.shields.io/endpoint?url=http://localhost/badge/repository/${repoMock.name}[Artifact HUB]]`
        )
      ).toBeInTheDocument();
    });
  });
});
