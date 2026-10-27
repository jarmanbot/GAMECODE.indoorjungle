// Development trial switch. Set false to restore the previous phone layout;
// desktop and keyboard controls are unaffected either way.
export const PHONE_HYBRID_CONTROLS = true;

// Development-only geometry overlay for the independently rendered Buy/Sell
// facade. Enable with VITE_BUY_SELL_GRAPHICS_DEBUG=true while running Vite.
export const BUY_SELL_GRAPHICS_DEBUG = import.meta.env.DEV
  && import.meta.env.VITE_BUY_SELL_GRAPHICS_DEBUG === 'true';
