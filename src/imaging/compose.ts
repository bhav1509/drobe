import * as FileSystem from "expo-file-system";
import { Skia } from "@shopify/react-native-skia";

function imageFromBase64(b64: string) {
  const data = Skia.Data.fromBase64(b64);
  return data ? Skia.Image.MakeImageFromEncoded(data) : null;
}

/**
 * Compose original + mask without BlendMode:
 * - Keep original RGB
 * - Set output alpha = mask's alpha channel
 */
export async function composeWithMask(originalUri: string, maskUri: string) {
  // Load images
  const o64 = await FileSystem.readAsStringAsync(originalUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const m64 = await FileSystem.readAsStringAsync(maskUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const oImg = imageFromBase64(o64);
  const mImg = imageFromBase64(m64);
  if (!oImg || !mImg) throw new Error("compose: decode failed");

  // Dimensions from original
  const W = oImg.width(),
    H = oImg.height();

  // Draw original into a surface and read pixels
  const sO = Skia.Surface.Make(W, H)!;
  sO.getCanvas().drawImage(oImg, 0, 0);
  const oPix = sO.makeImageSnapshot().readPixels(0, 0, W, H)!; // Uint8 RGBA

  // Draw mask scaled to match original, then read pixels
  const sM = Skia.Surface.Make(W, H)!;
  sM.getCanvas().drawImageRect(
    mImg,
    { x: 0, y: 0, width: mImg.width(), height: mImg.height() },
    { x: 0, y: 0, width: W, height: H }
  );
  const mPix = sM.makeImageSnapshot().readPixels(0, 0, W, H)!; // Uint8 RGBA

  // Build output: RGB from original, A from mask's A
  const out = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    out[i * 4 + 0] = oPix[i * 4 + 0]; // R
    out[i * 4 + 1] = oPix[i * 4 + 1]; // G
    out[i * 4 + 2] = oPix[i * 4 + 2]; // B
    out[i * 4 + 3] = mPix[i * 4 + 3]; // A from mask
  }

  // Create image from pixels and save (use Skia.Data for pixel bytes)
  const info = {
    width: W,
    height: H,
    colorType: Skia.ColorType.RGBA_8888,
    alphaType: Skia.AlphaType.Premul,
    // colorSpace omitted to avoid version mismatches
  } as const;

  const outData = Skia.Data.fromBytes(out);
  const outImg = Skia.Image.MakeImageFromPixels(info, outData, W * 4);
  if (!outImg) throw new Error("compose: failed to create output image");

  const pngB64 = outImg.encodeToBase64(); // default format (PNG)
  const outPath = FileSystem.documentDirectory! + `sil_${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(outPath, pngB64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return outPath;
}
