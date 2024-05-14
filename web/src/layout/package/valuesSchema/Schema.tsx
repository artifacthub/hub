import isUndefined from 'lodash/isUndefined';
import { Fragment, useEffect, useState } from 'react';

import { JSONSchema } from '../../../jsonschema';
import checkIfPropIsRequiredInSchema from '../../../utils/checkIfPropIsRequiredInSchema';
import compoundJSONSchemaYAML from '../../../utils/compoundJSONSchemaYAML';
import BlockCodeButtons from '../../common/BlockCodeButtons';
import ValuesSearch from '../../common/ValuesSearch';
import styles from './Schema.module.css';
import SchemaLine from './SchemaLine';

interface Props {
  schema: JSONSchema;
  normalizedName: string;
  visibleValuesSchemaPath?: string | null;
  onPathChange: (path?: string) => void;
}

const Schema = (props: Props) => {
  const [activePath, setActivePath] = useState<string | undefined | null>();
  const [valuesYAML, setValuesYAML] = useState<string | null>(null);
  const [availablePaths, setAvailablePaths] = useState<string[] | null>(null);
  const [savedOpts, setSavedOpts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const { yamlContent, paths } = compoundJSONSchemaYAML(props.schema, savedOpts);
    if (yamlContent) {
      setValuesYAML(yamlContent);
    }
    setAvailablePaths(paths);
  }, [props.schema, savedOpts]);

  const onSearch = (selectedPath?: string) => {
    onPathChange(selectedPath);
  };

  const saveSelectedOption = (path: string, index: number) => {
    setSavedOpts({
      ...savedOpts,
      [path]: index,
    });
  };

  const onPathChange = (path?: string) => {
    setActivePath(path);
    props.onPathChange(path);
  };

  useEffect(() => {
    setActivePath(props.visibleValuesSchemaPath);
  }, []);

  return (
    <>
      {availablePaths && (
        <ValuesSearch
          paths={availablePaths}
          activePath={activePath}
          onSearch={onSearch}
          wrapperClassName={styles.search}
        />
      )}
      <div className="row">
        <div className={`col-7 pt-3 position-relative border border-1 border-bottom-0 ${styles.code}`}>
          {props.schema.title && (
            <div className={`text-truncate font-monospace ${styles.comment}`}># {props.schema.title}</div>
          )}
          {valuesYAML && (
            <BlockCodeButtons
              className={styles.btns}
              content={valuesYAML}
              filename={`values-${props.normalizedName}.yaml`}
            />
          )}
        </div>
      </div>
      {!isUndefined(props.schema.properties) && (
        <>
          {Object.keys(props.schema.properties).map((propName: string) => {
            const value = props.schema.properties![propName] as JSONSchema;
            if (isUndefined(value)) return null;
            const isRequired = checkIfPropIsRequiredInSchema(propName, props.schema.required);

            return (
              <Fragment key={propName}>
                <SchemaLine
                  definitions={props.schema.definitions}
                  value={value}
                  name={propName}
                  level={0}
                  isRequired={isRequired}
                  className="pt-4"
                  activePath={activePath}
                  onActivePathChange={onPathChange}
                  saveSelectedOption={saveSelectedOption}
                />
              </Fragment>
            );
          })}
        </>
      )}
    </>
  );
};

export default Schema;
