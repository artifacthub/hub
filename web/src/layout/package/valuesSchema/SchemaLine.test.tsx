import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SchemaLine from './SchemaLine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getProps = (fixtureId: string): any => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  return require(`./__fixtures__/SchemaLine/${fixtureId}.json`) as any;
};

const onActivePathChangeMock = jest.fn();

describe('SchemaLine', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SchemaLine {...getProps('1')} onActivePathChange={onActivePathChangeMock} />);

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<SchemaLine {...getProps('2')} onActivePathChange={onActivePathChangeMock} />);

      expect(screen.getByText('# Database host')).toBeInTheDocument();
      expect(screen.getByText('host:')).toBeInTheDocument();
    });

    it('renders string type with default value', () => {
      render(<SchemaLine {...getProps('3')} onActivePathChange={onActivePathChangeMock} />);

      expect(screen.getByText('# Database name')).toBeInTheDocument();
      expect(screen.getByText('database:')).toBeInTheDocument();

      const defaultValue = screen.getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('hub');
      expect(defaultValue).toHaveClass('text-warning');
    });

    it('renders string type with empty string as default value', () => {
      render(<SchemaLine {...getProps('4')} onActivePathChange={onActivePathChangeMock} />);

      expect(screen.getByText('# Database host')).toBeInTheDocument();
      expect(screen.getByText('host:')).toBeInTheDocument();

      const defaultValue = screen.getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent(`""`);
      expect(defaultValue).toHaveClass('text-warning');
    });

    it('renders integer type with default value', () => {
      render(<SchemaLine {...getProps('5')} onActivePathChange={onActivePathChangeMock} />);

      expect(screen.getByText('# SMTP port')).toBeInTheDocument();
      expect(screen.getByText('port:')).toBeInTheDocument();

      const defaultValue = screen.getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('587');
      expect(defaultValue).toHaveClass('text-danger');
    });

    it('renders array type with default value', () => {
      render(<SchemaLine {...getProps('6')} onActivePathChange={onActivePathChangeMock} />);

      expect(screen.getByText('# GitHub OAuth scopes')).toBeInTheDocument();
      expect(screen.getByText('scopes:')).toBeInTheDocument();

      const defaultValue = screen.getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('read:useruser:email');
      expect(defaultValue).toHaveClass('text-warning');
    });

    it('renders boolean type with default value', () => {
      render(<SchemaLine {...getProps('7')} onActivePathChange={onActivePathChangeMock} />);

      expect(screen.getByText('# Enable Hub secure cookies')).toBeInTheDocument();
      expect(screen.getByText('secure:')).toBeInTheDocument();

      const defaultValue = screen.getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('false');
      expect(defaultValue).toHaveClass('text-danger');
    });

    it('renders array type with empty array as default value', () => {
      render(<SchemaLine {...getProps('8')} onActivePathChange={onActivePathChangeMock} />);

      expect(screen.getByText('# Hub ingress rules')).toBeInTheDocument();
      expect(screen.getByText('rules:')).toBeInTheDocument();

      const defaultValue = screen.getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('[]');
      expect(defaultValue).toHaveClass('text-warning');
    });

    it('renders object type with empty object as default value', () => {
      render(<SchemaLine {...getProps('9')} onActivePathChange={onActivePathChangeMock} />);

      expect(screen.getByText('# Trivy pod resource requirements')).toBeInTheDocument();
      expect(screen.getByText('resources:')).toBeInTheDocument();

      const defaultValue = screen.getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('{}');
      expect(defaultValue).toHaveClass('text-warning');
    });

    it('renders array with defined object as value', () => {
      render(<SchemaLine {...getProps('10')} onActivePathChange={onActivePathChangeMock} />);

      expect(screen.getByText('clusters:')).toBeInTheDocument();
      expect(screen.getByText('kafkaVersion:')).toBeInTheDocument();
      expect(screen.getAllByText('2.2.0')).toHaveLength(2);
      expect(screen.getByText('name:')).toBeInTheDocument();
      expect(screen.getByText('enabled:')).toBeInTheDocument();
      expect(screen.getAllByText('true')).toHaveLength(2);
      expect(screen.getByText('curatorConfig:')).toBeInTheDocument();
      expect(screen.getByText('zkMaxRetry:')).toBeInTheDocument();
      expect(screen.getByText('maxSleepTimeMs:')).toBeInTheDocument();
      expect(screen.getByText('baseSleepTimeMs:')).toBeInTheDocument();
      expect(screen.getByText('zkConnect:')).toBeInTheDocument();
      expect(screen.getAllByText('100')).toHaveLength(4);
      expect(screen.getAllByText('1000')).toHaveLength(2);
    });

    it('activates line', async () => {
      render(<SchemaLine {...getProps('11')} onActivePathChange={onActivePathChangeMock} />);

      const btn = screen.getByTestId('lineContent');
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(onActivePathChangeMock).toHaveBeenCalledTimes(1);
        expect(onActivePathChangeMock).toHaveBeenCalledWith('db.host');
      });
    });
  });
});
