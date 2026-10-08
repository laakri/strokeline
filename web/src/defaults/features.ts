export type VisualFeature =
  | "iconDrawing"
  | "multilineText"
  | "maxWidthWrapping"
  | "centeredText"
  | "sceneTransitions"
  | "cameraScaledText"
  | "cameraScaledStrokes"
  | "textAlignment"
  | "customLineHeight"
  | "fitText"
  | "positionAnchors"
  | "relativePlacement"
  | "layoutContainers"
  | "roughSampledGeometry"

export const features: Record<VisualFeature, boolean> = {
  iconDrawing: true,
  multilineText: true,
  maxWidthWrapping: true,
  centeredText: true,
  sceneTransitions: true,
  cameraScaledText: true,
  cameraScaledStrokes: true,
  textAlignment: true,
  customLineHeight: true,
  fitText: true,
  positionAnchors: true,
  relativePlacement: true,
  layoutContainers: true,
  roughSampledGeometry: false,
}
