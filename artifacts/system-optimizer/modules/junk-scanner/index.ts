// Reexport the native module. On web, it will be resolved to JunkScannerModule.web.ts
// and on native platforms to JunkScannerModule.ts
export { default } from './src/JunkScannerModule';
export { default as JunkScannerView } from './src/JunkScannerView';
export * from  './src/JunkScanner.types';
