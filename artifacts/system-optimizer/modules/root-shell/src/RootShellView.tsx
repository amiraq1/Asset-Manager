import { requireNativeView } from 'expo';
import * as React from 'react';

import { RootShellViewProps } from './RootShell.types';

const NativeView: React.ComponentType<RootShellViewProps> =
  requireNativeView('RootShell');

export default function RootShellView(props: RootShellViewProps) {
  return <NativeView {...props} />;
}
