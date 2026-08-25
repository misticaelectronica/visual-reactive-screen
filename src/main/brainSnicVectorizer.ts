import type { BrainVectorizationOptions } from '@shared/types'
import { composeBrainContourSvg } from './brainContourSvg'
import { segmentBrainRasterWithSnic } from './brainSnicSegmentation'

export type BrainSnicVectorCandidate = {
  svg: string
  profile: 'snic-edge'
  regionCount: number
  pointCount: number
  strongEdgeRecall: number
  initialRegionCount: number
  discardedContours: number
}

export function vectorizeBrainRasterWithSnic(
  rgba: Uint8Array,
  width: number,
  height: number,
  options: BrainVectorizationOptions,
): BrainSnicVectorCandidate {
  const segmentation = segmentBrainRasterWithSnic(rgba, width, height, {
    superpixelSize: options.snicSuperpixelSize,
    compactness: options.snicCompactness,
    mergeColorThreshold: options.snicMergeColorThreshold,
    strongEdgeThreshold: options.snicStrongEdgeThreshold,
    edgeWeight: options.snicEdgeWeight,
    minimumRegionAreaRatio: options.snicMinimumRegionAreaRatio,
    maximumRegions: options.snicMaximumRegions,
  })
  const contours = composeBrainContourSvg(segmentation, width, height, {
    simplificationTolerance: options.contourSimplificationTolerance,
    curveSmoothing: options.contourCurveSmoothing,
    maximumPoints: options.contourMaximumPoints,
    minimumContourArea: width * height * options.minimumContourAreaRatio,
  })
  return {
    svg: contours.svg,
    profile: 'snic-edge',
    regionCount: segmentation.regions.length,
    pointCount: contours.pointCount,
    strongEdgeRecall: segmentation.strongEdgeRecall,
    initialRegionCount: segmentation.initialRegionCount,
    discardedContours: contours.discardedContours,
  }
}
