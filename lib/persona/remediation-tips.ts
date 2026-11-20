/**
 * lib/persona/remediation-tips.ts
 * Mappings from Selfie Check Reason Codes to Actionable User Remediation Guidance.
 */

export interface RemediationTip {
  category: 'Lighting & Exposure' | 'Positioning & Pose' | 'PPE & Glasses' | 'Camera & Device'
  title: string
  actionStep: string
  proTip: string
}

export const REMEDIATION_TIPS_MAP: Record<string, RemediationTip> = {
  // Lighting & Exposure
  insufficient_illumination: {
    category: 'Lighting & Exposure',
    title: 'Low Lighting Detected',
    actionStep: 'Move to a brighter, well-lit room or turn on overhead lighting.',
    proTip: 'Avoid backlights or bright windows directly behind you.',
  },
  excessive_illumination: {
    category: 'Lighting & Exposure',
    title: 'Harsh Glare / Too Bright',
    actionStep: 'Step away from direct harsh sunlight or intense spotlights.',
    proTip: 'Soft diffuse lighting from the front provides the best accuracy.',
  },

  // Positioning & Pose
  face_cropped: {
    category: 'Positioning & Pose',
    title: 'Face Cropped Out of Frame',
    actionStep: 'Hold the phone further back so your entire head and shoulders fit inside the oval guide.',
    proTip: 'Keep the phone at eye level rather than looking up or down.',
  },
  face_too_far: {
    category: 'Positioning & Pose',
    title: 'Camera Too Far Away',
    actionStep: 'Move the phone closer to fill the oval guide frame.',
    proTip: 'Ensure your face takes up roughly 60% of the capture area.',
  },
  required_poses_not_found: {
    category: 'Positioning & Pose',
    title: 'Pose Position Misaligned',
    actionStep: 'Follow the on-screen arrows slowly when turning your head left or right.',
    proTip: 'Keep your head upright and move smoothly.',
  },
  pose_order_incorrect: {
    category: 'Positioning & Pose',
    title: 'Pose Sequence Interrupted',
    actionStep: 'Complete center pose first, then turn left/right as instructed on screen.',
    proTip: 'Wait for the green checkmark before turning to the next pose.',
  },

  // PPE & Glasses
  glasses: {
    category: 'PPE & Glasses',
    title: 'Glasses / Reflection Detected',
    actionStep: 'Remove eyeglasses or tilt them slightly to eliminate lens glare.',
    proTip: 'If prescription glasses are required, ensure no glare reflects from screen or lamps.',
  },
  sunglasses: {
    category: 'PPE & Glasses',
    title: 'Sunglasses Obscuring Eyes',
    actionStep: 'Remove tinted or dark sunglasses so eyes remain fully visible.',
    proTip: 'Eyes must be unobstructed for facial feature analysis.',
  },
  face_covering_detected: {
    category: 'PPE & Glasses',
    title: 'Face Mask or PPE Mask Detected',
    actionStep: 'Remove face masks, scarves, or hats covering your mouth or forehead.',
    proTip: 'Full face outline must be visible from chin to hairline.',
  },

  // Camera & Device
  portrait_not_clear: {
    category: 'Camera & Device',
    title: 'Image Blur / Out of Focus',
    actionStep: 'Wipe your front camera lens with a microfiber cloth and hold still.',
    proTip: 'Tap your face on the phone screen to force camera focus.',
  },
  insufficient_detail: {
    category: 'Camera & Device',
    title: 'Low Camera Resolution',
    actionStep: 'Ensure camera lens is clean and hold phone steadily without shaking.',
    proTip: 'Use a smartphone or device with a 720p or higher front camera.',
  },
  eyes_closed: {
    category: 'Camera & Device',
    title: 'Eyes Closed During Capture',
    actionStep: 'Keep eyes wide open and look directly into the camera lens.',
    proTip: 'Blink twice before starting, then focus directly on the front camera dot.',
  },
}

export function getRemediationTip(reasonCode?: string): RemediationTip {
  if (!reasonCode) {
    return {
      category: 'Positioning & Pose',
      title: 'General Verification Tip',
      actionStep: 'Ensure your face is well-lit, centered in the frame, and unobstructed.',
      proTip: 'Hold the phone steady at eye level.',
    }
  }

  return (
    REMEDIATION_TIPS_MAP[reasonCode] || {
      category: 'Positioning & Pose',
      title: `Remediation for ${reasonCode}`,
      actionStep: 'Please retake your selfie ensuring good lighting, clean lens, and clear pose.',
      proTip: 'Remove any hats, sunglasses, or face coverings.',
    }
  )
}
