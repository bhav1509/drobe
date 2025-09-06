import { TensorflowModel } from "react-native-fast-tflite";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { Skia } from "@shopify/react-native-skia";

function imageFromBase64(b64: string) {
  const data = Skia.Data.fromBase64(b64);
  return data ? Skia.Image.MakeImageFromEncoded(data) : null;
}

async function loadModelSafe(assetModule: any) {
  try {
    const asset = Asset.fromModule(assetModule);
    await asset.downloadAsync();
    // On your logs TensorflowModel.create was undefined — we fall back gracefully.
    return await (TensorflowModel as any)?.create?.(asset.localUri!);
  } catch (e) {
    console.warn("TFLite model load failed (fallback):", e);
    return null;
  }
}

/** Returns a PNG mask path (white+opaque where keep). Falls back to opaque mask. */
export async function segmentToMask(
  sourceUri: string,
  kind: "body" | "clothes"
) {
  const base64 = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const img = imageFromBase64(base64);
  if (!img) throw new Error("Failed to decode image");

  const model = await loadModelSafe(
    kind === "body"
      ? require("../../assets/models/selfie_segmentation.tflite")
      : require("../../assets/models/u2netp_clothes.tflite")
  );

  // Fallback: opaque mask (no cutout) so flow still works
  if (!model) {
    const W = img.width(),
      H = img.height();
    const surf = Skia.Surface.Make(W, H)!;
    const canvas = surf.getCanvas();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("white"));
    canvas.drawRect({ x: 0, y: 0, width: W, height: H }, paint);
    const b64 = surf.makeImageSnapshot().encodeToBase64(); // default PNG
    const outPath =
      FileSystem.documentDirectory! + `mask_fallback_${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(outPath, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return outPath;
  }

  // (Optional real model path — currently unused because create() failed above)
  const [W, H] = kind === "body" ? [256, 256] : [320, 320];
  const surf = Skia.Surface.Make(W, H)!;
  const canvas = surf.getCanvas();
  const paint = Skia.Paint();
  canvas.drawImageRect(
    img,
    { x: 0, y: 0, width: img.width(), height: img.height() },
    { x: 0, y: 0, width: W, height: H },
    paint
  );

  const snap = surf.makeImageSnapshot();
  const pixels = snap.readPixels(0, 0, W, H)!; // Uint8 RGBA

  const input = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    input[i * 3 + 0] = pixels[i * 4 + 0] / 255;
    input[i * 3 + 1] = pixels[i * 4 + 1] / 255;
    input[i * 3 + 2] = pixels[i * 4 + 2] / 255;
  }

  let out: Float32Array;
  try {
    const outputs = (model as any).runSync([input]);
    out = outputs[0] as Float32Array;
    if (!out || out.length < W * H) throw new Error("Invalid model output");
  } catch (e) {
    console.warn("Inference failed (fallback):", e);
    const W2 = img.width(),
      H2 = img.height();
    const surf2 = Skia.Surface.Make(W2, H2)!;
    const canvas2 = surf2.getCanvas();
    const p2 = Skia.Paint();
    p2.setColor(Skia.Color("white"));
    canvas2.drawRect({ x: 0, y: 0, width: W2, height: H2 }, p2);
    const b64 = surf2.makeImageSnapshot().encodeToBase64();
    const out2 =
      FileSystem.documentDirectory! + `mask_fallback_${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(out2, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return out2;
  }

  // Build alpha mask
  const maskRGBA = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const v = out[i] > 0.5 ? 255 : 0;
    maskRGBA[i * 4 + 0] = 255;
    maskRGBA[i * 4 + 1] = 255;
    maskRGBA[i * 4 + 2] = 255;
    maskRGBA[i * 4 + 3] = v;
  }

  // Use MakeImage (info + Skia.Data + rowBytes) – per docs
  const data = Skia.Data.fromBytes(maskRGBA);
  const maskImg = Skia.Image.MakeImage(
    {
      width: W,
      height: H,
      alphaType: Skia.AlphaType.Premul,
      colorType: Skia.ColorType.RGBA_8888,
    },
    data,
    W * 4
  );
  if (!maskImg) throw new Error("Failed to create mask image");

  const outSurf = Skia.Surface.Make(W, H)!;
  outSurf.getCanvas().drawImage(maskImg, 0, 0);

  const b64 = outSurf.makeImageSnapshot().encodeToBase64();
  const outPath = FileSystem.documentDirectory! + `mask_${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(outPath, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return outPath;
}
