import { NativeModule, requireNativeModule } from 'expo';

import { JunkScannerModuleEvents } from './JunkScanner.types';

declare class JunkScannerModule extends NativeModule<JunkScannerModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<JunkScannerModule>('JunkScanner');
