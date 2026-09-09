// Modern Gamepad Controller Service (GTA-style Controls & Haptics)

export interface ControllerActions {
  onMove: (deltaForward: number, deltaStrafe: number, sprint: boolean) => void;
  onLook: (deltaHeading: number, deltaPitch: number) => void;
  onNextStation: () => void;
  onPrevStation: () => void;
  onTogglePlay: () => void;
  onToggleMode: () => void; // Y / Triangle
  onToggleRecord: () => void; // X / Square
  onToggleFavorite: () => void; // B / Circle
  onOpenMenu: () => void; // Start / Menu
  onRandomStation: () => void; // Back / View
  onVolumeChange: (delta: number) => void; // D-pad Up/Down
}

export class GamepadManager {
  private connected: boolean = false;
  private gamepadIndex: number | null = null;
  private gamepadName: string = '';
  private rafId: number | null = null;
  private actions: ControllerActions | null = null;
  
  // Debounce button presses
  private buttonStates: boolean[] = [];
  private lastDpadTime: number = 0;
  private lastBumperTime: number = 0;

  // Deadzone
  private readonly DEADZONE = 0.15;

  public init(actions: ControllerActions) {
    this.actions = actions;

    window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
      this.connected = true;
      this.gamepadIndex = e.gamepad.index;
      this.gamepadName = e.gamepad.id;
      this.vibrate(100, 0.4, 0.2);
      this.startLoop();
    });

    window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
      if (this.gamepadIndex === e.gamepad.index) {
        this.connected = false;
        this.gamepadIndex = null;
        this.gamepadName = '';
        this.stopLoop();
      }
    });

    // Initial check if gamepad is already plugged in
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this.connected = true;
        this.gamepadIndex = i;
        this.gamepadName = gamepads[i]!.id;
        this.startLoop();
        break;
      }
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getName(): string {
    return this.gamepadName;
  }

  public vibrate(durationMs = 120, strongMagnitude = 0.5, weakMagnitude = 0.3) {
    if (this.gamepadIndex === null) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.gamepadIndex];
    if (gp && 'vibrationActuator' in gp && gp.vibrationActuator) {
      try {
        (gp.vibrationActuator as any).playEffect('dual-rumble', {
          startDelay: 0,
          duration: durationMs,
          weakMagnitude,
          strongMagnitude
        });
      } catch {
        // Haptics unsupported
      }
    }
  }

  private startLoop() {
    if (this.rafId !== null) return;

    const loop = () => {
      this.poll();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private stopLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private poll() {
    if (this.gamepadIndex === null || !this.actions) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.gamepadIndex];
    if (!gp) return;

    const now = performance.now();

    // 1. Left Stick: Movement (GTA style Left Stick X / Y)
    let lx = gp.axes[0] || 0;
    let ly = gp.axes[1] || 0;

    if (Math.abs(lx) < this.DEADZONE) lx = 0;
    if (Math.abs(ly) < this.DEADZONE) ly = 0;

    // Trigger walk / RT acceleration (GTA style RT accelerates / walks forward)
    const rt = gp.buttons[7]?.value || 0;
    const lt = gp.buttons[6]?.value || 0;

    // A Button (Button 0) = GTA Sprint / Tap to run
    const btnA = gp.buttons[0]?.pressed || false;
    const sprint = btnA || rt > 0.5;

    let forward = -ly;
    let strafe = lx;

    // If RT is held, add forward drive
    if (rt > 0.1) forward += rt * 0.8;
    if (lt > 0.1) forward -= lt * 0.8;

    if (Math.abs(forward) > 0.05 || Math.abs(strafe) > 0.05) {
      this.actions.onMove(forward, strafe, sprint);
    }

    // 2. Right Stick: Camera Look (GTA style Right Stick X / Y)
    let rx = gp.axes[2] || 0;
    let ry = gp.axes[3] || 0;
    if (Math.abs(rx) < this.DEADZONE) rx = 0;
    if (Math.abs(ry) < this.DEADZONE) ry = 0;

    if (Math.abs(rx) > 0.05 || Math.abs(ry) > 0.05) {
      this.actions.onLook(rx * 3.5, -ry * 2.5);
    }

    // 3. LB (Button 4) / RB (Button 5): Radio Station Switcher (GTA style Radio Wheel)
    const btnLB = gp.buttons[4]?.pressed || false;
    const btnRB = gp.buttons[5]?.pressed || false;

    if (now - this.lastBumperTime > 300) {
      if (btnRB) {
        this.vibrate(60, 0.4, 0.2);
        this.actions.onNextStation();
        this.lastBumperTime = now;
      } else if (btnLB) {
        this.vibrate(60, 0.4, 0.2);
        this.actions.onPrevStation();
        this.lastBumperTime = now;
      }
    }

    // 4. Face Buttons (One-shot edge triggering)
    // Y (Button 3): Enter / Exit Street Mode (like entering vehicle in GTA)
    if (gp.buttons[3]?.pressed && !this.buttonStates[3]) {
      this.vibrate(80, 0.3, 0.2);
      this.actions.onToggleMode();
    }

    // X (Button 2): Audio Record / Capture clip
    if (gp.buttons[2]?.pressed && !this.buttonStates[2]) {
      this.vibrate(150, 0.6, 0.4);
      this.actions.onToggleRecord();
    }

    // B (Button 1): Favorite toggle / Back
    if (gp.buttons[1]?.pressed && !this.buttonStates[1]) {
      this.vibrate(70, 0.3, 0.3);
      this.actions.onToggleFavorite();
    }

    // Start / Menu (Button 9): Open Search Palette (GTA pause map)
    if (gp.buttons[9]?.pressed && !this.buttonStates[9]) {
      this.actions.onOpenMenu();
    }

    // Select / Back (Button 8): Random station / Surprise me
    if (gp.buttons[8]?.pressed && !this.buttonStates[8]) {
      this.actions.onRandomStation();
    }

    // 5. D-Pad:
    // Left (14) / Right (15): Prev / Next station
    // Up (12) / Down (13): Volume Up / Down
    if (now - this.lastDpadTime > 200) {
      if (gp.buttons[14]?.pressed) {
        this.actions.onPrevStation();
        this.lastDpadTime = now;
      } else if (gp.buttons[15]?.pressed) {
        this.actions.onNextStation();
        this.lastDpadTime = now;
      } else if (gp.buttons[12]?.pressed) {
        this.actions.onVolumeChange(0.08);
        this.lastDpadTime = now;
      } else if (gp.buttons[13]?.pressed) {
        this.actions.onVolumeChange(-0.08);
        this.lastDpadTime = now;
      }
    }

    // Update button states
    for (let i = 0; i < gp.buttons.length; i++) {
      this.buttonStates[i] = gp.buttons[i]?.pressed || false;
    }
  }

  public destroy() {
    this.stopLoop();
  }
}

export const gamepadManager = new GamepadManager();
