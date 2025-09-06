import { requireNativeModule } from 'expo-modules-core';

type Mod = { removeBackground(uri: string): Promise<string> };

// JS module name must match `Name("BackgroundRemover")` in Swift
const Native = requireNativeModule<Mod>('BackgroundRemover');

export function removeBgNative(uri: string) {
  return Native.removeBackground(uri);
}
