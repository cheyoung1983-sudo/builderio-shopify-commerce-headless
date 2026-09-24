/**
 * lib/feature-registry.ts
 * Central registry to track implemented features and prevent duplicate implementations.
 */

export class FeatureRegistry {
  // Static array of currently implemented features
  private static implementedFeatures: string[] = [
    'elevenlabs-agent',
    'shopify-cart',
    'webhook-handler',
    'admin-dashboard',
    'agent-dashboard',
    'config-dashboard',
    'tts',
    'stt',
    'realtime-stt',
    'agents',
    'speech-engine',
    'sound-effects',
    'music',
    'voice-changer',
    'voice-isolator',
    'setup-api-key'
  ];

  /**
   * Verifies if a feature is already implemented.
   * @param featureName - The name of the feature to check.
   * @returns boolean - True if the feature exists in the registry.
   */
  public static checkFeatureExists(featureName: string): boolean {
    return this.implementedFeatures.includes(featureName);
  }
}
