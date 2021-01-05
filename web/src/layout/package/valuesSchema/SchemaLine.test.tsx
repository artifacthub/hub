import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import SchemaLine from './SchemaLine';

const getProps = (fixtureId: string): any => {
  return require(`./__fixtures__/SchemaLine/${fixtureId}.json`) as any;
};

const onActivePathChangeMock = jest.fn();

describe('SchemaLine', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<SchemaLine {...getProps('1')} onActivePathChange={onActivePathChangeMock} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<SchemaLine {...getProps('2')} onActivePathChange={onActivePathChangeMock} />);

      expect(getByText('# Database host')).toBeInTheDocument();
      expect(getByText('host:')).toBeInTheDocument();
    });

    it('renders string type with default value', () => {
      const { getByText, getByTestId } = render(
        <SchemaLine {...getProps('3')} onActivePathChange={onActivePathChangeMock} />
      );

      expect(getByText('# Database name')).toBeInTheDocument();
      expect(getByText('database:')).toBeInTheDocument();

      const defaultValue = getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('hub');
      expect(defaultValue).toHaveClass('text-warning');
    });

    it('renders string type with empty string as default value', () => {
      const { getByText, getByTestId } = render(
        <SchemaLine {...getProps('4')} onActivePathChange={onActivePathChangeMock} />
      );

      expect(getByText('# Database host')).toBeInTheDocument();
      expect(getByText('host:')).toBeInTheDocument();

      const defaultValue = getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent(`""`);
      expect(defaultValue).toHaveClass('text-warning');
    });

    it('renders integer type with default value', () => {
      const { getByText, getByTestId } = render(
        <SchemaLine {...getProps('5')} onActivePathChange={onActivePathChangeMock} />
      );

      expect(getByText('# SMTP port')).toBeInTheDocument();
      expect(getByText('port:')).toBeInTheDocument();

      const defaultValue = getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('587');
      expect(defaultValue).toHaveClass('text-danger');
    });

    it('renders array type with default value', () => {
      const { getByText, getByTestId } = render(
        <SchemaLine {...getProps('6')} onActivePathChange={onActivePathChangeMock} />
      );

      expect(getByText('# Github oauth scopes')).toBeInTheDocument();
      expect(getByText('scopes:')).toBeInTheDocument();

      const defaultValue = getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('read:useruser:email');
      expect(defaultValue).toHaveClass('text-warning');
    });

    it('renders boolean type with default value', () => {
      const { getByText, getByTestId } = render(
        <SchemaLine {...getProps('7')} onActivePathChange={onActivePathChangeMock} />
      );

      expect(getByText('# Enable Hub secure cookies')).toBeInTheDocument();
      expect(getByText('secure:')).toBeInTheDocument();

      const defaultValue = getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('false');
      expect(defaultValue).toHaveClass('text-danger');
    });

    it('renders array type with empty array as default value', () => {
      const { getByText, getByTestId } = render(
        <SchemaLine {...getProps('8')} onActivePathChange={onActivePathChangeMock} />
      );

      expect(getByText('# Hub ingress rules')).toBeInTheDocument();
      expect(getByText('rules:')).toBeInTheDocument();

      const defaultValue = getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('[]');
      expect(defaultValue).toHaveClass('text-warning');
    });

    it('renders object type with empty object as default value', () => {
      const { getByText, getByTestId } = render(
        <SchemaLine {...getProps('9')} onActivePathChange={onActivePathChangeMock} />
      );

      expect(getByText('# Trivy pod resource requirements')).toBeInTheDocument();
      expect(getByText('resources:')).toBeInTheDocument();

      const defaultValue = getByTestId('defaultValue');
      expect(defaultValue).toBeInTheDocument();
      expect(defaultValue).toHaveTextContent('{}');
      expect(defaultValue).toHaveClass('text-warning');
    });

    it('renders array with defined object as value', () => {
      const { getByText, getAllByText } = render(
        <SchemaLine {...getProps('10')} onActivePathChange={onActivePathChangeMock} />
      );

      expect(getByText('clusters:')).toBeInTheDocument();
      expect(getByText('kafkaVersion:')).toBeInTheDocument();
      expect(getAllByText('2.2.0')).toHaveLength(2);
      expect(getByText('name:')).toBeInTheDocument();
      expect(getByText('enabled:')).toBeInTheDocument();
      expect(getAllByText('true')).toHaveLength(2);
      expect(getByText('curatorConfig:')).toBeInTheDocument();
      expect(getByText('zkMaxRetry:')).toBeInTheDocument();
      expect(getByText('maxSleepTimeMs:')).toBeInTheDocument();
      expect(getByText('baseSleepTimeMs:')).toBeInTheDocument();
      expect(getByText('zkConnect:')).toBeInTheDocument();
      expect(getAllByText('100')).toHaveLength(4);
      expect(getAllByText('1000')).toHaveLength(2);
    });

    it('activates line', () => {
      const { getByTestId } = render(<SchemaLine {...getProps('11')} onActivePathChange={onActivePathChangeMock} />);

      const btn = getByTestId('lineContent');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      expect(onActivePathChangeMock).toHaveBeenCalledTimes(1);
      expect(onActivePathChangeMock).toHaveBeenCalledWith('db.host');
    });
  });
});
