import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import { RepositoryKind, Signature } from '../../types';
import SignKeyInfo from './SignKeyInfo';

const defaultProps = {
  signed: true,
  signKey: {
    fingerprint: '0011223344',
    url: 'https://key.url',
  },
  repoKind: RepositoryKind.Helm,
  visibleKeyInfo: false,
};

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
  useLocation: () => ({
    pathname: 'test',
    state: null,
  }),
}));

describe('SignKeyInfo', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <SignKeyInfo {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <SignKeyInfo {...defaultProps} />
        </Router>
      );
      expect(screen.getByText('View key info')).toBeInTheDocument();
    });

    it('opens modal', async () => {
      render(
        <Router>
          <SignKeyInfo {...defaultProps} />
        </Router>
      );

      const btn = screen.getByText('View key info');
      await userEvent.click(btn);

      expect(mockUseNavigate).toHaveBeenCalledTimes(1);
      expect(mockUseNavigate).toHaveBeenCalledWith('?modal=key-info', { replace: true, state: null });

      expect(screen.getByText('Sign key information'));
      expect(screen.getByText('Fingerprint')).toBeInTheDocument();
      expect(await screen.findByText('0011223344')).toBeInTheDocument();
      expect(screen.getByText('URL')).toBeInTheDocument();
      expect(await screen.findByText('https://key.url')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Copy command to clipboard' })).toHaveLength(2);
    });

    it('opens modal when visibleKeyInfo is true', () => {
      render(
        <Router>
          <SignKeyInfo {...defaultProps} visibleKeyInfo />
        </Router>
      );
      expect(screen.getByRole('dialog')).toHaveClass('d-block');
    });
  });

  describe('renders disabled button', () => {
    it('when signed is true and signKey is undefined', async () => {
      render(
        <Router>
          <SignKeyInfo signed repoKind={RepositoryKind.Helm} visibleKeyInfo={false} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Open sign key modal' });
      expect(btn).toHaveClass('disabled');
      await userEvent.hover(btn);

      expect(await screen.findByRole('tooltip')).toBeInTheDocument();

      expect(screen.getByText("The publisher hasn't provided any information for this key yet")).toBeInTheDocument();
    });
  });

  describe('does not render button', () => {
    it('when signed is null', () => {
      const { container } = render(
        <Router>
          <SignKeyInfo signed={null} repoKind={RepositoryKind.Helm} visibleKeyInfo={false} />
        </Router>
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('when signed is false', () => {
      const { container } = render(
        <Router>
          <SignKeyInfo signed={false} repoKind={RepositoryKind.Helm} visibleKeyInfo={false} />
        </Router>
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('when repoKind is not Helm', () => {
      const { container } = render(
        <Router>
          <SignKeyInfo {...defaultProps} repoKind={RepositoryKind.OLM} visibleKeyInfo={false} />
        </Router>
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('when signature is only Cosign and signKey is undefined', () => {
      const { container } = render(
        <Router>
          <SignKeyInfo {...defaultProps} signKey={undefined} signatures={[Signature.Cosign]} visibleKeyInfo={false} />
        </Router>
      );
      expect(container).toBeEmptyDOMElement();
    });
  });
});
