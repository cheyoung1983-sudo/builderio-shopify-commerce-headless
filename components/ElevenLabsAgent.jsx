"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Router, { useRouter } from "next/router";
import { Conversation } from "@elevenlabs/client";
import { Mic, MicOff, Volume2, PhoneOff, Sparkles, AlertCircle } from "lucide-react";
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

export default function ElevenLabsAgent() {
  const router = useRouter();
  const [status, setStatus] = useState("disconnected"); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMicPermissionDenied, setIsMicPermissionDenied] = useState(false);
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

  const endSession = useCallback(async () => {
    try {
      if (conversationRef.current) {
        await conversationRef.current.endSession();
        conversationRef.current = null;
      }
    } catch (e) {
      console.warn("[ElevenLabsAgent] Error ending session:", e);
    } finally {
      setStatus("disconnected");
      setIsSpeaking(false);
    }
  }, []);

  const startSession = useCallback(async () => {
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

      // Step 4: Initiate ElevenLabs WebSocket session
      console.log("[ElevenLabsAgent:Init] [Step 4/5] Initiating ElevenLabs Conversation.startSession...", {
        agentId: AGENT_ID,
        targetEndpoint: "wss://api.elevenlabs.io",
      });

      const conversation = await Conversation.startSession({
        agentId: AGENT_ID,
        onConnect: () => {
          console.log("[ElevenLabsAgent:Init] [Step 5/5 Success] ElevenLabs WebSocket connection established. Status: connected.");
          setStatus("connected");
        },
        onDisconnect: () => {
          console.log("[ElevenLabsAgent:Session] ElevenLabs session disconnected.");
          setStatus("disconnected");
          setIsSpeaking(false);
          conversationRef.current = null;
        },
        onError: (err) => {
          console.warn("[ElevenLabsAgent:Session] ElevenLabs runtime session error/warning:", {
            message: err?.message,
            error: err,
          });
          setErrorMessage(err?.message || "Connection error");
          setStatus("error");
        },
        onModeChange: ({ mode }) => {
          console.log("[ElevenLabsAgent:Session] Agent mode transitioned:", mode);
          setIsSpeaking(mode === "speaking");
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
      } else if (err?.message?.includes("signal connection") || err?.name === "ConnectionError") {
        setErrorMessage(
          "Could not establish WebRTC signal connection with ElevenLabs. Please check network connectivity or refresh the page."
        );
      } else {
        setErrorMessage(err?.message || "Failed to connect to voice agent.");
      }
      setStatus("error");
    }
  }, [router]);

  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession().catch(() => {});
      }
    };
  }, []);

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <div
      id="elevenlabs-voice-agent-container"
      className="fixed bottom-20 sm:bottom-22 right-4 sm:right-6 z-40 flex flex-col items-end gap-3 pointer-events-none select-none"
    >
      {/* Expanded Control Box */}
      {isOpen && (
        <div
          id="elevenlabs-agent-card"
          className="pointer-events-auto bg-white/95 backdrop-blur-md text-neutral-900 border border-neutral-200/80 rounded-2xl shadow-2xl p-4 w-72 sm:w-80 transition-all duration-300 transform origin-bottom-right"
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                {isConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </>
                ) : isConnecting ? (
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 animate-pulse" />
                ) : (
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-neutral-400" />
                )}
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Voice Support Agent
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {isConnected
                    ? isSpeaking
                      ? "Agent is speaking..."
                      : "Listening to your voice..."
                    : isConnecting
                    ? "Connecting to agent..."
                    : "DisplayCellPros Concierge"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-neutral-700 text-xs p-1 rounded-md"
              aria-label="Minimize voice widget"
            >
              ✕
            </button>
          </div>

          {/* Body Content */}
          <div className="py-3">
            {errorMessage && (
              <div className="flex flex-col gap-2 p-3 mb-3 bg-red-50/90 border border-red-200/80 rounded-xl text-xs text-red-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
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

            {isConnected ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                {/* Waveform / Pulsing Sound Indicator */}
                <div className="flex items-center justify-center gap-1.5 h-10">
                  <div
                    className={`w-1.5 bg-emerald-500 rounded-full transition-all duration-150 ${
                      isSpeaking ? "h-8 animate-pulse" : "h-3"
                    }`}
                  />
                  <div
                    className={`w-1.5 bg-emerald-500 rounded-full transition-all duration-200 ${
                      isSpeaking ? "h-10 animate-pulse" : "h-4"
                    }`}
                  />
                  <div
                    className={`w-1.5 bg-emerald-500 rounded-full transition-all duration-150 ${
                      isSpeaking ? "h-6 animate-pulse" : "h-2"
                    }`}
                  />
                  <div
                    className={`w-1.5 bg-emerald-500 rounded-full transition-all duration-300 ${
                      isSpeaking ? "h-9 animate-pulse" : "h-5"
                    }`}
                  />
                  <div
                    className={`w-1.5 bg-emerald-500 rounded-full transition-all duration-150 ${
                      isSpeaking ? "h-5 animate-pulse" : "h-2"
                    }`}
                  />
                </div>
                <p className="text-xs text-center text-neutral-600 px-2">
                  {isSpeaking
                    ? "Speaking with you..."
                    : "Ask about screen repairs, Spokane dispatch, warranties, or catalog parts."}
                </p>

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
              <div className="space-y-3">
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Talk directly with our live AI Specialist to find replacement parts, get Spokane repair pricing, or manage your cart hands-free.
                </p>

                <button
                  id="elevenlabs-start-call-btn"
                  onClick={startSession}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isConnecting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      Start Voice Call
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        id="elevenlabs-agent-toggle-btn"
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
        aria-label={isConnected ? "Open Voice Agent Controls" : "Open Voice Assistant"}
        className={`pointer-events-auto group relative flex items-center gap-2.5 px-4 py-3 rounded-full shadow-xl backdrop-blur-sm transition-all duration-200 cursor-pointer ${
          isConnected
            ? "bg-emerald-600 text-white hover:bg-emerald-700 ring-4 ring-emerald-500/20"
            : isConnecting
            ? "bg-amber-600 text-white hover:bg-amber-700 ring-4 ring-amber-500/20"
            : "bg-neutral-900 text-white hover:bg-black hover:scale-105"
        }`}
      >
        <span className="relative flex items-center justify-center">
          {isConnected ? (
            <Volume2 className="w-5 h-5 text-white animate-pulse" />
          ) : isConnecting ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Mic className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
          )}
        </span>

        <span className="text-xs font-semibold tracking-wide">
          {isConnected ? "Voice Active" : isConnecting ? "Connecting..." : "Voice Assistant"}
        </span>

        {!isConnected && !isConnecting && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        )}
      </button>
    </div>
  );
}
