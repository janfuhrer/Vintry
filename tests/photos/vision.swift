// Apple's on-device text recognition (Vision, the engine behind Live Text) on label photos, for
// measuring the parser against what an iPhone reads. macOS only.
//
//   swiftc -O tests/photos/vision.swift -o /tmp/vision && /tmp/vision test-data/*.jpeg > test-data/vision.json
import Foundation
import ImageIO
import Vision

struct Line: Codable {
	let text: String
	/** the line's box in pixels of the upright photo; the smaller side is the text size */
	let width: Int
	let height: Int
	let x: Int
	let y: Int
	let confidence: Float
}
struct Photo: Codable { let file: String; let lines: [Line] }

var photos: [Photo] = []
for path in CommandLine.arguments.dropFirst() {
	let url = URL(fileURLWithPath: path)
	guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
	      let image = CGImageSourceCreateImageAtIndex(src, 0, nil) else { continue }
	let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any]
	let orientation = CGImagePropertyOrientation(rawValue: (props?[kCGImagePropertyOrientation] as? UInt32) ?? 1) ?? .up
	// orientations 5 to 8 turn the photo by 90°
	let turned = [.left, .right, .leftMirrored, .rightMirrored].contains(orientation)
	let (w, h) = turned ? (Double(image.height), Double(image.width)) : (Double(image.width), Double(image.height))
	let request = VNRecognizeTextRequest()
	request.recognitionLevel = .accurate
	request.usesLanguageCorrection = true
	request.recognitionLanguages = ["fr-FR", "de-DE", "it-IT", "es-ES", "pt-PT", "en-US"]
	try? VNImageRequestHandler(cgImage: image, orientation: orientation, options: [:]).perform([request])
	// top to bottom, as Live Text and the Shortcuts action return them
	let lines = (request.results ?? []).compactMap { obs -> Line? in
		guard let best = obs.topCandidates(1).first else { return nil }
		let b = obs.boundingBox
		return Line(text: best.string, width: Int(b.width * w), height: Int(b.height * h),
		            x: Int(b.minX * w), y: Int((1 - b.maxY) * h), confidence: best.confidence)
	}.sorted { ($0.y, $0.x) < ($1.y, $1.x) }
	photos.append(Photo(file: url.deletingPathExtension().lastPathComponent, lines: lines))
}
let enc = JSONEncoder()
enc.outputFormatting = [.prettyPrinted, .sortedKeys]
FileHandle.standardOutput.write(try! enc.encode(photos))
