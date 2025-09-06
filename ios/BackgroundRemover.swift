import ExpoModulesCore
import Vision
import CoreImage
import UIKit

public class BackgroundRemoverModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BackgroundRemover")

    Function("ping") {
      return "pong"
    }

    AsyncFunction("removeBackground") { (uri: String) -> String in
      guard let url = URL(string: uri), url.isFileURL else {
        throw Exception(name: "bad_uri", description: "Invalid file URI")
      }
      guard let input = CIImage(contentsOf: url) else {
        throw Exception(name: "load_error", description: "Could not load image")
      }

      let req = VNGeneratePersonSegmentationRequest()
      req.qualityLevel = .balanced
      req.outputPixelFormat = kCVPixelFormatType_OneComponent8

      let handler = VNImageRequestHandler(ciImage: input, options: [:])
      try handler.perform([req])

      guard let obs = req.results?.first as? VNPixelBufferObservation else {
        throw Exception(name: "no_mask", description: "No person mask produced")
      }
      let maskCI = CIImage(cvPixelBuffer: obs.pixelBuffer)

      let sx = input.extent.width / max(maskCI.extent.width, 1)
      let sy = input.extent.height / max(maskCI.extent.height, 1)
      let scaledMask = maskCI.transformed(by: CGAffineTransform(scaleX: sx, y: sy))

      let clearBG = CIImage(color: .clear).cropped(to: input.extent)
      let output = input.applyingFilter("CIBlendWithMask", parameters: [
        kCIInputBackgroundImageKey: clearBG,
        kCIInputMaskImageKey: scaledMask
      ])

      let ctx = CIContext()
      guard let cg = ctx.createCGImage(output, from: input.extent) else {
        throw Exception(name: "render_error", description: "Could not render output")
      }
      let ui = UIImage(cgImage: cg)
      guard let png = ui.pngData() else {
        throw Exception(name: "encode_error", description: "Could not encode PNG")
      }

      let outURL = FileManager.default.temporaryDirectory
        .appendingPathComponent("sil_\(UUID().uuidString).png")
      try png.write(to: outURL)
      return outURL.absoluteString
    }
  }
}
