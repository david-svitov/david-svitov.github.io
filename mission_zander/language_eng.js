const LANG = {
    // Mission status messages
    missionReachMars:   "Reach Mars",
    missionReturnHome:  "Return home",
    missionYouDidIt:    "You did it!",
    missionKeepOrbit:   (remaining) => `Keep the orbit: ${remaining}`,

    // HUD readouts
    hudSpeed:     (speed) => `Speed: ${speed} km/s\n`,
    hudDirection: (angle) => `Direction: ${angle}°\n`,
    hudFuel:      (fuel)  => `FUEL: ${fuel} liters`,
    hudOxygen:    (o2)    => `O2: ${o2} m^3`,

    // Ending screen — titles
    endingTitleWin:     "YOU DID IT",
    endingTitleSun:     "YES. SUN IS HOT",
    endingTitleVenus:   "WRONG PLANET! IT IS VENUS",
    endingTitleMercury: "BRUH. MERCURY. NOT EVEN CLOSE",
    endingTitleFuel:    "FUEL IS EXHAUSTED. YOU ARE DOOMED",
    endingTitleOxygen:  "OXYGEN IS DEPLETED",

    // Ending screen — status line
    missionStatusSuccess: "Mission status: SUCCESS",
    missionStatusFailed:  "Mission status: FAILED",

    // Ending screen — stats
    endingFuel:   (fuel) => `Remaining fuel: ${fuel} liters`,
    endingOxygen: (o2)   => `Remaining O2: ${o2} m^3`,

    // Loading screen
    loadingReady: "Pre-flight procedures completed.",
    loadingError: "Error in loading. Update page.",

    // Panel assets directory
    panelPath: "./assets/panel/eng/",
};
