import { render } from '@testing-library/react';
import React from 'react';

import SchemaLine from './SchemaLine';

const getProps = (fixtureId: string): any => {
  return require(`./__fixtures__/SchemaLine/${fixtureId}.json`) as any;
};

describe('SchemaLine', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<SchemaLine {...getProps('1')} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<SchemaLine {...getProps('2')} />);

      expect(getByText('# Database host')).toBeInTheDocument();
      expect(getByText('host:')).toBeInTheDocument();
    });

    it('renders string type with default value', () => {
      const { getByText, getByTestId } = render(<SchemaLine {...getProps('3')} />);

      expect(getByText('# Database name')).toBeInTheDocument();
      expect(getByText('database:')).toBeInTheDocument();

      const defaultValue = getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('hub');
      expect(defaultValue).toHaveClass('text-warning');
    });

    it('renders string type with empty string as default value', () => {
      const { getByText, getByTestId } = render(<SchemaLine {...getProps('4')} />);

      expect(getByText('# Database host')).toBeInTheDocument();
      expect(getByText('host:')).toBeInTheDocument();

      const defaultValue = getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent(`""`);
      expect(defaultValue).toHaveClass('text-warning');
    });

    it('renders integer type with default value', () => {
      const { getByText, getByTestId } = render(<SchemaLine {...getProps('5')} />);

      expect(getByText('# SMTP port')).toBeInTheDocument();
      expect(getByText('port:')).toBeInTheDocument();

      const defaultValue = getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('587');
      expect(defaultValue).toHaveClass('text-danger');
    });

    it('renders array type with default value', () => {
      const { getByText, getByTestId } = render(<SchemaLine {...getProps('6')} />);

      expect(getByText('# Github oauth scopes')).toBeInTheDocument();
      expect(getByText('scopes:')).toBeInTheDocument();

      const defaultValue = getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('read:useruser:email');
      expect(defaultValue).toHaveClass('text-warning');
    });

    it('renders boolean type with default value', () => {
      const { getByText, getByTestId } = render(<SchemaLine {...getProps('7')} />);

      expect(getByText('# Enable Hub secure cookies')).toBeInTheDocument();
      expect(getByText('secure:')).toBeInTheDocument();

      const defaultValue = getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('false');
      expect(defaultValue).toHaveClass('text-danger');
    });

    it('renders array type with empty array as default value', () => {
      const { getByText, getByTestId } = render(<SchemaLine {...getProps('8')} />);

      expect(getByText('# Hub ingress rules')).toBeInTheDocument();
      expect(getByText('rules:')).toBeInTheDocument();

      const defaultValue = getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('[]');
      expect(defaultValue).toHaveClass('text-warning');
    });

    it('renders object type with empty object as default value', () => {
      const { getByText, getByTestId } = render(<SchemaLine {...getProps('9')} />);

      expect(getByText('# Trivy pod resource requirements')).toBeInTheDocument();
      expect(getByText('resources:')).toBeInTheDocument();

      const defaultValue = getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('{}');
      expect(defaultValue).toHaveClass('text-warning');
    });
  });
});
