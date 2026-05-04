import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './RootShell.types';

type RootShellModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class RootShellModule extends NativeModule<RootShellModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(RootShellModule, 'RootShellModule');
