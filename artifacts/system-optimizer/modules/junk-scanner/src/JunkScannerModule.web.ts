import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './JunkScanner.types';

type JunkScannerModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class JunkScannerModule extends NativeModule<JunkScannerModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(JunkScannerModule, 'JunkScannerModule');
