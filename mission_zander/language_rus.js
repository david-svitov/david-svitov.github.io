const LANG = {
    // Mission status messages
    missionReachMars:   "Достигни Марса",
    missionReturnHome:  "Вернись домой",
    missionYouDidIt:    "Ты справился!",
    missionKeepOrbit:   (remaining) => `Держи орбиту: ${remaining}`,

    // HUD readouts
    hudSpeed:     (speed) => `Скорость: ${speed} км/с\n`,
    hudDirection: (angle) => `Угол: ${angle}°\n`,
    hudFuel:      (fuel)  => `ТОПЛИВО: ${fuel} л.`,
    hudOxygen:    (o2)    => `O2: ${o2} м^3`,

    // Ending screen — titles
    endingTitleWin:     "ТЫ СПРАВИЛСЯ",
    endingTitleSun:     "ДА. СОЛНЦЕ ГОРЯЧЕЕ",
    endingTitleVenus:   "НЕ ТА ПЛАНЕТА! ЭТО ВЕНЕРА",
    endingTitleMercury: "БРО. МЕРКУРИЙ. ДАЖЕ НЕ РЯДОМ",
    endingTitleFuel:    "ТОПЛИВО КОНЧИЛОСЬ. КОМАНДА ОБРЕЧЕНА",
    endingTitleOxygen:  "КИСЛОРОД КОНЧИЛСЯ",

    // Ending screen — status line
    missionStatusSuccess: "Статус миссии: УСПЕХ",
    missionStatusFailed:  "Статус миссии: ПРОВАЛ",

    // Ending screen — stats
    endingFuel:   (fuel) => `Остаток топлива: ${fuel} литров`,
    endingOxygen: (o2)   => `Остаток O2: ${o2} м^3`,

    // Loading screen
    loadingReady: "Предполётная подготовка завершена.",
    loadingError: "Ошибка загрузки. Обновите страницу.",

    // Panel assets directory
    panelPath: "./assets/panel/rus/",
};
