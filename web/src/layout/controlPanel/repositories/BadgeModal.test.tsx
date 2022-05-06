import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
    const { asFragment } = render(<BadgeModal {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders markdown tab', () => {
      render(<BadgeModal {...defaultProps} />);

      expect(screen.getByText('Get badge')).toBeInTheDocument();
      expect(screen.getAllByText('Markdown')).toHaveLength(2);
      expect(screen.getByTestId('badgeModalContent')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Open tab/ })).toHaveLength(2);

      const badge = screen.getByAltText('Artifact HUB badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveProperty(
        'src',
        `https://img.shields.io/endpoint?url=http://localhost/badge/repository/${repoMock.name}`
      );
      expect(
        screen.getByText(
          `[![null](https://img.shields.io/endpoint?url=http://localhost/badge/repository/${repoMock.name})](http://localhost/packages/search?repo=${repoMock.name})`
        )
      ).toBeInTheDocument();
    });

    it('renders ascii tab', async () => {
      render(<BadgeModal {...defaultProps} />);

      expect(screen.getAllByText('AsciiDoc')).toHaveLength(2);
      const btns = screen.getAllByRole('button', { name: /Open tab/ });
      expect(btns[1]).toHaveTextContent('AsciiDoc');
      await userEvent.click(btns[1]);

      const badge = await screen.findByAltText('Artifact HUB badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveProperty(
        'src',
        `https://img.shields.io/endpoint?url=http://localhost/badge/repository/${repoMock.name}`
      );
      expect(
        screen.getByText(
          `http://localhost/packages/search?repo=${repoMock.name}[image:https://img.shields.io/endpoint?url=http://localhost/badge/repository/${repoMock.name}[null]]`
        )
      ).toBeInTheDocument();
    });
  });
});
