import { requireNativeView } from 'expo';
import * as React from 'react';

import { JunkScannerViewProps } from './JunkScanner.types';

const NativeView: React.ComponentType<JunkScannerViewProps> =
  requireNativeView('JunkScanner');

export default function JunkScannerView(props: JunkScannerViewProps) {
  return <NativeView {...props} />;
}
