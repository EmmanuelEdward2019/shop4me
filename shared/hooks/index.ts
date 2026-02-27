/**
 * Shop4Me Shared Hooks
 * ====================
 * React hooks that work on BOTH web (Vite) and React Native (Expo).
 *
 * Dependencies: react, @supabase/supabase-js
 * These hooks accept a Supabase client instance so they remain platform-agnostic
 * (no hardcoded import path to a specific client file).
 */

export { useOrders } from "./useOrders";
export { useWallet } from "./useWallet";
export { useOrderChat } from "./useOrderChat";
export { useUserProfile } from "./useUserProfile";
export { useUserRole } from "./useUserRole";
