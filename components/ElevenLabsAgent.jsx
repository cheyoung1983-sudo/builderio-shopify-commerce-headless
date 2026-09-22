"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Router, { useRouter } from "next/router";
import { Conversation } from "@elevenlabs/client";
import {
  Mic,
  MicOff,
  Volume2,
  PhoneOff,
  Sparkles,
  AlertCircle,
  Loader2,
  Radio,
  MessageSquare,
  FileText,
  ShieldAlert,
  RefreshCw,
  Send,
  Wifi,
  WifiOff,
  HelpCircle,
  CheckCircle2,
  Settings2,
} from "lucide-react";
import VoiceTranscriptDisplay from "./VoiceTranscriptDisplay";
import VoicePulseAvatar from "./VoicePulseAvatar";
import shopifyConfig from "../config/shopify";

const SHOP_DOMAIN = shopifyConfig.domain;
const API_URL = `https://${SHOP_DOMAIN}/api/${shopifyConfig.apiVersion || "2024-01"}/graphql.json`;
const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "agent_3101m30qaxc1f3981zq05pp86ax1";

async function storefrontFetch(query, variables = {}) {
  const token =
    process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN ||
    shopifyConfig.storefrontAccessToken ||
    "";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-Shopify-Storefront-Access-Token": token } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      console.warn(`[ElevenLabsAgent] Storefront HTTP status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error("[ElevenLabsAgent] Storefront fetch failed:", err);
    return { data: null, errors: [{ message: err?.message || "Network error" }] };
  }
}

/**
 * Utility function to acquire an ElevenLabs conversation token with
 * an exponential backoff retry strategy and explicit logging of
 * HTTP error codes and response bodies for debugging.
 *
 * @param {string} agentId - The ElevenLabs conversational agent ID
 * @param {object} [options] - Configuration options for retry and backoff
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.baseDelayMs=600] - Base delay before first retry
 * @param {number} [options.maxDelayMs=4000] - Maximum delay ceiling
 * @param {number} [options.backoffFactor=2] - Exponential multiplier
 * @returns {Promise<string>} The acquired conversation token
 */
export async function fetchVoiceTokenWithBackoff(agentId, options = {}) {
  const {
    maxRetries = 3,
    baseDelayMs = 600,
    maxDelayMs = 4000,
    backoffFactor = 2,
  } = options;

  let lastError = null;
  const totalAttempts = maxRetries + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    const isFinalAttempt = attempt === totalAttempts;

    try {
      console.log(
        `[ElevenLabsAgent:Token] [Attempt ${attempt}/${totalAttempts}] Requesting conversation token for agent: "${agentId}"...`
      );

      const response = await fetch("/api/agent/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });

      const responseStatus = response.status;
      const responseStatusText = response.statusText;
      const contentType = response.headers.get("content-type") || "";

      let responseBody = null;
      let rawText = "";

      if (contentType.includes("application/json")) {
        try {
          responseBody = await response.json();
        } catch {
          rawText = await response.text().catch(() => "");
        }
      } else {
        rawText = await response.text().catch(() => "");
      }

      if (!response.ok) {
        const rawBodyString = rawText || (responseBody ? JSON.stringify(responseBody) : "");
        const isAuth =
          responseStatus === 401 ||
          responseStatus === 403 ||
          (responseStatus === 400 &&
            (rawBodyString.includes("invalid_api_key") ||
              rawBodyString.includes("authentication_error") ||
              responseBody?.details?.type === "authentication_error" ||
              responseBody?.details?.code === "invalid_api_key"));

        let failureCategory = "Unknown Error";
        if (isAuth) {
          failureCategory = "Authentication / API Key Failure";
        } else if (responseStatus === 404) {
          failureCategory = "Invalid Agent ID or Endpoint Not Found";
        } else if (responseStatus === 429) {
          failureCategory = "Rate Limit or Concurrency Limit Exceeded";
        } else if (responseStatus >= 500) {
          failureCategory = "Upstream ElevenLabs or Server Gateway Error";
        }

        // Explicit HTTP status code and response body logging
        console.error(
          `[ElevenLabsAgent:Token:Error] [Attempt ${attempt}/${totalAttempts}] Token request rejected (HTTP ${responseStatus} ${responseStatusText}):`,
          {
            httpStatus: responseStatus,
            httpStatusText: responseStatusText,
            failureCategory,
            agentId,
            attempt,
            headers: {
              contentType,
            },
            parsedBody: responseBody,
            rawBody: rawBodyString,
            diagnostics: {
              isAuthError: isAuth,
              isNotFoundError: responseStatus === 404,
              isRateLimit: responseStatus === 429,
              isServerError: responseStatus >= 500,
            },
          }
        );

        let errorMsg =
          (typeof responseBody?.details === "object"
            ? responseBody?.details?.message || responseBody?.details?.status
            : responseBody?.details) ||
          responseBody?.error ||
          rawText ||
          `HTTP ${responseStatus} (${responseStatusText})`;

        const customError = new Error(String(errorMsg));
        customError.status = responseStatus;
        customError.statusText = responseStatusText;
        customError.responseBody = responseBody || rawText;
        customError.category = failureCategory;
        customError.isAuthError = isAuth;
        throw customError;
      }

      if (responseBody?.token) {
        console.log(
          `[ElevenLabsAgent:Token] [Attempt ${attempt} Success] Ephemeral conversation token acquired successfully:`,
          {
            agentId,
            conversationId: responseBody.conversation_id,
            tokenPrefix: responseBody.token.substring(0, 16) + "...",
          }
        );
        return responseBody.token;
      }

      throw new Error("Invalid server payload: missing 'token' string property");
    } catch (err) {
      lastError = err;

      console.warn(
        `[ElevenLabsAgent:Token] [Attempt ${attempt} Failed]:`,
        {
          message: err?.message,
          httpStatus: err?.status,
          category: err?.category,
          responseBody: err?.responseBody,
          isFinalAttempt,
        }
      );

      // Abort early without retrying for permanent non-retryable errors (e.g. invalid agent ID or invalid API key)
      if (!isFinalAttempt) {
        if (err?.status === 404) {
          console.warn("[ElevenLabsAgent:Token] Received HTTP 404 (Invalid Agent ID). Skipping remaining retries.");
          break;
        }
        if (err?.isAuthError && (String(err?.message).includes("api_key") || String(err?.message).includes("API key"))) {
          console.warn("[ElevenLabsAgent:Token] Received authentication error with invalid API key. Skipping remaining retries.");
          break;
        }

        // Exponential backoff: baseDelay * backoffFactor^(attempt - 1) + jitter
        const exponentialDelay = baseDelayMs * Math.pow(backoffFactor, attempt - 1);
        const jitter = Math.floor(Math.random() * 150);
        const backoffDelay = Math.min(maxDelayMs, Math.round(exponentialDelay + jitter));

        console.log(`[ElevenLabsAgent:Token] Backing off for ${backoffDelay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }

  throw lastError;
}

const getVoiceToken = fetchVoiceTokenWithBackoff;

export default function ElevenLabsAgent() {
  const router = useRouter();
  const [status, setStatus] = useState("disconnected"); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMicPermissionDenied, setIsMicPermissionDenied] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [activeView, setActiveView] = useState("call"); // "call" | "transcript"
  const [outputVolume, setOutputVolume] = useState(0); // 0.0 to 1.0 audio volume
  const volumeAnimFrameRef = useRef(null);
  const smoothedVolumeRef = useRef(0);
  const [isInIframe] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    }
    return false;
  });
  const [isOpen, setIsOpen] = useState(false);
  const conversationRef = useRef(null);
  const [useRelayPolicy, setUseRelayPolicy] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isSendingText, setIsSendingText] = useState(false);
  const [isSecureEnv] = useState(() => {
    if (typeof window !== "undefined") {
      return Boolean(window.isSecureContext);
    }
    return true;
  });
  const startSessionRef = useRef(null);

  const endSession = useCallback(async () => {
    try {
      if (volumeAnimFrameRef.current) {
        cancelAnimationFrame(volumeAnimFrameRef.current);
        volumeAnimFrameRef.current = null;
      }
      setOutputVolume(0);
      smoothedVolumeRef.current = 0;
      if (conversationRef.current) {
        await conversationRef.current.endSession();
        conversationRef.current = null;
      }
    } catch (e) {
      console.warn("[ElevenLabsAgent] Error ending session:", e);
    } finally {
      setStatus("disconnected");
      setIsSpeaking(false);
      setOutputVolume(0);
      smoothedVolumeRef.current = 0;
    }
  }, []);

  const startSession = useCallback(async (options = {}) => {
    const forceRelay = options.forceRelay !== undefined ? options.forceRelay : useRelayPolicy;
    try {
      setStatus("connecting");
      setErrorMessage("");
      setIsMicPermissionDenied(false);

      // Step 1: Check environment & MediaDevices support
      console.log("[ElevenLabsAgent:Init] [Step 1/5] Checking browser MediaDevices compatibility...");
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        console.warn("[ElevenLabsAgent:Init] [Step 1/5 Failed] navigator.mediaDevices.getUserMedia is unavailable in this environment.");
        setErrorMessage("Microphone access is not supported in this browser.");
        setStatus("error");
        return;
      }
      console.log("[ElevenLabsAgent:Init] [Step 1/5 Success] navigator.mediaDevices.getUserMedia is supported.");

      // Step 2: Query navigator.permissions if available
      try {
        if (navigator.permissions && typeof navigator.permissions.query === "function") {
          const perm = await navigator.permissions.query({ name: "microphone" });
          console.log("[ElevenLabsAgent:Init] [Step 2/5] Browser permission query state:", perm.state);
        } else {
          console.log("[ElevenLabsAgent:Init] [Step 2/5] navigator.permissions.query for microphone not supported; proceeding directly to hardware trigger.");
        }
      } catch (permErr) {
        console.log("[ElevenLabsAgent:Init] [Step 2/5] Permission query skipped/errored:", permErr?.message);
      }

      // Step 3: Trigger hardware permission and probe audio input stream
      console.log("[ElevenLabsAgent:Init] [Step 3/5] Requesting hardware microphone access via getUserMedia({ audio: true })...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const tracks = stream.getTracks();
        console.log(
          `[ElevenLabsAgent:Init] [Step 3/5 Success] Hardware microphone granted. Acquired ${tracks.length} audio track(s):`,
          tracks.map((t) => ({ label: t.label, enabled: t.enabled, readyState: t.readyState }))
        );
        // Release probe tracks immediately so the ElevenLabs Conversational SDK can acquire the device
        tracks.forEach((track) => track.stop());
        console.log("[ElevenLabsAgent:Init] [Step 3/5 Cleanup] Probe audio tracks stopped cleanly.");
      } catch (micErr) {
        console.warn(
          "[ElevenLabsAgent:Init] [Step 3/5 Failed] Hardware microphone trigger rejected:",
          {
            name: micErr?.name,
            message: micErr?.message,
            stack: micErr?.stack,
          }
        );
        setIsMicPermissionDenied(true);
        if (
          micErr?.name === "NotAllowedError" ||
          micErr?.name === "PermissionDeniedError" ||
          micErr?.message?.includes("Permission") ||
          micErr?.message?.includes("denied")
        ) {
          setErrorMessage(
            "Microphone access was denied. Please allow microphone permissions to speak with the agent."
          );
        } else {
          setErrorMessage(micErr?.message || "Could not access microphone.");
        }
        setStatus("error");
        return;
      }

      // Step 4: Acquire conversation token via backend proxy route with retry & fallback
      console.log("[ElevenLabsAgent:Init] [Step 4/5] Acquiring conversation token from proxy endpoint /api/agent/token...");
      let conversationToken = null;
      try {
        conversationToken = await getVoiceToken(AGENT_ID);
      } catch (tokenErr) {
        console.warn("[ElevenLabsAgent:Init] Proxy token acquisition failed, attempting direct startSession fallback:", tokenErr?.message);
      }

      console.log("[ElevenLabsAgent:Init] [Step 4/5] Initiating ElevenLabs Conversation.startSession...", {
        agentId: AGENT_ID,
        hasExplicitToken: Boolean(conversationToken),
        targetEndpoint: "wss://api.elevenlabs.io",
      });

      const sessionParams = conversationToken
        ? { conversationToken }
        : { agentId: AGENT_ID };

      const conversation = await Conversation.startSession({
        ...sessionParams,
        webRtc: {
          iceTransportPolicy: forceRelay ? "relay" : "all",
          singlePeerConnection: false,
        },
        workletPaths: {
          rawAudioProcessor: "/rawAudioProcessor.js",
          audioConcatProcessor: "/audioConcatProcessor.js",
        },
        onConnect: () => {
          console.log("[ElevenLabsAgent:Init] [Step 5/5 Success] ElevenLabs WebRTC connection established. Status: connected.");
          setStatus("connected");
          setShowDiagnostics(false);
        },
        onDisconnect: () => {
          console.log("[ElevenLabsAgent:Session] ElevenLabs session disconnected.");
          setStatus("disconnected");
          setIsSpeaking(false);
          setOutputVolume(0);
          smoothedVolumeRef.current = 0;
          conversationRef.current = null;
        },
        onError: (err) => {
          console.warn("[ElevenLabsAgent:Session] ElevenLabs runtime session error/warning:", {
            message: err?.message,
            error: err,
          });
          const isWebRtcError =
            err?.name === "ConnectionError" ||
            err?.reasonName === "WebSocket" ||
            err?.code === 1 ||
            err?.message?.includes("signal connection") ||
            err?.message?.includes("signal stream");

          if (isWebRtcError && !forceRelay) {
            console.warn("[ElevenLabsAgent:Session] WebRTC stream error during active session, auto-retrying with TURN relay...");
            setUseRelayPolicy(true);
            setTimeout(() => {
              startSessionRef.current?.({ forceRelay: true });
            }, 500);
            return;
          }

          const errorMsg =
            err?.message ||
            (err?.reasonName ? `Connection error: ${err.reasonName}` : null) ||
            (typeof err === "string" ? err : "Connection error with voice platform");
          setErrorMessage(errorMsg);
          if (isWebRtcError) {
            setShowDiagnostics(true);
          }
          setStatus("error");
          setOutputVolume(0);
          smoothedVolumeRef.current = 0;
        },
        onModeChange: ({ mode }) => {
          console.log("[ElevenLabsAgent:Session] Agent mode transitioned:", mode);
          const speaking = mode === "speaking";
          setIsSpeaking(speaking);
          if (!speaking) {
            setOutputVolume(0);
            smoothedVolumeRef.current = 0;
          }
        },
        onMessage: (payload) => {
          console.log("[ElevenLabsAgent:Session] Transcript message event received:", payload);
          if (payload && (payload.message || payload.text)) {
            const text = payload.message || payload.text;
            const role =
              payload.role === "agent" || payload.source === "ai"
                ? "agent"
                : "user";
            setTranscript((prev) => [
              ...prev,
              {
                id: payload.event_id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                sender: role,
                text,
                timestamp: new Date(),
              },
            ]);
          }
        },
        onAgentResponseCorrection: (correctionEvent) => {
          console.log("[ElevenLabsAgent:Session] Agent response correction:", correctionEvent);
          if (correctionEvent?.original_event_id && correctionEvent?.corrected_agent_response) {
            setTranscript((prev) =>
              prev.map((msg) =>
                msg.id === correctionEvent.original_event_id
                  ? { ...msg, text: correctionEvent.corrected_agent_response, isCorrected: true }
                  : msg
              )
            );
          }
        },
        clientTools: {
          search_catalog: async ({ query }) => {
            try {
              const gql = `
                query SearchProducts($query: String!) {
                  products(first: 5, query: $query) {
                    edges {
                      node {
                        id
                        title
                        handle
                        priceRange {
                          minVariantPrice { amount currencyCode }
                        }
                        variants(first: 1) {
                          edges { node { id availableForSale } }
                        }
                      }
                    }
                  }
                }
              `;
              const data = await storefrontFetch(gql, { query });
              const products = data?.data?.products?.edges?.map((e) => e.node) ?? [];

              setTranscript((prev) => [
                ...prev,
                {
                  id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  sender: "system",
                  text: `Searched catalog for "${query}" (${products.length} found)`,
                  timestamp: new Date(),
                },
              ]);

              if (products.length === 0) {
                return { found: false, message: "No products found." };
              }

              if (router && typeof router.push === "function") {
                router.push(`/search?q=${encodeURIComponent(query)}`);
              } else {
                Router.push(`/search?q=${encodeURIComponent(query)}`);
              }

              return {
                found: true,
                count: products.length,
                products: products.map((p) => ({
                  title: p.title,
                  handle: p.handle,
                  price: p.priceRange?.minVariantPrice?.amount,
                  currency: p.priceRange?.minVariantPrice?.currencyCode,
                  variantId: p.variants?.edges?.[0]?.node?.id,
                  available: p.variants?.edges?.[0]?.node?.availableForSale,
                })),
              };
            } catch (error) {
              console.error("[ElevenLabsAgent] search_catalog error:", error);
              return { found: false, error: error?.message };
            }
          },

          navigate_to_page: ({ path }) => {
            if (!path) return { success: false };
            if (router && typeof router.push === "function") {
              router.push(path);
            } else {
              Router.push(path);
            }
            return { success: true, path };
          },

          open_cart: () => {
            if (typeof document !== "undefined") {
              document.dispatchEvent(new CustomEvent("open-cart"));
            }
            return { success: true };
          },

          add_to_cart: async ({ variantId, quantity = 1 }) => {
            try {
              let cartId = typeof localStorage !== "undefined" ? localStorage.getItem("cartId") : null;

              if (!cartId) {
                const createCart = `mutation { cartCreate { cart { id } } }`;
                const res = await storefrontFetch(createCart);
                cartId = res?.data?.cartCreate?.cart?.id;
                if (cartId && typeof localStorage !== "undefined") {
                  localStorage.setItem("cartId", cartId);
                }
              }

              if (!cartId) {
                // Fallback: fire open-cart event anyway
                if (typeof document !== "undefined") {
                  document.dispatchEvent(new CustomEvent("open-cart"));
                }
                return { success: false, message: "Could not initialize cart" };
              }

              const addLine = `
                mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
                  cartLinesAdd(cartId: $cartId, lines: $lines) {
                    cart { id totalQuantity checkoutUrl }
                  }
                }
              `;

              const data = await storefrontFetch(addLine, {
                cartId,
                lines: [{ merchandiseId: variantId, quantity: Number(quantity) || 1 }],
              });

              const cart = data?.data?.cartLinesAdd?.cart;
              if (cart) {
                if (typeof document !== "undefined") {
                  document.dispatchEvent(new CustomEvent("open-cart"));
                }
                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    sender: "system",
                    text: `Added item to cart (Total in cart: ${cart.totalQuantity})`,
                    timestamp: new Date(),
                  },
                ]);
                return { success: true, totalQuantity: cart.totalQuantity };
              }

              return { success: false };
            } catch (error) {
              console.error("[ElevenLabsAgent] add_to_cart error:", error);
              return { success: false, error: error?.message };
            }
          },
        },
      });

      conversationRef.current = conversation;
      console.log("[ElevenLabsAgent:Init] conversation instance assigned to ref successfully.");
    } catch (err) {
      console.warn("[ElevenLabsAgent:Init:Error] Caught exception during Conversation.startSession initialization:", {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        details: err,
      });
      const isDenied =
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError" ||
        err?.message?.includes("Permission") ||
        err?.message?.includes("denied");
      if (isDenied) {
        setIsMicPermissionDenied(true);
        setErrorMessage(
          "Microphone access was denied. Please allow microphone permissions to speak with the agent."
        );
      } else if (err?.message?.includes("rawAudioProcessor") || err?.message?.includes("AudioWorklet") || err?.message?.includes("audio capture")) {
        setErrorMessage(
          "Audio capture worklet could not be initialized in this browser. Self-hosted worklets have been configured, please refresh or allow microphone access."
        );
      } else if (
        err?.message?.includes("signal connection") ||
        err?.message?.includes("signal stream") ||
        err?.name === "ConnectionError" ||
        err?.reasonName === "WebSocket" ||
        err?.code === 1
      ) {
        if (!forceRelay) {
          console.warn("[ElevenLabsAgent:Init] WebRTC direct signal stream failed, auto-retrying with TURN relay...");
          setErrorMessage("Direct WebRTC signal stream dropped. Retrying with TURN relay...");
          setUseRelayPolicy(true);
          setTimeout(() => {
            startSessionRef.current?.({ forceRelay: true });
          }, 450);
          return;
        }
        setErrorMessage(
          "Could not establish WebRTC signal connection with ElevenLabs. Network UDP or WebSocket signaling may be blocked by a firewall, VPN, or ad-blocker."
        );
        setShowDiagnostics(true);
      } else if (err?.status === 401 || err?.status === 403 || err?.isAuthError) {
        if (err?.message?.includes("API key ID used as API key")) {
          setErrorMessage(
            "An API key ID was configured instead of a secret API key. ElevenLabs secret keys start with 'sk_'. The app will connect using public agent access."
          );
        } else {
          setErrorMessage(
            `Voice agent authentication error: ${err.message}. Please verify that your ElevenLabs API Key starts with 'sk_' and agent permissions allow web widget access.`
          );
        }
      } else if (err?.status === 404) {
        setErrorMessage(
          `Voice agent not found (HTTP 404). Please verify that Agent ID "${AGENT_ID}" is active and published in your ElevenLabs dashboard.`
        );
      } else if (err?.message?.includes("conversation token") || err?.message?.includes("Failed to fetch")) {
        setErrorMessage(
          "Could not fetch conversation token from voice platform. Please check your network connection or try again."
        );
      } else {
        setErrorMessage(err?.message || "Failed to connect to voice agent.");
      }
      setStatus("error");
    }
  }, [router, useRelayPolicy]);

  useEffect(() => {
    startSessionRef.current = startSession;
  }, [startSession]);

  const handleSendTextMessage = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      const query = textInput.trim();
      if (!query || isSendingText) return;

      const userMsg = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: query,
        timestamp: new Date(),
      };
      setTranscript((prev) => [...prev, userMsg]);
      setTextInput("");
      setIsSendingText(true);

      try {
        const res = await fetch("/api/agent/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, first: 4 }),
        });
        const data = await res.json();
        const products = data?.products || [];

        let reply = "";
        if (products.length > 0) {
          reply =
            `Found ${products.length} matching product${products.length > 1 ? "s" : ""} in our Spokane inventory:\n` +
            products
              .map((p) => {
                const price = p.priceRange?.minVariantPrice?.amount;
                const cur = p.priceRange?.minVariantPrice?.currencyCode || "$";
                return `• ${p.title} (${price ? `${cur} ${price}` : "Inquire for quote"})`;
              })
              .join("\n") +
            `\n\nYou can search for these items in our site header or visit our Spokane repair shop!`;
        } else {
          reply = `Thanks for asking! For Spokane repair estimates, iPhone/Samsung screen replacements, or custom parts, you can search our catalog or visit Display Cell Pros in Spokane, WA.`;
        }

        setTranscript((prev) => [
          ...prev,
          {
            id: `agent-${Date.now()}`,
            sender: "agent",
            text: reply,
            timestamp: new Date(),
          },
        ]);
      } catch (err) {
        setTranscript((prev) => [
          ...prev,
          {
            id: `agent-${Date.now()}`,
            sender: "agent",
            text: "I'm temporarily unable to query live catalog items, but our Spokane store is open for walk-ins and phone inquiries!",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsSendingText(false);
      }
    },
    [textInput, isSendingText]
  );

  useEffect(() => {
    return () => {
      if (volumeAnimFrameRef.current) {
        cancelAnimationFrame(volumeAnimFrameRef.current);
        volumeAnimFrameRef.current = null;
      }
      if (conversationRef.current) {
        conversationRef.current.endSession().catch(() => {});
      }
    };
  }, []);

  // Dynamic audio output volume analysis loop: polls output volume from ElevenLabs conversation
  useEffect(() => {
    const isConn = status === "connected";
    if (!isConn) {
      smoothedVolumeRef.current = 0;
      if (volumeAnimFrameRef.current) {
        cancelAnimationFrame(volumeAnimFrameRef.current);
        volumeAnimFrameRef.current = null;
      }
      return;
    }

    let isRunning = true;
    let phase = 0;

    const tick = () => {
      if (!isRunning) return;

      let rawVolume = 0;
      if (conversationRef.current?.getOutputVolume) {
        try {
          rawVolume = conversationRef.current.getOutputVolume() || 0;
        } catch {
          rawVolume = 0;
        }
      }

      // If the agent is speaking, rawVolume reflects audio output volume (0 to 1).
      // We also blend with dynamic speech wave oscillation while speaking to ensure
      // continuous, rich pulse animation across all browsers and devices.
      let targetVolume = 0;
      if (isSpeaking) {
        phase += 0.18;
        const wave = 0.35 + 0.22 * Math.sin(phase) + 0.12 * Math.sin(phase * 2.7);
        targetVolume = rawVolume > 0.05 ? Math.min(1, rawVolume * 2.2) : wave;
      } else {
        targetVolume = 0;
        phase = 0;
      }

      const current = smoothedVolumeRef.current;
      const lerpSpeed = targetVolume > current ? 0.35 : 0.14; // Snappy attack, smooth decay
      const next = current + (targetVolume - current) * lerpSpeed;
      const clamped = Math.min(1, Math.max(0, next));
      smoothedVolumeRef.current = clamped;

      setOutputVolume(Math.round(clamped * 100) / 100);

      volumeAnimFrameRef.current = requestAnimationFrame(tick);
    };

    volumeAnimFrameRef.current = requestAnimationFrame(tick);

    return () => {
      isRunning = false;
      if (volumeAnimFrameRef.current) {
        cancelAnimationFrame(volumeAnimFrameRef.current);
        volumeAnimFrameRef.current = null;
      }
    };
  }, [status, isSpeaking]);

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  // Determine current voice agent state for user feedback visual indicator
  const agentStatus = (() => {
    if (status === "connecting") return "connecting";
    if (status === "connected") return isSpeaking ? "speaking" : "listening";
    if (status === "error") return "error";
    return "offline";
  })();

  const STATUS_CONFIG = {
    offline: {
      label: "Offline",
      badgeClass: "bg-neutral-100 text-neutral-600 border-neutral-200/90",
      dotClass: "bg-neutral-400",
      dotPing: false,
      bannerBg: "bg-neutral-50 border-neutral-200/80 text-neutral-600",
      subtext: "Voice agent offline. Click start to connect.",
      toggleBg: "bg-neutral-900 text-white hover:bg-black hover:scale-105",
      toggleStatusTag: "Offline",
      toggleBadgeClass: "bg-neutral-800 text-neutral-300 border-neutral-700/80",
    },
    connecting: {
      label: "Connecting",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200 shadow-xs",
      dotClass: "bg-amber-500",
      dotPing: true,
      bannerBg: "bg-amber-50/90 border-amber-200/80 text-amber-800",
      subtext: "Establishing voice connection...",
      toggleBg: "bg-amber-600 text-white hover:bg-amber-700 ring-4 ring-amber-500/20",
      toggleStatusTag: "Connecting",
      toggleBadgeClass: "bg-amber-500/30 text-amber-100 border-amber-400/40",
    },
    listening: {
      label: "Listening",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs",
      dotClass: "bg-emerald-500",
      dotPing: true,
      bannerBg: "bg-emerald-50/90 border-emerald-200/80 text-emerald-800",
      subtext: "Listening for your voice... speak anytime",
      toggleBg: "bg-emerald-600 text-white hover:bg-emerald-700 ring-4 ring-emerald-500/20",
      toggleStatusTag: "Listening",
      toggleBadgeClass: "bg-emerald-500/30 text-emerald-100 border-emerald-400/40",
    },
    speaking: {
      label: "Speaking",
      badgeClass: "bg-sky-50 text-sky-800 border-sky-200 shadow-xs",
      dotClass: "bg-sky-500",
      dotPing: true,
      bannerBg: "bg-sky-50/90 border-sky-200/80 text-sky-800",
      subtext: "Agent is speaking...",
      toggleBg: "bg-sky-600 text-white hover:bg-sky-700 ring-4 ring-sky-500/20",
      toggleStatusTag: "Speaking",
      toggleBadgeClass: "bg-sky-500/30 text-sky-100 border-sky-400/40",
    },
    error: {
      label: "Offline",
      badgeClass: "bg-red-50 text-red-700 border-red-200 shadow-xs",
      dotClass: "bg-red-500",
      dotPing: false,
      bannerBg: "bg-red-50/90 border-red-200/80 text-red-700",
      subtext: "Connection failed. Please retry.",
      toggleBg: "bg-red-600 text-white hover:bg-red-700 ring-4 ring-red-500/20",
      toggleStatusTag: "Offline",
      toggleBadgeClass: "bg-red-500/30 text-red-100 border-red-400/40",
    },
  };

  const currentConfig = STATUS_CONFIG[agentStatus] || STATUS_CONFIG.offline;

  return (
    <div
      id="elevenlabs-voice-agent-container"
      className="fixed bottom-20 sm:bottom-22 right-4 sm:right-6 z-40 flex flex-col items-end gap-3 pointer-events-none select-none"
    >
      {/* Expanded Control Box */}
      {isOpen && (
        <div
          id="elevenlabs-agent-card"
          className="pointer-events-auto bg-white/95 backdrop-blur-md text-neutral-900 border border-neutral-200/80 rounded-2xl shadow-2xl p-4 w-80 sm:w-96 max-w-[calc(100vw-2rem)] transition-all duration-300 transform origin-bottom-right"
        >
          {/* Header with Visual Status Indicator */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                    Voice Support Agent
                  </h3>
                  {/* Visual Status Indicator Pill */}
                  <span
                    id="elevenlabs-header-status-indicator"
                    role="status"
                    aria-live="polite"
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${currentConfig.badgeClass} transition-all duration-200`}
                  >
                    <span className="relative flex h-2 w-2">
                      {currentConfig.dotPing && (
                        <span
                          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentConfig.dotClass}`}
                        />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${currentConfig.dotClass}`}
                      />
                    </span>
                    {currentConfig.label}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {currentConfig.subtext}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-neutral-700 text-xs p-1.5 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Minimize voice widget"
            >
              ✕
            </button>
          </div>

          {/* Navigation Tabs */}
          <div
            id="elevenlabs-card-tabs"
            className="flex items-center gap-1 p-1 mt-2.5 bg-neutral-100/90 rounded-xl text-xs border border-neutral-200/70"
          >
            <button
              id="elevenlabs-tab-call"
              type="button"
              onClick={() => setActiveView("call")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg font-semibold text-xs transition-all duration-150 cursor-pointer ${
                activeView === "call"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Voice Call</span>
            </button>
            <button
              id="elevenlabs-tab-chat"
              type="button"
              onClick={() => setActiveView("chat")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg font-semibold text-xs transition-all duration-150 cursor-pointer ${
                activeView === "chat"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Text Chat</span>
            </button>
            <button
              id="elevenlabs-tab-transcript"
              type="button"
              onClick={() => setActiveView("transcript")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg font-semibold text-xs transition-all duration-150 cursor-pointer ${
                activeView === "transcript"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Transcript</span>
              {transcript.length > 0 && (
                <span
                  id="elevenlabs-transcript-tab-badge"
                  className="px-1.5 py-0.2 rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-700"
                >
                  {transcript.length}
                </span>
              )}
            </button>
          </div>

          {/* Body Content */}
          <div className="py-2.5">
            {errorMessage && (
              <div className="flex flex-col gap-2.5 p-3 mb-3 bg-red-50/95 border border-red-200 rounded-xl text-xs text-red-800 shadow-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <div className="flex-1">
                    <span className="font-semibold block text-red-900">
                      {errorMessage.includes("WebRTC") || errorMessage.includes("signal")
                        ? "WebRTC Connection Notice"
                        : "Voice Agent Error"}
                    </span>
                    <span className="leading-snug text-[11px] text-red-700">
                      {errorMessage}
                    </span>
                  </div>
                </div>

                {/* Targeted Fixes & Diagnostics Accordion / Section */}
                {(showDiagnostics || errorMessage.includes("WebRTC") || errorMessage.includes("signal") || errorMessage.includes("WebSocket")) && (
                  <div className="mt-1 pt-2 border-t border-red-200/80 space-y-2 text-[11px]">
                    <div className="font-semibold text-red-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                      <span>Targeted Connection Fixes:</span>
                    </div>
                    
                    <ul className="space-y-1.5 pl-1 text-neutral-700">
                      <li className="flex items-start gap-1.5">
                        <span className="font-bold text-red-600 shrink-0">•</span>
                        <span>
                          <strong>Network & Firewall:</strong> WebRTC requires UDP & WebSocket traffic. Disable active VPNs, NextDNS, AdGuard, or Brave Shields, or retry on unrestricted Wi-Fi.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="font-bold text-red-600 shrink-0">•</span>
                        <span>
                          <strong>Microphone Permissions:</strong> Ensure your browser has granted microphone access.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="font-bold text-red-600 shrink-0">•</span>
                        <span>
                          <strong>Browser Compatibility:</strong> Standard Chrome or Safari is recommended over embedded in-app webviews.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="font-bold text-red-600 shrink-0">•</span>
                        <span>
                          <strong>Environment:</strong> {isSecureEnv ? "✓ Secure Context (HTTPS/localhost)" : "⚠ Insecure HTTP - WebRTC requires HTTPS"}
                        </span>
                      </li>
                    </ul>

                    {/* Action Buttons for User & Developer */}
                    <div className="flex flex-wrap items-center gap-2 pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setUseRelayPolicy(true);
                          startSession({ forceRelay: true });
                        }}
                        className="flex-1 min-w-[130px] flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry with TURN Relay</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUseRelayPolicy(false);
                          startSession({ forceRelay: false });
                        }}
                        className="flex-1 min-w-[110px] flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-900 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry Standard</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveView("chat")}
                        className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Chat with Text Assistant Instead</span>
                      </button>
                    </div>
                  </div>
                )}

                {isMicPermissionDenied && isInIframe && (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.open(window.location.href, "_blank");
                      }
                    }}
                    className="mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Open in New Tab for Mic Access
                  </button>
                )}
              </div>
            )}

            {/* View 1: Text Chat Assistant View */}
            {activeView === "chat" ? (
              <div id="elevenlabs-chat-view-container" className="space-y-2.5">
                <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/70 text-xs text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold">Text Assistant Mode</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">
                    Spokane Catalog Live
                  </span>
                </div>

                <VoiceTranscriptDisplay
                  transcript={transcript}
                  isSpeaking={false}
                  isConnected={false}
                  status={status}
                  onClearTranscript={() => setTranscript([])}
                  maxHeight="max-h-56 sm:max-h-64"
                />

                <form onSubmit={handleSendTextMessage} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Ask about iPhone repairs, screens, parts..."
                    disabled={isSendingText}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={isSendingText || !textInput.trim()}
                    className="flex items-center justify-center px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Send message"
                  >
                    {isSendingText ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            ) : activeView === "transcript" ? (
              /* View 2: Transcript Dedicated View */
              <div id="elevenlabs-transcript-view-container" className="space-y-2.5">
                {/* Compact active status banner if currently in call */}
                {isConnected && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-100 border border-neutral-200/80 text-xs">
                    <div className="flex items-center gap-2">
                      <VoicePulseAvatar
                        volume={outputVolume}
                        isSpeaking={isSpeaking}
                        isListening={agentStatus === "listening"}
                        isConnected={isConnected}
                        status={agentStatus}
                        size="sm"
                        showVolumeMeter={false}
                      />
                      <span className="font-semibold text-neutral-800">
                        {isSpeaking
                          ? `Agent Speaking (${Math.round(outputVolume * 100)}%)`
                          : "Agent Listening"}
                      </span>
                    </div>
                    <button
                      id="elevenlabs-transcript-end-call-btn"
                      type="button"
                      onClick={endSession}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <PhoneOff className="w-3 h-3" />
                      <span>End Call</span>
                    </button>
                  </div>
                )}

                {/* Main Scrollable Transcript Component */}
                <VoiceTranscriptDisplay
                  transcript={transcript}
                  isSpeaking={isSpeaking}
                  isConnected={isConnected}
                  status={status}
                  onClearTranscript={() => setTranscript([])}
                  maxHeight="max-h-72 sm:max-h-80"
                />

                {!isConnected && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      id="elevenlabs-transcript-reconnect-btn"
                      type="button"
                      onClick={() => {
                        setActiveView("call");
                        startSession();
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Start New Call</span>
                    </button>
                  </div>
                )}
              </div>
            ) : isConnected ? (
              /* View 3: Active Call with Live Audio Visualizer + Real-time Scrollable Transcript */
              <div id="elevenlabs-call-active-container" className="flex flex-col space-y-3">
                {/* Visual Status Visualizer with Dynamic Audio-Volume Reactive Avatar */}
                <div
                  id="elevenlabs-active-status-visualizer"
                  className={`w-full flex flex-col items-center justify-center py-4 px-3 rounded-xl border transition-all duration-200 ${
                    agentStatus === "speaking"
                      ? "bg-sky-50/70 border-sky-200/80 shadow-xs"
                      : "bg-emerald-50/70 border-emerald-200/80 shadow-xs"
                  }`}
                >
                  {/* Dynamic Voice Pulse Avatar that changes size based on audio output volume */}
                  <VoicePulseAvatar
                    volume={outputVolume}
                    isSpeaking={isSpeaking}
                    isListening={agentStatus === "listening"}
                    isConnected={isConnected}
                    status={agentStatus}
                    size="lg"
                    showVolumeMeter={true}
                    className="my-1"
                  />

                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mt-2">
                    {agentStatus === "speaking" ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
                        <span className="text-sky-800">
                          Status: Speaking {outputVolume > 0.02 ? `(${Math.round(outputVolume * 100)}%)` : ""}
                        </span>
                      </>
                    ) : (
                      <>
                        <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                        <span className="text-emerald-800">Status: Listening</span>
                      </>
                    )}
                  </div>
                  <p
                    className={`text-[11px] text-center mt-0.5 ${
                      agentStatus === "speaking"
                        ? "text-sky-700/90"
                        : "text-emerald-700/90"
                    }`}
                  >
                    {agentStatus === "speaking"
                      ? "AI agent speaking — avatar pulse scales with voice audio volume."
                      : "Microphone active. Ask about Spokane repairs, parts, or cart."}
                  </p>
                </div>

                {/* Live Transcript Display - Scrollable in Call view */}
                <div className="space-y-1.5">
                  <VoiceTranscriptDisplay
                    transcript={transcript}
                    isSpeaking={isSpeaking}
                    isConnected={isConnected}
                    status={status}
                    onClearTranscript={() => setTranscript([])}
                    maxHeight="max-h-40 sm:max-h-48"
                  />
                  {transcript.length > 0 && (
                    <button
                      id="elevenlabs-expand-transcript-btn"
                      type="button"
                      onClick={() => setActiveView("transcript")}
                      className="w-full text-center text-[11px] font-medium text-neutral-500 hover:text-neutral-900 py-1 transition-colors cursor-pointer"
                    >
                      Open full transcript view ({transcript.length} messages) →
                    </button>
                  )}
                </div>

                <button
                  id="elevenlabs-end-call-btn"
                  onClick={endSession}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  End Voice Conversation
                </button>
              </div>
            ) : (
              /* View 4: Idle / Disconnected State */
              <div id="elevenlabs-call-idle-container" className="space-y-3">
                {/* Visual Status Indicator Banner when Offline / Connecting */}
                <div
                  id="elevenlabs-idle-status-indicator"
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 ${currentConfig.bannerBg}`}
                >
                  <VoicePulseAvatar
                    volume={0}
                    isSpeaking={false}
                    isListening={false}
                    isConnected={false}
                    status={agentStatus}
                    size="md"
                    showVolumeMeter={false}
                    className="mb-1.5"
                  />
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="relative flex h-2 w-2">
                      {currentConfig.dotPing && (
                        <span
                          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentConfig.dotClass}`}
                        />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${currentConfig.dotClass}`}
                      />
                    </span>
                    <span>Status: {currentConfig.label}</span>
                  </div>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {currentConfig.subtext}
                  </p>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed">
                  Talk directly with our live AI Specialist to find replacement parts, get Spokane repair pricing, or manage your cart hands-free.
                </p>

                {/* History Notification if transcript exists */}
                {transcript.length > 0 && (
                  <div
                    id="elevenlabs-saved-transcript-alert"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs"
                  >
                    <div className="flex items-center gap-1.5 text-neutral-700 font-medium">
                      <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{transcript.length} transcript messages saved</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveView("transcript")}
                      className="text-[11px] font-semibold text-neutral-900 hover:underline cursor-pointer"
                    >
                      View →
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    id="elevenlabs-start-call-btn"
                    onClick={() => startSession()}
                    disabled={isConnecting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                        Connecting to Voice Agent...
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-emerald-400" />
                        Start Voice Call
                      </>
                    )}
                  </button>

                  <button
                    id="elevenlabs-switch-text-btn"
                    type="button"
                    onClick={() => setActiveView("chat")}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Prefer text? Chat with Assistant</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toggle Button with Real-Time Visual Status Indicator */}
      <button
        id="elevenlabs-agent-toggle-btn"
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
        aria-label={`Voice Agent - Status: ${currentConfig.label}`}
        className={`pointer-events-auto group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-full shadow-xl backdrop-blur-sm transition-all duration-200 cursor-pointer ${currentConfig.toggleBg}`}
      >
        <span className="relative flex items-center justify-center">
          {agentStatus === "speaking" ? (
            <span
              className="relative flex items-center justify-center transition-transform duration-75"
              style={{ transform: `scale(${1 + outputVolume * 0.35})` }}
            >
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60"
                style={{ transform: `scale(${1 + outputVolume * 0.7})` }}
              />
              <Volume2 className="relative w-4 h-4 text-white" />
            </span>
          ) : agentStatus === "listening" ? (
            <span className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/40" />
              <Mic className="relative w-4 h-4 text-white" />
            </span>
          ) : agentStatus === "connecting" ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Mic className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          )}
        </span>

        <span className="text-xs font-semibold tracking-wide">
          Voice Agent
        </span>

        {transcript.length > 0 && !isOpen && (
          <span
            id="elevenlabs-toggle-transcript-count"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-white border border-white/30"
            title={`${transcript.length} transcript messages`}
          >
            <MessageSquare className="w-2.5 h-2.5" />
            <span>{transcript.length}</span>
          </span>
        )}

        {/* Visual Status Indicator Pill on Toggle Button */}
        <span
          id="elevenlabs-toggle-status-indicator"
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${currentConfig.toggleBadgeClass}`}
        >
          {isSpeaking ? (
            <span
              className="inline-block rounded-full bg-white transition-transform duration-75"
              style={{
                width: "6px",
                height: "6px",
                transform: `scale(${1 + outputVolume * 1.1})`,
              }}
            />
          ) : (
            <span className="relative flex h-1.5 w-1.5">
              {currentConfig.dotPing && (
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentConfig.dotClass}`}
                />
              )}
              <span
                className={`relative inline-flex rounded-full h-1.5 w-1.5 ${currentConfig.dotClass}`}
              />
            </span>
          )}
          <span>{currentConfig.label}</span>
          {isSpeaking && outputVolume > 0.05 && (
            <span className="font-mono text-[9px] opacity-90">{Math.round(outputVolume * 100)}%</span>
          )}
        </span>
      </button>
    </div>
  );
}
