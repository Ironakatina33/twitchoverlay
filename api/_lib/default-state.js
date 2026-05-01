const defaultState = {
  settings: {
    overlayName: "Mon Stream",
    theme: {
      fontFamily: "'Space Grotesk', sans-serif",
      primaryColor: "#64f2c8",
      accentColor: "#ff7b72",
      textColor: "#f8fbff",
      backgroundColor: "rgba(12, 15, 24, 0.35)",
    },
    layout: {
      anchor: "top-left",
      gap: 16,
      scale: 1,
    },
    widgets: {
      viewers: true,
      followers: true,
      lastFollow: true,
    },
    alerts: {
      enabled: true,
      durationMs: 5000,
    },
  },
  stats: {
    viewerCount: 0,
    followCount: 0,
    lastFollow: "-",
    lastFollowAt: null,
  },
};

module.exports = {
  defaultState,
};
