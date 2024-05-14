import { Component } from 'react';

import ExternalLink from './ExternalLink';
import NoData from './NoData';

interface Props {
  message: string;
  children: JSX.Element;
  className?: string;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    const { state, props } = this;

    if (state.hasError) {
      return (
        <NoData className={props.className}>
          <>
            {props.message}
            <div className="h6 mt-4">
              Please{' '}
              <ExternalLink href="https://github.com/artifacthub/hub/issues/new/choose" label="GitHub issue">
                <u>file an issue</u>
              </ExternalLink>{' '}
              in GitHub indicating the URL of the package you are experiencing problems with.
            </div>
          </>
        </NoData>
      );
    }

    return props.children;
  }
}

export default ErrorBoundary;
