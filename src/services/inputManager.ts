/**
 * Input Ownership Context Manager for TerraWave.
 * 
 * Ensures global keyboard shortcuts (e.g. W for street walk, S for random station,
 * Space for play/pause, Arrows for station browsing) do NOT conflict with:
 * - Active mini-games (WASD, Arrow keys, Space)
 * - Street walk mode (WASD navigation)
 * - Open modals, drawers, and dialogs
 * - Form input elements
 */

export type InputLayer = 'explore' | 'street' | 'game' | 'modal' | 'palette';

class InputManager {
  private modalStack: string[] = [];
  private activeGame: string | null = null;
  private isStreetActive: boolean = false;

  public registerModalOpen(id: string) {
    if (!this.modalStack.includes(id)) {
      this.modalStack.push(id);
    }
  }

  public registerModalClose(id: string) {
    this.modalStack = this.modalStack.filter(m => m !== id);
  }

  public setActiveGame(gameId: string | null) {
    this.activeGame = gameId;
  }

  public setStreetActive(active: boolean) {
    this.isStreetActive = active;
  }

  public getCurrentLayer(): InputLayer {
    if (this.modalStack.includes('palette')) return 'palette';
    if (this.modalStack.length > 0) return 'modal';
    if (this.activeGame) return 'game';
    if (this.isStreetActive) return 'street';
    return 'explore';
  }

  public canHandleGlobalShortcuts(): boolean {
    return this.getCurrentLayer() === 'explore';
  }

  public canHandleStreetWalk(): boolean {
    return this.modalStack.length === 0 && !this.activeGame && this.isStreetActive;
  }

  public isGameActive(): boolean {
    return this.activeGame !== null;
  }

  public getActiveGame(): string | null {
    return this.activeGame;
  }

  public getTopModal(): string | null {
    return this.modalStack.length > 0 ? this.modalStack[this.modalStack.length - 1] : null;
  }
}

export const inputManager = new InputManager();
