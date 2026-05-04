// Reexport the native module. On web, it will be resolved to RootShellModule.web.ts
// and on native platforms to RootShellModule.ts
export { default } from './src/RootShellModule';
export { default as RootShellView } from './src/RootShellView';
export * from  './src/RootShell.types';
