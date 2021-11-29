import { render, screen } from '@testing-library/react';

import ErrorBoundary from './ErrorBoundary';

const defaultProps = {
  message: 'This is a sample text',
};

const Throw = () => {
  throw new Error('bad');
};

describe('ErrorBoundary', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates error snapshot', () => {
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    const { asFragment } = render(
      <ErrorBoundary {...defaultProps}>
        <Throw />
      </ErrorBoundary>
    );
    expect(asFragment()).toMatchSnapshot();

    spy.mockRestore();
  });

  it('renders error component', () => {
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    render(
      <ErrorBoundary {...defaultProps}>
        <Throw />
      </ErrorBoundary>
    );

    expect(screen.getByText(defaultProps.message)).toBeDefined();
    expect(
      screen.getByText(/indicating the URL of the package you are experiencing problems with/i)
    ).toBeInTheDocument();

    spy.mockRestore();
  });

  it('renders not error component', () => {
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    render(
      <ErrorBoundary {...defaultProps}>
        <span>No error</span>
      </ErrorBoundary>
    );

    expect(screen.queryByText(defaultProps.message)).toBeNull();
    expect(screen.queryByText(/indicating the URL of the package you are experiencing problems with/i)).toBeNull();
    expect(screen.getByText('No error')).toBeInTheDocument();

    spy.mockRestore();
  });
});
