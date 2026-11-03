import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let outputPath = CommandLine.arguments.dropFirst().first ?? "public/assets/storefronts/buy-sell-facade-green-crt.png"
let width = 366
let height = 333
let colourSpace = CGColorSpace(name: CGColorSpace.sRGB)!
let clear: [UInt8] = [0, 0, 0, 0]
let black: [UInt8] = [7, 11, 8, 255]
let green: [UInt8] = [57, 255, 90, 255]
var buffer = [UInt8](repeating: 0, count: width * height * 4)

func fill(_ rect: CGRect, _ colour: [UInt8]) {
  let minX = max(0, Int(rect.minX))
  let minY = max(0, Int(rect.minY))
  let maxX = min(width, Int(rect.maxX))
  let maxY = min(height, Int(rect.maxY))
  for y in minY..<maxY {
    for x in minX..<maxX {
      let offset = (y * width + x) * 4
      buffer[offset] = colour[0]
      buffer[offset + 1] = colour[1]
      buffer[offset + 2] = colour[2]
      buffer[offset + 3] = colour[3]
    }
  }
}

func frame(_ rect: CGRect, thickness: CGFloat = 2) {
  fill(rect, green)
  fill(rect.insetBy(dx: thickness, dy: thickness), black)
}

fill(CGRect(x: 0, y: 0, width: width, height: height), clear)

// Facade body and full-width roof overhang, calibrated to the approved study.
fill(CGRect(x: 8, y: 8, width: 350, height: 325), black)
frame(CGRect(x: 8, y: 8, width: 350, height: 325), thickness: 2)
frame(CGRect(x: 0, y: 8, width: 366, height: 22), thickness: 2)
fill(CGRect(x: 8, y: 30, width: 350, height: 5), green)
fill(CGRect(x: 10, y: 32, width: 346, height: 3), black)

// Sparse terminal-like architecture: blank sign, window and restrained trim.
frame(CGRect(x: 98, y: 40, width: 170, height: 38), thickness: 2)
frame(CGRect(x: 23, y: 93, width: 222, height: 190), thickness: 3)
fill(CGRect(x: 26, y: 96, width: 216, height: 184), black)
fill(CGRect(x: 20, y: 83, width: 228, height: 5), green)
fill(CGRect(x: 23, y: 286, width: 222, height: 5), green)

// Side posts and a few chunky CRT-vector facade details.
frame(CGRect(x: 8, y: 40, width: 11, height: 293), thickness: 2)
frame(CGRect(x: 347, y: 40, width: 11, height: 293), thickness: 2)
for y in stride(from: 48, through: 274, by: 34) {
  frame(CGRect(x: 11, y: y, width: 7, height: 20), thickness: 1)
  frame(CGRect(x: 348, y: y, width: 7, height: 20), thickness: 1)
}
frame(CGRect(x: 253, y: 84, width: 94, height: 6), thickness: 1)
frame(CGRect(x: 253, y: 214, width: 94, height: 8), thickness: 2)
frame(CGRect(x: 26, y: 298, width: 32, height: 11), thickness: 2)
frame(CGRect(x: 61, y: 306, width: 24, height: 8), thickness: 2)
frame(CGRect(x: 285, y: 102, width: 31, height: 9), thickness: 2)
frame(CGRect(x: 274, y: 115, width: 25, height: 8), thickness: 2)
frame(CGRect(x: 302, y: 126, width: 30, height: 9), thickness: 2)

// The door, its animated frame and foreground trim remain Phaser layers.
fill(CGRect(x: 261, y: 229, width: 64, height: 104), clear)

let provider = CGDataProvider(data: Data(buffer) as CFData)!
let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue).union(.byteOrder32Big)
guard let image = CGImage(
  width: width,
  height: height,
  bitsPerComponent: 8,
  bitsPerPixel: 32,
  bytesPerRow: width * 4,
  space: colourSpace,
  bitmapInfo: bitmapInfo,
  provider: provider,
  decode: nil,
  shouldInterpolate: false,
  intent: .defaultIntent
) else { fatalError("Unable to create facade image") }
let outputURL = URL(fileURLWithPath: outputPath)
try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
guard let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else {
  fatalError("Unable to create PNG destination")
}
CGImageDestinationAddImage(destination, image, nil)
guard CGImageDestinationFinalize(destination) else { fatalError("Unable to write facade PNG") }

guard let source = CGImageSourceCreateWithURL(outputURL as CFURL, nil),
      let writtenImage = CGImageSourceCreateImageAtIndex(source, 0, nil),
      let providerData = writtenImage.dataProvider?.data else { fatalError("Unable to validate facade PNG") }
let pixels = CFDataGetBytePtr(providerData)!
let bytesPerRow = writtenImage.bytesPerRow
func pixel(_ x: Int, _ y: Int) -> (UInt8, UInt8, UInt8, UInt8) {
  let offset = y * bytesPerRow + x * 4
  return (pixels[offset], pixels[offset + 1], pixels[offset + 2], pixels[offset + 3])
}
for y in 0..<height {
  for x in 0..<width {
    let (red, greenChannel, blue, alpha) = pixel(x, y)
    if alpha == 0 { continue }
    let validBlack = red == 7 && greenChannel == 11 && blue == 8 && alpha == 255
    let validGreen = red == 57 && greenChannel == 255 && blue == 90 && alpha == 255
    if !validBlack && !validGreen { fatalError("Unexpected facade colour \(red),\(greenChannel),\(blue),\(alpha) at \(x),\(y)") }
  }
}
for y in 229..<333 {
  for x in 261..<325 where pixel(x, y).3 != 0 {
    fatalError("Door aperture is not transparent at \(x),\(y)")
  }
}
guard pixel(100, 150) == (7, 11, 8, 255) else { fatalError("Display window is not opaque near-black") }
guard pixel(0, 0).3 == 0 else { fatalError("Exterior background is not transparent") }
print(outputURL.path)
