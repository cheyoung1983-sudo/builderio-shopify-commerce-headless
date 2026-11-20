/**
 * lib/persona/selfie-checks.ts
 * Comprehensive registry of Persona Selfie Checks and Reason Codes.
 */

export interface PersonaSelfieCheckDefinition {
  slug: string
  name: string
  category: 'Fraud' | 'User action required' | 'Beta' | 'Quality'
  description: string
  reasons: Array<{
    code: string
    description: string
  }>
  notApplicableReasons?: Array<{
    code: string
    description: string
  }>
}

export const PERSONA_SELFIE_CHECKS: Record<string, PersonaSelfieCheckDefinition> = {
  selfie_account_comparison: {
    slug: 'selfie_account_comparison',
    name: 'Account comparison',
    category: 'Fraud',
    description: 'Compare if the selfie is inconsistent with the account portrait.',
    reasons: [
      { code: 'face_mismatch', description: 'The selfie is inconsistent with the portrait on the account.' },
      { code: 'missing_face', description: 'The selfie has no face.' },
      { code: 'no_account_selfie_present', description: 'The account has no selfie.' },
    ],
  },
  selfie_age_comparison: {
    slug: 'selfie_age_comparison',
    name: 'Age comparison',
    category: 'Fraud',
    description: 'Detect if the perceived age from the selfie is different from the reference age.',
    reasons: [
      { code: 'age_above_limit', description: 'The age range detected in the selfie is above the age limit.' },
      { code: 'age_below_limit', description: 'The age range detected in the selfie is below the age limit.' },
      { code: 'age_mismatch', description: 'The reference age falls outside of the age range detected in the selfie.' },
    ],
    notApplicableReasons: [
      { code: 'no_reference_birthdate', description: 'No reference birthdate was provided.' },
      { code: 'no_selfie_age', description: 'No perceived age was available from the selfie.' },
    ],
  },
  selfie_age_threshold_comparison: {
    slug: 'selfie_age_threshold_comparison',
    name: 'Age threshold comparison',
    category: 'Fraud',
    description: 'Detect if the perceived age from the selfie complies with min and/or max age limits.',
    reasons: [
      { code: 'age_outside_limits', description: 'The age range detected in the selfie falls outside of configured age limits.' },
      { code: 'no_selfie_age_prediction', description: 'No perceived age prediction was available from the selfie.' },
    ],
  },
  selfie_attribute_comparison: {
    slug: 'selfie_attribute_comparison',
    name: 'Attribute comparison',
    category: 'Fraud',
    description: 'Compare if the selfie is inconsistent with provided selfies.',
    reasons: [
      { code: 'face_mismatch', description: 'The selfie is inconsistent with the provided selfies.' },
      { code: 'no_selfie', description: 'The submission has no selfie.' },
    ],
  },
  selfie_face_covering_detection: {
    slug: 'selfie_face_covering_detection',
    name: 'Face covering',
    category: 'User action required',
    description: 'Detect if face was covered in the selfie.',
    reasons: [
      { code: 'face_covering_detected', description: 'The selfie contains a person with a PPE face covering.' },
    ],
  },
  selfie_glasses_detection: {
    slug: 'selfie_glasses_detection',
    name: 'Glasses',
    category: 'User action required',
    description: 'Detect if glasses are present.',
    reasons: [
      { code: 'glasses', description: 'Glasses are detected and may interfere with selfie face detection.' },
      { code: 'sunglasses', description: 'Sunglasses are detected and may interfere with selfie face detection.' },
    ],
  },
  selfie_id_comparison: {
    slug: 'selfie_id_comparison',
    name: 'Selfie-to-ID comparison',
    category: 'Fraud',
    description: 'Compare if the selfie and the face portrait in the ID are different faces.',
    reasons: [
      { code: 'face_mismatch', description: 'The selfie and the face portrait in the ID appear to be different faces.' },
      { code: 'comparison_attempt_unsuccessful', description: 'An error occurred that made the comparison fail.' },
    ],
    notApplicableReasons: [
      { code: 'no_government_id', description: 'Inquiry has no ID portrait.' },
      { code: 'no_selfie', description: 'Inquiry has no selfie.' },
    ],
  },
  selfie_image_quality_detection: {
    slug: 'selfie_image_quality_detection',
    name: 'Image quality',
    category: 'User action required',
    description: 'Detect if the submission has low image quality.',
    reasons: [
      { code: 'insufficient_detail', description: 'Camera resolution or image detail is too low.' },
      { code: 'insufficient_illumination', description: 'The submission has insufficient lighting.' },
      { code: 'excessive_illumination', description: 'The submission is excessively lit.' },
    ],
  },
  selfie_liveness_detection: {
    slug: 'selfie_liveness_detection',
    name: 'Selfie liveness',
    category: 'Fraud',
    description: 'Detect if the selfie contains a live individual, not a recording, picture, or deepfake spoof.',
    reasons: [
      { code: 'deepfake_detected', description: 'The selfie appears to be a deepfake.' },
      { code: 'gen_ai_detected', description: 'The selfie appears to be an AI generated image.' },
      { code: 'device_detected', description: 'The selfie does not appear to be a live person.' },
      { code: 'emulator_detected', description: 'The submission may have been submitted on an emulator.' },
      { code: 'replica_2d_detected', description: 'The selfie appears to be a 2D replica.' },
      { code: 'virtual_camera_detected', description: 'Virtual camera usage detected.' },
    ],
  },
  selfie_multiple_faces_detection: {
    slug: 'selfie_multiple_faces_detection',
    name: 'Multiple faces',
    category: 'Fraud',
    description: 'Detect if the selfies are different faces across poses.',
    reasons: [
      { code: 'face_conflict', description: 'The selfies appear to be different faces across poses.' },
      { code: 'multiple_faces_detected', description: 'Multiple faces detected in frame.' },
    ],
  },
  selfie_portrait_quality_detection: {
    slug: 'selfie_portrait_quality_detection',
    name: 'Portrait quality',
    category: 'User action required',
    description: 'Detect if the face portrait is clear and in focus.',
    reasons: [
      { code: 'eyes_closed', description: 'The face portrait appears to have closed eyes.' },
      { code: 'missing_face', description: 'The selfie has no face.' },
      { code: 'portrait_not_clear', description: 'The face portrait is unclear and out of focus.' },
    ],
  },
  selfie_pose_detection: {
    slug: 'selfie_pose_detection',
    name: 'Pose position',
    category: 'Fraud',
    description: 'Detect if the face in the selfies is correctly positioned across all poses.',
    reasons: [
      { code: 'center_pose_face_obscured', description: 'Center selfie face appears obscured.' },
      { code: 'face_cropped', description: 'Selfie does not capture full face.' },
      { code: 'face_too_far', description: 'Selfie captured was too small or far away.' },
      { code: 'required_poses_not_found', description: 'Incorrectly positioned in one or more poses.' },
    ],
  },
  selfie_repeat_detection: {
    slug: 'selfie_repeat_detection',
    name: 'Selfie repeat',
    category: 'Fraud',
    description: 'Detect if the selfie submission matches a selfie in another account.',
    reasons: [
      { code: 'repeat_image', description: 'Image matches a previously submitted selfie on a different account.' },
      { code: 'repeat', description: 'Selfie matches a previously submitted selfie on a different account.' },
    ],
  },
  selfie_suspicious_entity_detection: {
    slug: 'selfie_suspicious_entity_detection',
    name: 'Suspicious entity',
    category: 'Fraud',
    description: 'Detect if the selfie submission is that of a government ID.',
    reasons: [
      { code: 'suspicious_photo', description: 'The selfie submission appears to be a government ID photo.' },
    ],
  },
}

export function getSelfieCheckDetails(slug: string): PersonaSelfieCheckDefinition | null {
  return PERSONA_SELFIE_CHECKS[slug] || null
}

export function getReasonDescription(slug: string, reasonCode: string): string {
  const check = getSelfieCheckDetails(slug)
  if (!check) return reasonCode
  const reason = check.reasons.find((r) => r.code === reasonCode)
  return reason?.description || reasonCode
}
