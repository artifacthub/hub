import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import SchemaDefinition from './SchemaDefinition';

const getProps = (fixtureId: string): any => {
  return require(`./__fixtures__/SchemaDefinition/${fixtureId}.json`) as any;
};

const setActivePathMock = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  isRequired: false,
  isExpanded: true,
  path: 'currentPath',
  setActivePath: setActivePathMock,
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
      expect(getByText(props.def.title)).toBeInTheDocument();
      expect(getByText('Default')).toBeInTheDocument();
      expect(getByText(props.defaultValue)).toBeInTheDocument();
      expect(getByText('Type')).toBeInTheDocument();
      expect(getByText(props.def.type)).toBeInTheDocument();
      expect(getByText('Annotations')).toBeInTheDocument();
      expect(getByText('Description')).toBeInTheDocument();
      expect(getByText(props.def.description)).toBeInTheDocument();
      expect(getByText('Constraints')).toBeInTheDocument();
      expect(getByText('Format')).toBeInTheDocument();
      expect(getByText('Pattern')).toBeInTheDocument();
      expect(getByText(props.def.pattern)).toBeInTheDocument();
      expect(getByText('Min length')).toBeInTheDocument();
      expect(getByText(props.def.minLength.toString())).toBeInTheDocument();
      expect(getByText('Max length')).toBeInTheDocument();
      expect(getByText(props.def.maxLength.toString())).toBeInTheDocument();
      expect(getByText('Enum')).toBeInTheDocument();
    });

    it('renders component - type: integer', () => {
      const props = getProps('3');
      const { getByText } = render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(getByText(props.def.title)).toBeInTheDocument();
      expect(getByText('Default')).toBeInTheDocument();
      expect(getByText(props.defaultValue)).toBeInTheDocument();
      expect(getByText('Type')).toBeInTheDocument();
      expect(getByText(props.def.type)).toBeInTheDocument();
      expect(getByText('Annotations')).toBeInTheDocument();
      expect(getByText('Description')).toBeInTheDocument();
      expect(getByText(props.def.description)).toBeInTheDocument();
      expect(getByText('Constraints')).toBeInTheDocument();
      expect(getByText('Min')).toBeInTheDocument();
      expect(getByText(props.def.minimum.toString())).toBeInTheDocument();
      expect(getByText('Max')).toBeInTheDocument();
      expect(getByText(props.def.maximum.toString())).toBeInTheDocument();
      expect(getByText('Exclusive min')).toBeInTheDocument();
      expect(getByText('Exclusive max')).toBeInTheDocument();
      expect(getByText(props.def.exclusiveMaximum.toString())).toBeInTheDocument();
      expect(getByText('Enum')).toBeInTheDocument();
    });

    it('renders component - type: object', () => {
      const props = getProps('4');
      const { getByText, getAllByTestId } = render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(getByText(props.def.title)).toBeInTheDocument();
      expect(getByText('Type')).toBeInTheDocument();
      expect(getByText(props.def.type)).toBeInTheDocument();
      expect(getByText('Annotations')).toBeInTheDocument();
      expect(getByText('Description')).toBeInTheDocument();
      expect(getByText(props.def.description)).toBeInTheDocument();
      expect(getByText('Constraints')).toBeInTheDocument();
      expect(getByText('Properties')).toBeInTheDocument();
      expect(getAllByTestId('listItem')).toHaveLength(Object.keys(props.def.properties).length);
      expect(getByText('Enum')).toBeInTheDocument();
    });

    it('renders component - type: array', () => {
      const props = getProps('5');
      const { getByText, getAllByText } = render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(getByText(props.def.title)).toBeInTheDocument();
      expect(getByText('Type')).toBeInTheDocument();
      expect(getByText(props.def.type)).toBeInTheDocument();
      expect(getAllByText('Default')).toHaveLength(2);
      expect(getByText('(please expand for more details)')).toBeInTheDocument();
      expect(getByText('Annotations')).toBeInTheDocument();
      expect(getByText('Description')).toBeInTheDocument();
      expect(getByText(props.def.description)).toBeInTheDocument();
      expect(getByText('Constraints')).toBeInTheDocument();
      expect(getByText('Items')).toBeInTheDocument();
      expect(getAllByText('[string]')).toHaveLength(2);
      expect(getAllByText('(unique)')).toHaveLength(2);
      expect(getByText('Min items')).toBeInTheDocument();
      expect(getByText(props.def.minItems.toString())).toBeInTheDocument();
      expect(getByText('Max items')).toBeInTheDocument();
      expect(getByText(props.def.maxItems.toString())).toBeInTheDocument();
      expect(getByText('Enum')).toBeInTheDocument();
    });

    it('calls setActivePathMock', () => {
      const props = getProps('6');
      const { getByTestId, queryByText } = render(<SchemaDefinition {...props} {...defaultProps} isExpanded={false} />);

      expect(queryByText('Annotations')).toBeNull();
      expect(queryByText('Constraints')).toBeNull();

      const btn = getByTestId('expandBtn');
      fireEvent.click(btn);

      expect(setActivePathMock).toHaveBeenCalledTimes(1);
      expect(setActivePathMock).toHaveBeenCalledWith('currentPath');
    });

    it('renders ENUM', () => {
      const props = getProps('7');
      const { getAllByTestId, getByText } = render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(getByText('Enum')).toBeInTheDocument();
      expect(getAllByTestId('listItem')).toHaveLength(props.def.enum.length);
      for (let i = 0; i < props.def.enum.length; i++) {
        expect(getByText(props.def.enum[i])).toBeInTheDocument();
      }
    });

    it('renders REQUIRED label', () => {
      const props = getProps('8');
      const { getByText } = render(<SchemaDefinition {...props} {...defaultProps} isRequired />);

      expect(getByText('Required')).toBeInTheDocument();
      expect(getByText('Required')).toHaveClass('badge-success');
    });
  });
});
