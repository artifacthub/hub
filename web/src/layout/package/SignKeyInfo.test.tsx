import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

const mockHistoryReplace = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    replace: mockHistoryReplace,
  }),
}));

describe('SignKeyInfo', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SignKeyInfo {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<SignKeyInfo {...defaultProps} />);
      expect(screen.getByText('View key info')).toBeInTheDocument();
    });

    it('opens modal', () => {
      render(<SignKeyInfo {...defaultProps} />);

      const btn = screen.getByText('View key info');
      userEvent.click(btn);

      expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
      expect(mockHistoryReplace).toHaveBeenCalledWith({
        search: '?modal=key-info',
        state: {
          fromStarredPage: undefined,
          searchUrlReferer: undefined,
        },
      });

      expect(screen.getByText('Sign key information'));
      expect(screen.getByText('Fingerprint')).toBeInTheDocument();
      expect(screen.getByText('0011223344')).toBeInTheDocument();
      expect(screen.getByText('URL')).toBeInTheDocument();
      expect(screen.getByText('https://key.url')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Copy command to clipboard' })).toHaveLength(2);
    });

    it('opens modal when visibleKeyInfo is true', () => {
      render(<SignKeyInfo {...defaultProps} visibleKeyInfo />);
      expect(screen.getByRole('dialog')).toHaveClass('d-block');
    });
  });

  describe('renders disabled button', () => {
    it('when signed is true and signKey is undefined', async () => {
      render(<SignKeyInfo signed repoKind={RepositoryKind.Helm} visibleKeyInfo={false} />);

      const btn = screen.getByRole('button', { name: 'Open sign key modal' });
      expect(btn).toHaveClass('disabled');
      userEvent.hover(btn);

      expect(await screen.findByRole('tooltip')).toBeInTheDocument();

      expect(screen.getByText("The publisher hasn't provided any information for this key yet")).toBeInTheDocument();
    });
  });

  describe('does not render button', () => {
    it('when signed is null', () => {
      const { container } = render(<SignKeyInfo signed={null} repoKind={RepositoryKind.Helm} visibleKeyInfo={false} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('when signed is false', () => {
      const { container } = render(
        <SignKeyInfo signed={false} repoKind={RepositoryKind.Helm} visibleKeyInfo={false} />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('when repoKind is not Helm', () => {
      const { container } = render(
        <SignKeyInfo {...defaultProps} repoKind={RepositoryKind.OLM} visibleKeyInfo={false} />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('when signature is only Cosign and signKey is undefined', () => {
      const { container } = render(
        <SignKeyInfo {...defaultProps} signKey={undefined} signatures={[Signature.Cosign]} visibleKeyInfo={false} />
      );
      expect(container).toBeEmptyDOMElement();
    });
  });
});
