import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { vi } from 'vitest';

import WidgetModal from './WidgetModal';

const setOpenStatusMock = jest.fn();

const mockUseNavigate = jest.fn();

vi.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

vi.mock('react-color', () => ({
  SketchPicker: () => <>sketch</>,
}));

vi.mock('react-syntax-highlighter', () => ({
  default: ({ children }: { children?: ReactNode }) => (
    <pre
      style={{
        display: 'block',
        overflowX: 'auto',
        padding: '0.5em',
        color: 'rgb(0, 0, 0)',
        backgroundImage: 'none',
        backgroundPosition: '0% 0%',
        backgroundSize: 'auto',
        backgroundRepeat: 'repeat',
        backgroundOrigin: 'padding-box',
        backgroundClip: 'border-box',
        backgroundAttachment: 'scroll',
        backgroundColor: 'var(--color-1-10)',
      }}
    >
      <code className="language-text" style={{ whiteSpace: 'pre' }}>
        <span>{children}</span>
      </code>
    </pre>
  ),
}));

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

const defaultProps = {
  packageId: 'id',
  packageName: 'pkg',
  packageDescription: 'this is the description',
  visibleWidget: true,
  setOpenStatus: setOpenStatusMock,
};

const expectedWidgetCode = (
  theme: string,
  header: boolean,
  responsive: boolean,
  description = defaultProps.packageDescription
) => {
  const url = `${window.location.origin}${window.location.pathname}`;
  const headerValue = header ? 'true' : 'false';
  const responsiveValue = responsive ? 'true' : 'false';
  const descriptionSuffix = description ? `: ${description}` : '';
  return `<div class="artifacthub-widget" data-url="${url}" data-theme="${theme}" data-header="${headerValue}" data-stars="true" data-responsive="${responsiveValue}"><blockquote><p lang="en" dir="ltr"><b>${defaultProps.packageName}</b>${descriptionSuffix}</p>&mdash; Open in <a href="${url}">null</a></blockquote></div><script async src="${window.location.origin}/artifacthub-widget.js"></script>`;
};

describe('WidgetModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <WidgetModal {...defaultProps} />
        </Router>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('light')).toBeInTheDocument();
      expect(screen.getByText('dark')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'light' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'dark' })).not.toBeChecked();
      expect(screen.getByText('Responsive')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'Responsive' })).not.toBeChecked();
      expect(
        screen.getByText(
          'The widget will try to use the width available on the parent container (between 350px and 650px).'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Stars')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'Stars' })).toBeChecked();
      expect(screen.getByText('Display number of stars given to the package.')).toBeInTheDocument();
      expect(screen.getByText('Code')).toBeInTheDocument();
      expect(screen.getByTestId('block-content')).toHaveTextContent(expectedWidgetCode('light', true, false));
    });

    it('when not white label', () => {
      render(
        <Router>
          <meta name="artifacthub:siteName" content="artifact hub" />
          <WidgetModal {...defaultProps} />
        </Router>
      );

      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'Header' })).toBeChecked();
      expect(screen.getByText('Display Artifact Hub header at the top of the widget.')).toBeInTheDocument();
    });

    it('updates block content to change different options', async () => {
      render(
        <Router>
          <WidgetModal {...defaultProps} />
        </Router>
      );

      expect(screen.getByTestId('block-content')).toHaveTextContent(expectedWidgetCode('light', true, false));

      await userEvent.click(screen.getByText('dark'));
      await userEvent.click(screen.getByText('Responsive'));

      expect(screen.getByTestId('block-content')).toHaveTextContent(expectedWidgetCode('dark', true, true));
    });
  });
});
