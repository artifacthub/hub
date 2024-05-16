import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/elegant.css';
import 'codemirror/theme/material-darker.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/go/go';
import 'codemirror-rego/mode';

import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { ElementType, useContext } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';

import { AppCtx } from '../../context/AppCtx';
import styles from './CodeEditor.module.css';

interface Props {
  value: string;
  mode: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const CodeEditor: ElementType = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const { effective } = ctx.prefs.theme;

  const isDisabled = !isUndefined(props.disabled) && props.disabled;

  return (
    <CodeMirror
      className={classnames('border border-1 position-relative h-100', styles.code, { [styles.disabled]: isDisabled })}
      value={props.value}
      options={{
        mode: {
          name: props.mode,
          json: true,
          statementIndent: 2,
        },
        theme: effective === 'dark' ? 'material-darker' : 'elegant',
        lineNumbers: true,
        inputStyle: 'contenteditable',
        viewportMargin: Infinity,
        readOnly: isDisabled ? 'nocursor' : false,
        tabindex: 0,
      }}
      editorDidMount={(editor) => {
        editor.setSize('', '100%');
      }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onBeforeChange={(editor: any, data: any, value: string) => {
        props.onChange(value);
      }}
    />
  );
};

export default CodeEditor;
