import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import SchemaDefinition from './SchemaDefinition';

const getProps = (fixtureId: string): any => {
  return require(`./__fixtures__/SchemaDefinition/${fixtureId}.json`) as any;
};

const onActivePathChangeMock = jest.fn();
const setValueMock = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  isRequired: false,
  isExpanded: true,
  path: 'currentPath',
  onActivePathChange: onActivePathChangeMock,
  setValue: setValueMock,
};

describe('SchemaDefinition', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<SchemaDefinition {...getProps('1')} {...defaultProps} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component - type: string', () => {
      const props = getProps('2');
      const { getByText } = render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(getByText('Copy path to clipboard')).toBeInTheDocument();
      expect(getByText('Phone')).toBeInTheDocument();
      expect(getByText('Default')).toBeInTheDocument();
      expect(getByText('value')).toBeInTheDocument();
      expect(getByText('Type')).toBeInTheDocument();
      expect(getByText('string')).toBeInTheDocument();
      expect(getByText('Annotations')).toBeInTheDocument();
      expect(getByText('Description')).toBeInTheDocument();
      expect(getByText('this is a description')).toBeInTheDocument();
      expect(getByText('Constraints')).toBeInTheDocument();
      expect(getByText('Format')).toBeInTheDocument();
      expect(getByText('Pattern')).toBeInTheDocument();
      expect(getByText('^(\\([0-9]{3}\\))?[0-9]{3}-[0-9]{4}$')).toBeInTheDocument();
      expect(getByText('Min length')).toBeInTheDocument();
      expect(getByText('7')).toBeInTheDocument();
      expect(getByText('Max length')).toBeInTheDocument();
      expect(getByText('12')).toBeInTheDocument();
      expect(getByText('Enum')).toBeInTheDocument();
    });

    it('renders component - type: integer', () => {
      const props = getProps('3');
      const { getByText } = render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(getByText('Sample')).toBeInTheDocument();
      expect(getByText('Default')).toBeInTheDocument();
      expect(getByText('2')).toBeInTheDocument();
      expect(getByText('Type')).toBeInTheDocument();
      expect(getByText('integer')).toBeInTheDocument();
      expect(getByText('Annotations')).toBeInTheDocument();
      expect(getByText('Description')).toBeInTheDocument();
      expect(getByText('this is a description')).toBeInTheDocument();
      expect(getByText('Constraints')).toBeInTheDocument();
      expect(getByText('Min')).toBeInTheDocument();
      expect(getByText('0')).toBeInTheDocument();
      expect(getByText('Max')).toBeInTheDocument();
      expect(getByText('100')).toBeInTheDocument();
      expect(getByText('Exclusive min')).toBeInTheDocument();
      expect(getByText('Exclusive max')).toBeInTheDocument();
      expect(getByText('true')).toBeInTheDocument();
      expect(getByText('Enum')).toBeInTheDocument();
    });

    it('renders component - type: object', () => {
      const props = getProps('4');
      const { getByText, getAllByTestId } = render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(getByText('Scanner configuration')).toBeInTheDocument();
      expect(getByText('Type')).toBeInTheDocument();
      expect(getByText('object')).toBeInTheDocument();
      expect(getByText('Annotations')).toBeInTheDocument();
      expect(getByText('Description')).toBeInTheDocument();
      expect(getByText('this is a description')).toBeInTheDocument();
      expect(getByText('Constraints')).toBeInTheDocument();
      expect(getByText('Properties')).toBeInTheDocument();
      expect(getAllByTestId('listItem')).toHaveLength(3);
      expect(getByText('Enum')).toBeInTheDocument();
    });

    it('renders component - type: array', () => {
      const props = getProps('5');
      const { getByText, getAllByText } = render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(getByText('title')).toBeInTheDocument();
      expect(getByText('Type')).toBeInTheDocument();
      expect(getByText('array')).toBeInTheDocument();
      expect(getAllByText('Default')).toHaveLength(2);
      expect(getByText('(please expand for more details)')).toBeInTheDocument();
      expect(getByText('Annotations')).toBeInTheDocument();
      expect(getByText('Description')).toBeInTheDocument();
      expect(getByText('this is a description')).toBeInTheDocument();
      expect(getByText('Constraints')).toBeInTheDocument();
      expect(getByText('Items')).toBeInTheDocument();
      expect(getAllByText('[string]')).toHaveLength(2);
      expect(getAllByText('(unique)')).toHaveLength(2);
      expect(getByText('Min items')).toBeInTheDocument();
      expect(getByText('2')).toBeInTheDocument();
      expect(getByText('Max items')).toBeInTheDocument();
      expect(getByText('6')).toBeInTheDocument();
      expect(getByText('Enum')).toBeInTheDocument();
    });

    it('calls setActivePathMock', () => {
      const props = getProps('6');
      const { getByTestId, queryByText } = render(<SchemaDefinition {...props} {...defaultProps} isExpanded={false} />);

      expect(queryByText('Annotations')).toBeNull();
      expect(queryByText('Constraints')).toBeNull();

      const btn = getByTestId('expandBtn');
      fireEvent.click(btn);

      expect(onActivePathChangeMock).toHaveBeenCalledTimes(1);
      expect(onActivePathChangeMock).toHaveBeenCalledWith('currentPath');
    });

    it('renders ENUM', () => {
      const props = getProps('7');
      const { getAllByTestId, getByText } = render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(getByText('Enum')).toBeInTheDocument();
      expect(getAllByTestId('listItem')).toHaveLength(7);
      expect(getByText('trace')).toBeInTheDocument();
      expect(getByText('debug')).toBeInTheDocument();
      expect(getByText('info')).toBeInTheDocument();
      expect(getByText('warn')).toBeInTheDocument();
      expect(getByText('error')).toBeInTheDocument();
      expect(getByText('fatal')).toBeInTheDocument();
      expect(getByText('panic')).toBeInTheDocument();
    });

    it('renders REQUIRED label', () => {
      const props = getProps('8');
      const { getByText } = render(<SchemaDefinition {...props} {...defaultProps} isRequired />);

      expect(getByText('Required')).toBeInTheDocument();
      expect(getByText('Required')).toHaveClass('badge-success');
    });

    it('renders value with different options', () => {
      const props = getProps('9');
      const { getByDisplayValue, getByText, rerender } = render(<SchemaDefinition {...props} {...defaultProps} />);

      const select = getByDisplayValue('Option 1');
      expect(select).toBeInTheDocument();
      expect(getByText('object')).toBeInTheDocument();

      fireEvent.change(select, { target: { value: '2' } });

      expect(setValueMock).toHaveBeenCalledTimes(1);
      expect(setValueMock).toHaveBeenCalledWith({
        active: 2,
        combinationType: 'anyOf',
        error: false,
        options: [
          { additionalProperties: false, type: 'object' },
          {
            additionalProperties: false,
            properties: {
              agentGroupId: {
                description: 'Agent group ID from Management Console (hover over an agent group to see its ID)',
                type: 'number',
              },
              agentNamePrefix: { description: "Prefix for each auto-registered agent's name", type: 'string' },
              cloudUrl: { description: 'Base URL of the Jitterbit Harmony Cloud', type: 'string' },
              deregisterAgentOnDrainstop: {
                description: 'Performs agent deregistration on drainstop/JVM shutdown (defaults to false)',
                type: 'boolean',
              },
              password: {
                description: 'Encrypted password of the Agent Installer user (encrypted using JitterbitUtils)',
                type: 'string',
              },
              retryCount: {
                description:
                  'Number of retries if agent is having issues making the call to Harmony cloud for registration (defaults to 10, valid range is 0-300)',
                maximum: 300,
                minimum: 0,
                type: 'integer',
              },
              retryIntervalSeconds: {
                description:
                  'Number of seconds the agent will wait before retrying. This number doubles every retry to a maximum of 600 seconds (10 minutes). Defaults to 5, valid range 5-600.',
                maximum: 600,
                minimum: 5,
                type: 'integer',
              },
              username: {
                description: 'Encrypted username of the Agent Installer user (encrypted using JitterbitUtils)',
                type: 'string',
              },
            },
            required: ['cloudUrl', 'username', 'password', 'agentGroupId'],
            type: 'object',
          },
          { type: 'null' },
        ],
      });

      rerender(<SchemaDefinition {...props} {...defaultProps} def={{ ...props.def, active: 2 }} isRequired />);
      expect(getByText('null')).toBeInTheDocument();
    });

    it('renders 2 different types', () => {
      const props = getProps('10');
      const { getByDisplayValue, getByText, queryByText, getByTestId } = render(
        <SchemaDefinition {...props} {...defaultProps} />
      );

      const select = getByDisplayValue('string');

      expect(select).toBeInTheDocument();
      expect(getByText('Constraints')).toBeInTheDocument();
      expect(getByTestId('schemaCombSelect')).toBeInTheDocument();

      fireEvent.change(select, { target: { value: 'null' } });

      expect(queryByText('Constraints')).toBeNull();
    });

    it('renders link in description', () => {
      const props = getProps('11');
      const { getByText } = render(<SchemaDefinition {...props} {...defaultProps} />);

      const link = getByText(
        'https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.19/#resourcerequirements-v1-core'
      );
      expect(link).toBeInTheDocument();
      expect(link).toHaveClass('d-inline text-secondary');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute(
        'href',
        'https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.19/#resourcerequirements-v1-core'
      );
    });

    it('updates combinationType', () => {
      const props = getProps('12a');
      const { getByText, queryByText, rerender } = render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(getByText('Raw')).toBeInTheDocument();

      const updatedProps = getProps('12b');
      rerender(<SchemaDefinition {...updatedProps} {...defaultProps} />);

      waitFor(() => {
        expect(queryByText('Raw')).toBeNull();
      });
    });
  });
});
