declare module 'react-native-fast-tflite';
declare module 'expo-asset';
declare module '@shopify/react-native-skia' {
  // Loosen typing so we can use Skia APIs without red squiggles
  export const Skia: any;
}
