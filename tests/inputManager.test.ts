import test from 'node:test';
import assert from 'node:assert/strict';
import { inputManager } from '../src/services/inputManager.ts';

test('inputManager defaults to explore layer with global shortcuts enabled', () => {
  // Ensure fresh baseline
  inputManager.setActiveGame(null);
  inputManager.setStreetActive(false);

  assert.equal(inputManager.getCurrentLayer(), 'explore');
  assert.equal(inputManager.canHandleGlobalShortcuts(), true);
  assert.equal(inputManager.canHandleStreetWalk(), false);
  assert.equal(inputManager.isGameActive(), false);
});

test('street walk mode disables global explore shortcuts and enables street walk input', () => {
  inputManager.setStreetActive(true);
  inputManager.setActiveGame(null);

  assert.equal(inputManager.getCurrentLayer(), 'street');
  assert.equal(inputManager.canHandleGlobalShortcuts(), false);
  assert.equal(inputManager.canHandleStreetWalk(), true);

  inputManager.setStreetActive(false);
});

test('opening a modal blocks both global explore shortcuts and street walk navigation', () => {
  inputManager.setStreetActive(true);
  inputManager.registerModalOpen('backpack');

  assert.equal(inputManager.getCurrentLayer(), 'modal');
  assert.equal(inputManager.canHandleGlobalShortcuts(), false);
  // StreetWalker must NOT walk while backpack modal is open
  assert.equal(inputManager.canHandleStreetWalk(), false);

  inputManager.registerModalClose('backpack');
  // Returns cleanly to street mode
  assert.equal(inputManager.getCurrentLayer(), 'street');
  assert.equal(inputManager.canHandleStreetWalk(), true);

  inputManager.setStreetActive(false);
});

test('active mini-game takes input ownership and blocks global shortcuts and street walk', () => {
  inputManager.setStreetActive(true);
  inputManager.setActiveGame('bike');

  assert.equal(inputManager.getCurrentLayer(), 'game');
  assert.equal(inputManager.isGameActive(), true);
  assert.equal(inputManager.getActiveGame(), 'bike');
  assert.equal(inputManager.canHandleGlobalShortcuts(), false);
  assert.equal(inputManager.canHandleStreetWalk(), false);

  inputManager.setActiveGame(null);
  inputManager.setStreetActive(false);
  assert.equal(inputManager.getCurrentLayer(), 'explore');
  assert.equal(inputManager.canHandleGlobalShortcuts(), true);
});

test('modal stack tracks multiple nested modals properly', () => {
  inputManager.registerModalOpen('monitor');
  inputManager.registerModalOpen('settings');

  assert.equal(inputManager.getTopModal(), 'settings');
  assert.equal(inputManager.canHandleGlobalShortcuts(), false);

  inputManager.registerModalClose('settings');
  assert.equal(inputManager.getTopModal(), 'monitor');

  inputManager.registerModalClose('monitor');
  assert.equal(inputManager.getTopModal(), null);
  assert.equal(inputManager.canHandleGlobalShortcuts(), true);
});
