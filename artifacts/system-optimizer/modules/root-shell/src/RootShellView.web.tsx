import * as React from 'react';

import { RootShellViewProps } from './RootShell.types';

export default function RootShellView(props: RootShellViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
