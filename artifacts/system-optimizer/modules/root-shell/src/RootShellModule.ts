import { NativeModule, requireNativeModule } from 'expo';

import { RootShellModuleEvents } from './RootShell.types';

declare class RootShellModule extends NativeModule<RootShellModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<RootShellModule>('RootShell');
