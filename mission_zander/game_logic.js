let { init, Sprite, GameLoop, Vector, Text, Button, imageAssets, initPointer, initKeys, keyPressed, load } = kontra;
let { canvas } = init('game');

initPointer();
initKeys();

const loadingOverlay = document.getElementById('loadingOverlay');
const loadingStatus = document.getElementById('loadingStatus');
const startButton = document.getElementById('startButton');

const endingOverlay = document.getElementById('endingOverlay');
const endingImage = document.getElementById('endingImage');
const endingMissionStatus = document.getElementById('endingMissionStatus');
const endingFuel = document.getElementById('endingFuel');
const endingOxygen = document.getElementById('endingOxygen');
const retryButton = document.getElementById('retryButton');
const endingTitle = document.getElementById('endingTitle');

retryButton.addEventListener('click', () => {
    sessionStorage.setItem('skipIntro', 'true');
    location.reload();
});

const skipIntro = sessionStorage.getItem('skipIntro');

if (skipIntro === 'true') {
    sessionStorage.removeItem('skipIntro');
    loadingOverlay.classList.add('hidden');
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let screen_size = Math.max(canvas.width, canvas.height);

let G = 1.0;
let dt = 0.01;

let ship_trail = [];
let max_trail_length = 2000;
let max_ship_fuel = 600;
let ship_fuel = max_ship_fuel;
let max_ship_oxygen = 500;
let ship_oxygen = max_ship_oxygen;
let max_ship_speed = 7;
let mission_stage = 0;
let on_orbit_count = 0;

let max_bar_width = 0;
let fuel_bar = Sprite({
    x: 300,
    y: 100,
    anchor: {x: 0.0, y: 0.5},
    width: 20,
    height: 40,
    color: 'red'
});
let oxygen_bar = Sprite({
    x: 300,
    y: 200,
    anchor: {x: 0.0, y: 0.5},
    width: 20,
    height: 40,
    color: 'blue'
});

function calculateVelocity(central_M, central_position, planet_position) {
    let eps = 8;
    let r = Vector(planet_position.x - central_position.x, planet_position.y - central_position.y);
    let dist = r.length();
    let rHat = r.normalize();
    let tangent = Vector(-rHat.y, rHat.x);

    let v = Math.sqrt(
        G * central_M * dist * dist / Math.pow(dist * dist + eps * eps, 1.5)
    );

    return tangent.scale(v);
}

function computeAcceleration(i, positions) {
    let acceleration = Vector(0, 0);
    let eps = 8;

    for (let j = 0; j < positions.length; j++) {
        if (i === j) continue;

        let r = Vector(positions[j].x - positions[i].x, positions[j].y - positions[i].y);
        let d2 = r.x * r.x + r.y * r.y + eps * eps;
        let d3 = d2 * Math.sqrt(d2);

        let factor = G * planets_properties[j].mass / d3;
        acceleration = acceleration.add(r.scale(factor));
    }

    return acceleration;
}

function rotateVector(v, angle) {
    let cos = Math.cos(angle);
    let sin = Math.sin(angle);

    return Vector(
        v.x * cos - v.y * sin,
        v.x * sin + v.y * cos
    );
}

function distance(v1, v2) {
    let dx = v1.x - v2.x;
    let dy = v1.y - v2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function velocityAngleDeg(v) {
    let angle = Math.atan2(v.y, v.x) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    return angle;
}

function drawShipTrail(ctx, trail) {
    if (trail.length < 2) return;
    for (let i = 1; i < trail.length; i++) {
        let p1 = trail[i - 1];
        let p2 = trail[i];

        let t = i / (trail.length - 1);

        let r = Math.round(160 + 95 * t);
        let g = Math.round(160 + 95 * t);
        let b = Math.round(160 - 160 * t);

        let alpha = 0.05 + 0.95 * t;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function polarToScreen(center, radius, angle_deg) {
    let angle_rad = angle_deg * Math.PI / 180;

    return Vector(
        center.x + radius * Math.cos(angle_rad),
        center.y + radius * Math.sin(angle_rad)
    );
}

function showEnding(resultType) {
    if (resultType === "win") {
        imagePath = "assets/endings/win.png";
        missionText = LANG.missionStatusSuccess;
        endingTitle.textContent = LANG.endingTitleWin;
    } else if (resultType === "sun") {
        imagePath = "assets/endings/sun.png";
        missionText = LANG.missionStatusFailed;
        endingTitle.textContent = LANG.endingTitleSun;
    } else if (resultType === "venus") {
        imagePath = "assets/endings/wrong.png";
        missionText = LANG.missionStatusFailed;
        endingTitle.textContent = LANG.endingTitleVenus;
    } else if (resultType === "mercury") {
        imagePath = "assets/endings/wrong.png";
        missionText = LANG.missionStatusFailed;
        endingTitle.textContent = LANG.endingTitleMercury;
    } else {
        imagePath = "assets/endings/loose.png";
        missionText = LANG.missionStatusFailed;
        if (ship_fuel <= 0) endingTitle.textContent = LANG.endingTitleFuel;
        else if (ship_oxygen <= 0) endingTitle.textContent = LANG.endingTitleOxygen;
    }

    endingImage.src = imagePath;
    endingMissionStatus.textContent = missionText;
    endingFuel.textContent = LANG.endingFuel(ship_fuel.toFixed(0));
    endingOxygen.textContent = LANG.endingOxygen(ship_oxygen.toFixed(0));

    loop.stop();
    endingOverlay.classList.remove('hidden');
}

let ship_fuel_text = Text({
    text: '',
    font: '18px Arial',
    color: 'white',
    strokeColor: 'black',
    lineWidth: 4,
    x: screen_size * 0.05,
    y: canvas.height - screen_size * 0.1,
    textAlign: 'left'
});
let ship_oxygen_text = Text({
    text: '',
    font: '18px Arial',
    color: 'white',
    strokeColor: 'black',
    lineWidth: 4,
    x: screen_size * 0.05,
    y: canvas.height - screen_size * 0.1,
    textAlign: 'left'
});

let ship_hud = Text({
    text: '',
    font: '18px Arial',
    color: 'white',
    strokeColor: 'black',
    lineWidth: 4,
    x: screen_size * 0.05,
    y: canvas.height - screen_size * 0.1,
    textAlign: 'left'
});

let mission_status = Text({
    text: LANG.missionReachMars,
    font: '18px Arial',
    color: 'white',
    strokeColor: 'black',
    lineWidth: 4,
    x: canvas.width / 2,
    y: screen_size * 0.1,
    textAlign: 'left'
});

let target_sprite;
let ship_orientation;
let panel_status;
let panel_screen;
let panel_buttons;
let left_button;
let right_button;
let thrust_button;
let reverse_button;
let fly_direction_flag = "none";
let last_to_earth_distance = 0;
let going_away_count = 100;

let sun_position = Vector(canvas.width / 2, canvas.height / 2);
let earth_position = polarToScreen(sun_position, screen_size * 0.15, 110);

let planets = [];
let planets_properties = [
    {
        path: "assets/mercury.png",
        position: polarToScreen(sun_position, screen_size * 0.05, 330),
        area: screen_size * 0.004,
        mass: 4,
        rotation_speed: 0.001,
        velocity: Vector(0, 0),
        acceleration: Vector(0, 0),
    },
    {
        path: "assets/venus.png",
        position: polarToScreen(sun_position, screen_size * 0.10, 35),
        area: screen_size * 0.010,
        mass: 30,
        rotation_speed: 0.001,
        velocity: Vector(0, 0),
        acceleration: Vector(0, 0),
    },
    {
        path: "assets/earth.png",
        position: earth_position,
        area: screen_size * 0.012,
        mass: 40,
        rotation_speed: 0.005,
        velocity: Vector(0, 0),
        acceleration: Vector(0, 0),
    },
    {
        path: "assets/moon.png",
        position: polarToScreen(earth_position, screen_size * 0.012, 40),
        area: screen_size * 0.003,
        mass: 0.01,
        rotation_speed: 0.001,
        velocity: Vector(0, 0),
        acceleration: Vector(0, 0),
    },
    {
        path: "assets/mars.png",
        position: polarToScreen(sun_position, screen_size * 0.25, 135),
        area: screen_size * 0.006,
        mass: 10,
        rotation_speed: 0.001,
        velocity: Vector(0, 0),
        acceleration: Vector(0, 0),
    },
    {
        path: "assets/sun.png",
        position: sun_position,
        area: screen_size * 0.05,
        mass: 4000,
        rotation_speed: 0.0001,
        velocity: Vector(0, 0),
        acceleration: Vector(0, 0),
    },
    {
        path: "assets/ship.png",
        position: Vector(0, 0),
        area: screen_size * 0.004,
        mass: 0.000001,
        rotation_speed: 0,
        velocity: Vector(0, 0),
        acceleration: Vector(0, 0),
    }
];

let planet_indices = {
    mercury: 0,
    venus: 1,
    earth: 2,
    moon: 3,
    mars: 4,
    sun: 5,
    ship: 6,
};

planets_properties[planet_indices.mercury].velocity = calculateVelocity(
    planets_properties[planet_indices.sun].mass,
    planets_properties[planet_indices.sun].position,
    planets_properties[planet_indices.mercury].position
);

planets_properties[planet_indices.venus].velocity = calculateVelocity(
    planets_properties[planet_indices.sun].mass,
    planets_properties[planet_indices.sun].position,
    planets_properties[planet_indices.venus].position
);

planets_properties[planet_indices.earth].velocity = calculateVelocity(
    planets_properties[planet_indices.sun].mass,
    planets_properties[planet_indices.sun].position,
    planets_properties[planet_indices.earth].position
);

planets_properties[planet_indices.moon].velocity =
    planets_properties[planet_indices.earth].velocity.add(
        calculateVelocity(
            planets_properties[planet_indices.earth].mass,
            planets_properties[planet_indices.earth].position,
            planets_properties[planet_indices.moon].position
        ).scale(0.8)
    );

planets_properties[planet_indices.mars].velocity = calculateVelocity(
    planets_properties[planet_indices.sun].mass,
    planets_properties[planet_indices.sun].position,
    planets_properties[planet_indices.mars].position
);

let earth = planets_properties[planet_indices.earth];
let shipOrbitRadius = canvas.width * 0.01;

planets_properties[planet_indices.ship].position = Vector(
    earth.position.x + shipOrbitRadius,
    earth.position.y
);

planets_properties[planet_indices.ship].velocity =
    planets_properties[planet_indices.earth].velocity.add(
        calculateVelocity(
            planets_properties[planet_indices.earth].mass,
            planets_properties[planet_indices.earth].position,
            planets_properties[planet_indices.ship].position
        )
    );

function setSunCompensationVelocity() {
    let sun_idx = planet_indices.sun;
    let total_momentum = Vector(0, 0);

    for (let i = 0; i < planets_properties.length; i++) {
        if (i === sun_idx) continue;
        let m = planets_properties[i].mass;
        let v = planets_properties[i].velocity;
        total_momentum = total_momentum.add(Vector(m * v.x, m * v.y));
    }

    planets_properties[sun_idx].velocity = Vector(
        -total_momentum.x / planets_properties[sun_idx].mass,
        -total_momentum.y / planets_properties[sun_idx].mass
    );
}

setSunCompensationVelocity();

function engineControl(direction) {
    let ship = planets_properties[planet_indices.ship];
    if (ship_fuel > 0 && ship_oxygen > 0) {
        if (direction === "left") {
            ship.velocity = rotateVector(ship.velocity, -0.01);
            ship_fuel -= 1;
        } else if (direction === "right") {
            ship.velocity = rotateVector(ship.velocity, 0.01);
            ship_fuel -= 1;
        }

        if (direction === "up") {
            if (ship.velocity.length() < max_ship_speed) {
                ship.velocity = ship.velocity.scale(1.01);
                ship_fuel -= 1;
            }
        } else if (direction === "down") {
            ship.velocity = ship.velocity.scale(0.99);
            ship_fuel -= 1;
        }
    }
    if (ship_fuel < 0) ship_fuel = 0;
}

let loop = GameLoop({
    update() {
        // Ship control
        if (fly_direction_flag != "none") {
            engineControl(fly_direction_flag);
        } else {
            if (keyPressed('arrowleft')) {
                engineControl("left");
            } else if (keyPressed('arrowright')) {
                engineControl("right");
            }
            if (keyPressed('arrowup')) {
                engineControl("up");
            } else if (keyPressed('arrowdown')) {
                engineControl("down");
            }
        }
        if (ship_oxygen > 0) ship_oxygen -= 0.05;

        // Game status update
        let mars_orbit = screen_size * 0.01;
        let earth_orbit = screen_size * 0.024;
        switch (mission_stage) {
            case 0:
                target_sprite.x = planets[planet_indices.mars].x;
                target_sprite.y = planets[planet_indices.mars].y;
                target_sprite.rotation += 0.01;

                if (distance(planets[planet_indices.ship], planets[planet_indices.mars]) < mars_orbit) {
                    on_orbit_count = 0;
                    mission_stage += 1;
                }
                break;
            case 1:
                target_sprite.x = planets[planet_indices.mars].x;
                target_sprite.y = planets[planet_indices.mars].y;
                target_sprite.rotation -= 0.02;

                mission_status.text = LANG.missionKeepOrbit((10 - on_orbit_count).toFixed(1));
                if (distance(planets[planet_indices.ship], planets[planet_indices.mars]) < mars_orbit) {
                    on_orbit_count += 0.01;
                    if (on_orbit_count > 10) {
                        //target_sprite.scaleX = planets[planet_indices.earth].scaleX * 4;
                        //target_sprite.scaleY = planets[planet_indices.earth].scaleY * 4;
                        mission_status.text = LANG.missionReturnHome;
                        mission_stage += 1;
                    }
                } else {
                    mission_status.text = LANG.missionReachMars;
                    on_orbit_count = 0;
                    mission_stage -= 1;
                }
                break;
            case 2:
                target_sprite.x = planets[planet_indices.earth].x;
                target_sprite.y = planets[planet_indices.earth].y;
                target_sprite.rotation += 0.01;

                if (distance(planets[planet_indices.ship], planets[planet_indices.earth]) < earth_orbit) {
                    on_orbit_count = 0;
                    mission_stage += 1;
                }
                break;
            case 3:
                target_sprite.x = planets[planet_indices.earth].x;
                target_sprite.y = planets[planet_indices.earth].y;
                target_sprite.rotation -= 0.02;

                mission_status.text = LANG.missionKeepOrbit((10 - on_orbit_count).toFixed(1));
                if (distance(planets[planet_indices.ship], planets[planet_indices.earth]) < earth_orbit) {
                    on_orbit_count += 0.01;
                    if (on_orbit_count > 10) {
                        mission_status.text = LANG.missionYouDidIt;
                        mission_stage += 1;
                        showEnding("win");
                    }
                } else {
                    mission_status.text = LANG.missionReturnHome;
                    on_orbit_count = 0;
                    mission_stage -= 1;
                }
                break;
        }

        if (ship_oxygen <= 0) {
            showEnding("loose");
        }

        if (ship_fuel <= 0) {
            if (mission_stage === 2) {
                let to_earth_distance = distance(planets[planet_indices.ship], planets[planet_indices.earth]);
                if (to_earth_distance >= last_to_earth_distance) {
                    going_away_count -= 1;
                    if (going_away_count < 0) showEnding("loose");
                }
                last_to_earth_distance = to_earth_distance;
            } else if (mission_stage === 3) {
            } else if (mission_stage < 2) {
                showEnding("loose");
            }
        }

        if (distance(planets[planet_indices.ship], planets[planet_indices.sun]) < screen_size * 0.04) {
            showEnding("sun");
        }
        if (distance(planets[planet_indices.ship], planets[planet_indices.venus]) < screen_size * 0.01) {
            showEnding("venus");
        }
        if (distance(planets[planet_indices.ship], planets[planet_indices.mercury]) < screen_size * 0.004) {
            showEnding("mercury");
        }

        // Planets positions update
        for (let step = 0; step < 5; step++) {
            let updated_positions = [];
            for (let i = 0; i < planets.length; i++) {
                let velocity = planets_properties[i].velocity;
                let acceleration = planets_properties[i].acceleration;
                let new_pos = Vector(
                    planets[i].x + velocity.x * dt + 0.5 * acceleration.x * dt * dt,
                    planets[i].y + velocity.y * dt + 0.5 * acceleration.y * dt * dt
                );
                updated_positions.push(new_pos);
            }

            for (let i = 0; i < updated_positions.length; i++) {
                planets[i].x = updated_positions[i].x;
                planets[i].y = updated_positions[i].y;
                planets[i].rotation += planets_properties[i].rotation_speed;
            }

            let positions = planets.map(p => Vector(p.x, p.y));
            for (let i = 0; i < planets.length; i++) {
                let velocity = planets_properties[i].velocity;
                let old_acceleration = planets_properties[i].acceleration;
                let new_acceleration = computeAcceleration(i, positions);

                planets_properties[i].velocity = Vector(
                    velocity.x + 0.5 * (old_acceleration.x + new_acceleration.x) * dt,
                    velocity.y + 0.5 * (old_acceleration.y + new_acceleration.y) * dt
                );
                planets_properties[i].acceleration = new_acceleration;
            }
        }

        ship_trail.push({ x: planets[planet_indices.ship].x, y: planets[planet_indices.ship].y });
        if (ship_trail.length > max_trail_length) {
            ship_trail.shift();
        }

        let ship = planets_properties[planet_indices.ship];
        let speed = ship.velocity.length();
        let angle = velocityAngleDeg(ship.velocity);
        ship_hud.text =
            LANG.hudSpeed((speed * 1.5).toFixed(3)) + // 1.5 - is magic constant for realistic looking speed
            LANG.hudDirection(angle.toFixed(1));
        ship_fuel_text.text = LANG.hudFuel(ship_fuel);
        ship_oxygen_text.text = LANG.hudOxygen(ship_oxygen.toFixed(0));

        fuel_bar.width = max_bar_width * (ship_fuel / max_ship_fuel);
        oxygen_bar.width = max_bar_width * (ship_oxygen / max_ship_oxygen);
        ship_orientation.rotation = angle * Math.PI / 180;
    },

    render() {
        let ctx = canvas.getContext('2d');
        drawShipTrail(ctx, ship_trail);

        for (let i = 0; i < planets.length; ++i) {
            planets[i].render();
        }

        if (panel_status) panel_status.render();
        if (panel_screen) panel_screen.render();
        if (panel_buttons) panel_buttons.render();
        if (left_button) left_button.render();
        if (right_button) right_button.render();
        if (thrust_button) thrust_button.render();
        if (reverse_button) reverse_button.render();
        if (ship_orientation) ship_orientation.render();
        if (target_sprite) target_sprite.render();

        ship_hud.render();
        mission_status.render();
        fuel_bar.render();
        oxygen_bar.render();
        ship_fuel_text.render();
        ship_oxygen_text.render();
    }
});

let image_files = [];
for (let i = 0; i < planets_properties.length; ++i) {
    image_files.push(planets_properties[i]["path"]);
}
image_files.push("./assets/panel/panel_status.png");
image_files.push("./assets/panel/panel_screen_bars.png");
image_files.push("./assets/panel/panel.png");
image_files.push(LANG.panelPath + "left.png");
image_files.push(LANG.panelPath + "left_press.png");
image_files.push(LANG.panelPath + "right.png");
image_files.push(LANG.panelPath + "right_press.png");
image_files.push(LANG.panelPath + "thrust.png");
image_files.push(LANG.panelPath + "thrust_press.png");
image_files.push(LANG.panelPath + "reverse.png");
image_files.push(LANG.panelPath + "reverse_press.png");
image_files.push("./assets/panel/ship.png");
image_files.push("./assets/target.png");

load(...image_files).then((assets) => {
    for (let i = 0; i < planets_properties.length; i++) {
        let image = assets[i];

        let planet_sprite = Sprite({
            x: planets_properties[i]["position"].x,
            y: planets_properties[i]["position"].y,
            scaleX: planets_properties[i]["area"] / image.width,
            scaleY: planets_properties[i]["area"] / image.height,
            anchor: {x: 0.5, y: 0.5},
            image: image
        });
        planets.push(planet_sprite);
    }

    let positions = planets.map(p => Vector(p.x, p.y));
    for (let i = 0; i < planets.length; i++) {
        planets_properties[i].acceleration = computeAcceleration(i, positions);
    }

    target_sprite = Sprite({
        x: planets[planet_indices.mars].x,
        y: planets[planet_indices.mars].y,
        scaleX: planets[planet_indices.mars].scaleX * 6,
        scaleY: planets[planet_indices.mars].scaleY * 6,
        anchor: {x: 0.5, y: 0.5},
        image: imageAssets['./assets/target']
    });

    let panel_height = imageAssets['./assets/panel/panel'].height;
    let panel_width = imageAssets['./assets/panel/panel'].width;
    let interface_scale = screen_size / panel_width * 0.2;
    let panel_x = canvas.width - panel_width * interface_scale / 2;
    let panel_y = canvas.height - panel_height * interface_scale / 2;

    panel_buttons = Sprite({
        x: panel_x,
        y: panel_y,
        scaleX: interface_scale,
        scaleY: interface_scale,
        anchor: {x: 0.5, y: 0.5},
        image: imageAssets['./assets/panel/panel']
    });

    panel_status = Sprite({
        x: 0,
        y: panel_y - imageAssets['./assets/panel/panel_status'].height * interface_scale * 2,
        scaleX: interface_scale,
        scaleY: interface_scale,
        anchor: {x: 0, y: 0},
        image: imageAssets['./assets/panel/panel_status']
    });
    let screenW = panel_status.image.width * panel_status.scaleX;
    let screenH = panel_status.image.height * panel_status.scaleY;
    let left = panel_status.x - screenW * panel_status.anchor.x;
    let top = panel_status.y - screenH * panel_status.anchor.y;

    mission_status.x = left + screenW * 0.2;
    mission_status.y = top + screenH * 0.4;
    let fontSize = Math.max(6, Math.floor(Math.min(screenW, screenH) * 0.2));
    mission_status.font = `${fontSize}px Arial`;

    panel_screen = Sprite({
        x: 0,
        y: panel_y,
        scaleX: interface_scale,
        scaleY: interface_scale,
        anchor: {x: 0, y: 0.5},
        image: imageAssets['./assets/panel/panel_screen_bars']
    });
    screenW = panel_screen.image.width * panel_screen.scaleX;
    screenH = panel_screen.image.height * panel_screen.scaleY;
    left = panel_screen.x - screenW * panel_screen.anchor.x;
    top = panel_screen.y - screenH * panel_screen.anchor.y;

    ship_orientation = Sprite({
        x: left + screenW * 0.7,
        y: top + screenH * 0.37,
        scaleX: interface_scale * 0.35,
        scaleY: interface_scale * 0.35,
        anchor: {x: 0.5, y: 0.5},
        image: imageAssets['./assets/panel/ship']
    });

    ship_hud.x = left + screenW * 0.15;
    ship_hud.y = top + screenH * 0.2;
    fontSize = Math.max(6, Math.floor(Math.min(screenW, screenH) * 0.07));
    ship_hud.font = `${fontSize}px Arial`;

    ship_fuel_text.x = left + screenW * 0.33;
    ship_fuel_text.y = top + screenH * 0.66;
    ship_fuel_text.font = `${fontSize}px Arial`;

    ship_oxygen_text.x = left + screenW * 0.35;
    ship_oxygen_text.y = top + screenH * 0.79;
    ship_oxygen_text.font = `${fontSize}px Arial`;

    max_bar_width = screenW * 0.8;
    fuel_bar.x = left + screenW * 0.10;
    fuel_bar.y = top + screenH * 0.69;
    fuel_bar.height = screenH * 0.06;
    fuel_bar.width = max_bar_width;

    oxygen_bar.x = left + screenW * 0.10;
    oxygen_bar.y = top + screenH * 0.82;
    oxygen_bar.height = screenH * 0.06;
    oxygen_bar.width = max_bar_width;

    left_button = Button({
        x: panel_x - imageAssets[LANG.panelPath + 'left'].width * interface_scale * 0.53,
        y: panel_y - imageAssets[LANG.panelPath + 'left'].height * interface_scale * 0.8,
        anchor: {x: 0.5, y: 0.5},
        scaleX: interface_scale,
        scaleY: interface_scale,
        image: imageAssets[LANG.panelPath + 'left'],
        onDown() {
            this.image = imageAssets[LANG.panelPath + 'left_press'];
            fly_direction_flag = "left";
        },
        onUp() {
            this.image = imageAssets[LANG.panelPath + 'left'];
            fly_direction_flag = "none";
        }
    });

    right_button = Button({
        x: panel_x - imageAssets[LANG.panelPath + 'left'].width * interface_scale * 0.53,
        y: panel_y + imageAssets[LANG.panelPath + 'left'].height * interface_scale * 0.48,
        anchor: {x: 0.5, y: 0.5},
        scaleX: interface_scale,
        scaleY: interface_scale,
        image: imageAssets[LANG.panelPath + 'right'],
        onDown() {
            this.image = imageAssets[LANG.panelPath + 'right_press'];
            fly_direction_flag = "right";
        },
        onUp() {
            this.image = imageAssets[LANG.panelPath + 'right'];
            fly_direction_flag = "none";
        }
    });

    thrust_button = Button({
        x: panel_x + imageAssets[LANG.panelPath + 'left'].width * interface_scale * 0.53,
        y: panel_y - imageAssets[LANG.panelPath + 'left'].height * interface_scale * 0.8,
        anchor: {x: 0.5, y: 0.5},
        scaleX: interface_scale,
        scaleY: interface_scale,
        image: imageAssets[LANG.panelPath + 'thrust'],
        onDown() {
            this.image = imageAssets[LANG.panelPath + 'thrust_press'];
            fly_direction_flag = "up";
        },
        onUp() {
            this.image = imageAssets[LANG.panelPath + 'thrust'];
            fly_direction_flag = "none";
        }
    });

    reverse_button = Button({
        x: panel_x + imageAssets[LANG.panelPath + 'left'].width * interface_scale * 0.53,
        y: panel_y + imageAssets[LANG.panelPath + 'left'].height * interface_scale * 0.48,
        anchor: {x: 0.5, y: 0.5},
        scaleX: interface_scale,
        scaleY: interface_scale,
        image: imageAssets[LANG.panelPath + 'reverse'],
        onDown() {
            this.image = imageAssets[LANG.panelPath + 'reverse_press'];
            fly_direction_flag = "down";
        },
        onUp() {
            this.image = imageAssets[LANG.panelPath + 'reverse'];
            fly_direction_flag = "none";
        }
    });

    loadingStatus.textContent = LANG.loadingReady;
    startButton.style.display = 'block';

    if (skipIntro === 'true') {
        sessionStorage.removeItem('skipIntro');
        loadingOverlay.classList.add('hidden');
        loop.start();
    }

    startButton.addEventListener('click', () => {
        loadingOverlay.classList.add('hidden');
        loop.start();
    }, { once: true });
}).catch((err) => {
    console.error(err);
    loadingStatus.textContent = LANG.loadingError;
});
