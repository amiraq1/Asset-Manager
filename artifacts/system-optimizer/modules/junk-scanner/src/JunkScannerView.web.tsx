import * as React from 'react';

import { JunkScannerViewProps } from './JunkScanner.types';

export default function JunkScannerView(props: JunkScannerViewProps) {
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
