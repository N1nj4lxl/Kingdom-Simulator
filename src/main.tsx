import './style.css';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

/*
 * This file implements the core logic for a browser‑based kingdom management game.
 * It is a complete rewrite of the earlier Tkinter port, introducing additional
 * systems inspired by other kingdom management games:
 *  - A building system with limited slots and multiple building types.  
 *    Buildings cost money and consume a point of strength to construct, but
 *    provide ongoing benefits each day (e.g. extra food, increased max strength,
 *    passive coin income or ongoing happiness boosts).
 *  - Random choice events that present the player with dilemmas. Each choice
 *    modifies resources and happiness in different ways, forcing the player to
 *    weigh risks and rewards.
 *  - UI gating to prevent actions when prerequisites such as money, strength
 *    or available building slots are not met. Disabled buttons include a
 *    tooltip explaining why the action is unavailable.
 */

// Type definitions for clarity and type safety.
type Tag = 'event' | 'good' | 'warn' | 'danger' | 'system' | 'merchant' | 'muted';
type EraId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type EnemyCfg = {
  health: number;
  damage_min: number;
  damage_max: number;
  coins_min: number;
  coins_max: number;
};

// Type for a building constructed by the player. Only the id is stored
// because effects and names are defined in BUILDING_OPTIONS.
interface Building {
  id: string;
}

// Definition for a choice event. Each event has descriptive text and a set of
// options. Selecting an option applies the specified resource deltas and
// appends a log entry.
interface ChoiceEventOption {
  label: string;
  effect: {
    money?: number;
    bread?: number;
    happiness?: number;
    people?: number;
    strength?: number;
    maxstrength?: number;
    log: string;
  };
}
interface ChoiceEvent {
  description: string;
  options: ChoiceEventOption[];
}

// Definition of the overall state. State is serialisable and safe to store in
// localStorage.
interface State {
  name: string;
  day: number;
  death_day: number;
  money: number;
  exmoney: number;
  pmoney: number;
  people: number;
  maxpeople: number;
  happiness: number;
  phealth: number;
  maxphealth: number;
  strength: number;
  maxstrength: number;
  ehealth: number;
  inventory: {
    hpotion: number;
    dpotion: number;
    mpotion: number;
    spotion: number;
    lightning_potion: number;
    sleep_potion: number;
    poison_potion: number;
    bread: number;
    meat: number;
    fruit: number;
    cheese: number;
  };
  currentEra: string;
  currentSword: string;
  minDmg: number;
  maxDmg: number;
  wfight: number;
  lfight: number;
  merchant_relationship: number;
  merchant_weapon_log: Record<string, boolean>;
  last_merchant_offer_type: string | null;
  number: number;
  owned_weapon: Record<EraId, number>;
  policies: Record<string, { locked: boolean; active: boolean; desc: string }>;
  logs: { text: string; tag: Tag; id: number }[];
  pendingMerchant: MerchantOffer | null;
  fight: { cfg: EnemyCfg | null; stunned: boolean; poisonTurns: number; over: boolean };
  // New fields for buildings and choice events.
  buildings: Building[];
  maxBuildings: number;
  choiceEvent: ChoiceEvent | null;
}

// Merchant related types reused from earlier code.
type MerchantWeaponOffer = { kind: 'weapon'; name: string; bonus: number; price: number };
type MerchantUniqueOffer =
  | { kind: 'unique'; name: 'Golden Cheese'; effect: 'happiness'; value: number; price: number }
  | { kind: 'unique'; name: 'Ancient Scroll'; effect: 'maxstrength'; value: number; price: number }
  | { kind: 'unique'; name: 'Map Fragment'; effect: null; value: number; price: number };
type MerchantOffer = MerchantWeaponOffer | MerchantUniqueOffer;

// Utility functions used throughout the game.
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

// Maps era identifiers to their names. Keep this in sync with ERA_SEQ.
const ERAS: Record<EraId, string> = {
  1: 'Stone Age',
  2: 'Bronze Age',
  3: 'Iron Age',
  4: 'Roman Age',
  5: 'Medievil Age',
  6: 'Electric Age',
  7: 'Modern Age',
};
const ERA_SEQ = ['Bronze Age', 'Iron Age', 'Roman Age', 'Medievil Age', 'Electric Age', 'Modern Age'];

// Available weapons for purchase. Each weapon belongs to an era and has a base cost and damage value.
const WEAPONS = [
  { id: 1, era: 1, name: 'Pebble', price: 1000, damage: 2 },
  { id: 2, era: 1, name: 'Stone', price: 5000, damage: 5 },
  { id: 3, era: 1, name: 'Rock', price: 7500, damage: 7 },
  { id: 4, era: 1, name: 'Chiselled Stone', price: 12000, damage: 12 },
  { id: 5, era: 1, name: 'Sharpened Rock', price: 16000, damage: 15 },
  { id: 1, era: 3, name: 'Iron Spear', price: 165000, damage: 34 },
  { id: 2, era: 3, name: 'Steel Sword', price: 200000, damage: 38 },
  { id: 3, era: 3, name: 'Lance', price: 220000, damage: 42 },
  { id: 4, era: 3, name: 'Axe', price: 235000, damage: 46 },
  { id: 5, era: 3, name: 'Bow', price: 260000, damage: 50 },
  { id: 1, era: 5, name: 'Socketed Axe', price: 30000, damage: 17 },
  { id: 2, era: 5, name: 'Dagger', price: 45000, damage: 20 },
  { id: 3, era: 5, name: 'Sickle Sword', price: 60000, damage: 24 },
  { id: 4, era: 5, name: 'Reinforced Axe', price: 90000, damage: 27 },
  { id: 5, era: 5, name: 'Dead Oak Bow', price: 120000, damage: 30 },
  { id: 1, era: 6, name: 'Glock', price: 1045000, damage: 98 },
  { id: 2, era: 6, name: 'Uzi', price: 1100000, damage: 100 },
  { id: 3, era: 6, name: 'Maxim Gun', price: 1150000, damage: 102 },
  { id: 4, era: 6, name: 'AK-47', price: 1200000, damage: 104 },
  { id: 5, era: 6, name: 'M1 Garand', price: 1300000, damage: 106 },
  { id: 1, era: 7, name: 'Composite Knife', price: 9000, damage: 75 },
  { id: 2, era: 7, name: 'Smartsteel Katana', price: 12000, damage: 95 },
  { id: 3, era: 7, name: 'Laser Saber', price: 20000, damage: 120 },
] as const;

// Potion definitions. Each potion has a variable name in the inventory and a base cost.
const POTIONS = [
  { id: 1, name: 'Health Potion', price: 500, var: 'hpotion' as const },
  { id: 2, name: 'Mana Potion', price: 750, var: 'mpotion' as const },
  { id: 3, name: 'Stamina Potion', price: 1000, var: 'spotion' as const },
  { id: 4, name: 'Damage Potion', price: 1500, var: 'dpotion' as const },
  { id: 5, name: 'Lightning Potion', price: 2000, var: 'lightning_potion' as const },
  { id: 6, name: 'Sleep Potion', price: 1800, var: 'sleep_potion' as const },
  { id: 7, name: 'Poison Potion', price: 1700, var: 'poison_potion' as const },
] as const;

// Food definitions. Each item has a variable name in the inventory and a base cost.
const FOOD = [
  { id: 1, name: 'Bread', price: 20, var: 'bread' as const },
  { id: 2, name: 'Meat', price: 50, var: 'meat' as const },
  { id: 3, name: 'Fruit', price: 30, var: 'fruit' as const },
  { id: 4, name: 'Cheese', price: 40, var: 'cheese' as const },
] as const;

// Enemy configurations for fights. Difficulty scales health, damage and coin rewards.
const ENEMY: Record<'EASY' | 'MEDIUM' | 'HARD', EnemyCfg> = {
  EASY: { health: 100, damage_min: 2, damage_max: 7, coins_min: 50, coins_max: 150 },
  MEDIUM: { health: 200, damage_min: 7, damage_max: 12, coins_min: 100, coins_max: 500 },
  HARD: { health: 300, damage_min: 10, damage_max: 20, coins_min: 150, coins_max: 800 },
};

// Merchant table mapping era names to potential special weapon offers. Each entry includes
// a rarity used to weight random selection.
const MERCHANT_BY_ERA: Record<
  string,
  { name: string; bonus: number; price: number; rarity: 'Common' | 'Rare' | 'Epic' }[]
> = {
  'Stone Age': [
    { name: 'Sharpened Bone', bonus: 15, price: 600, rarity: 'Common' },
    { name: 'Jagged Flint Axe', bonus: 20, price: 1200, rarity: 'Rare' },
    { name: 'Mammoth Fang Blade', bonus: 30, price: 2000, rarity: 'Epic' },
  ],
  'Bronze Age': [
    { name: 'Bronze Shortblade', bonus: 22, price: 1400, rarity: 'Common' },
    { name: 'Fire-Hardened Spear', bonus: 30, price: 2400, rarity: 'Rare' },
    { name: 'Sun-Kissed Dagger', bonus: 38, price: 3500, rarity: 'Epic' },
  ],
  'Iron Age': [
    { name: 'Iron Cleaver', bonus: 35, price: 3000, rarity: 'Common' },
    { name: 'Spiked Mace', bonus: 42, price: 4000, rarity: 'Rare' },
    { name: 'Molten Iron Blade', bonus: 52, price: 5500, rarity: 'Epic' },
  ],
  'Roman Age': [
    { name: 'Legionnaire’s Gladius', bonus: 40, price: 3500, rarity: 'Common' },
    { name: 'Colosseum Cutter', bonus: 50, price: 5000, rarity: 'Rare' },
    { name: 'Centurion’s Edge', bonus: 65, price: 7500, rarity: 'Epic' },
  ],
  'Medievil Age': [
    { name: 'Crusader Sword', bonus: 50, price: 5000, rarity: 'Common' },
    { name: 'Dragonsteel Falchion', bonus: 60, price: 7000, rarity: 'Rare' },
    { name: 'Vampire Slayer', bonus: 80, price: 10000, rarity: 'Epic' },
  ],
  'Electric Age': [
    { name: 'Insulated Cutter', bonus: 65, price: 7000, rarity: 'Common' },
    { name: 'Arc Blade', bonus: 80, price: 10000, rarity: 'Rare' },
    { name: 'Tesla Edge', bonus: 100, price: 15000, rarity: 'Epic' },
  ],
  'Modern Age': [
    { name: 'Composite Tactical Knife', bonus: 75, price: 9000, rarity: 'Common' },
    { name: 'Smartsteel Katana', bonus: 95, price: 12000, rarity: 'Rare' },
    { name: 'Prototype Laser Saber', bonus: 120, price: 20000, rarity: 'Epic' },
  ],
};

// Building options available for construction. Each building has a unique id, a name,
// cost, descriptive text and an effect describing the benefits applied daily.
const BUILDING_OPTIONS = [
  {
    id: 'farm',
    name: 'Farm',
    cost: 200,
    description: 'Provides +10 food each day.',
    effect: { bread: 10 },
  },
  {
    id: 'barracks',
    name: 'Barracks',
    cost: 500,
    description: 'Increases your maximum strength by 1 immediately and allows higher attack power.',
    effect: { maxstrength: 1 },
  },
  {
    id: 'workshop',
    name: 'Workshop',
    cost: 800,
    description: 'Produces +50 coins per day.',
    effect: { money: 50 },
  },
  {
    id: 'temple',
    name: 'Temple',
    cost: 300,
    description: 'Increases happiness by 2 each day.',
    effect: { happiness: 2 },
  },
] as const;

// A selection of choice events. Each event has a narrative description and a
// set of options with associated effects. Effects use deltas relative to
// current state and a log string that will be appended to the event log.
const CHOICE_EVENTS: ChoiceEvent[] = [
  {
    description: 'A mysterious traveller offers to teach advanced farming techniques for 200 coins.',
    options: [
      {
        label: 'Accept the offer',
        effect: {
          money: -200,
          bread: 30,
          log: 'You paid 200 coins and learned advanced farming. Food production increases significantly.',
        },
      },
      {
        label: 'Decline politely',
        effect: {
          happiness: -3,
          log: 'The traveller leaves disappointed. The people are upset by your decision.',
        },
      },
    ],
  },
  {
    description: 'A plague threatens your people. How do you respond?',
    options: [
      {
        label: 'Invest in medicine (200 coins)',
        effect: {
          money: -200,
          happiness: 5,
          log: 'You invested in medicine. The plague is contained and morale improves.',
        },
      },
      {
        label: 'Trust in faith',
        effect: {
          people: -3,
          happiness: -5,
          log: 'The plague claims several lives. People lose faith in your leadership.',
        },
      },
    ],
  },
] as const;

// Persistent storage key for saving game state to localStorage.
const SAVE_KEY = 'kingdom_save_v2';

/**
 * Returns a fresh initial game state. This function is used to start new games
 * and also to reset loaded games when the save schema changes.
 */
function createInitialState(): State {
  return {
    name: 'kingdom name',
    day: 1,
    death_day: rand(80, 150),
    money: 999990,
    exmoney: 5000,
    pmoney: 0,
    people: 50,
    maxpeople: 50,
    happiness: 50,
    phealth: 100,
    maxphealth: 100,
    strength: 3,
    maxstrength: 3,
    ehealth: 100,
    inventory: {
      hpotion: 0,
      dpotion: 0,
      mpotion: 0,
      spotion: 0,
      lightning_potion: 0,
      sleep_potion: 0,
      poison_potion: 0,
      bread: 10,
      meat: 0,
      fruit: 0,
      cheese: 0,
    },
    currentEra: 'Stone Age',
    currentSword: 'None',
    minDmg: 5,
    maxDmg: 15,
    wfight: 0,
    lfight: 0,
    merchant_relationship: 0,
    merchant_weapon_log: {},
    last_merchant_offer_type: null,
    number: -1,
    owned_weapon: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
    policies: {
      'Universal Tax': { locked: true, active: false, desc: 'Gain more tax money, but lower happiness.' },
      'Charity Relief': { locked: true, active: false, desc: 'Lose money per day to boost happiness.' },
      'Royal Festival': { locked: true, active: false, desc: 'Auto‑celebrates a festival every 5 days.' },
      'Food Rationing': { locked: true, active: false, desc: 'Reduce food consumption, reduce happiness.' },
      'Open Borders': { locked: true, active: false, desc: 'Chance for more migrants, but occasional unrest.' },
      'Public Health': { locked: true, active: false, desc: 'Reduces sickness, small gold cost daily.' },
      'Work Tax Rebate': { locked: true, active: false, desc: 'Boost worker morale, costs coins.' },
      'Electric Welfare': { locked: true, active: false, desc: 'Auto‑fixes disasters. Electric+ only.' },
    },
    logs: [],
    pendingMerchant: null,
    fight: { cfg: null, stunned: false, poisonTurns: 0, over: false },
    buildings: [],
    maxBuildings: 3,
    choiceEvent: null,
  };
}

/**
 * Root application component. Holds the game state and defines all commands and
 * UI panels. The component uses a series of helper functions to mutate
 * state predictably and log the results.
 */
function App() {
  // Screen state toggles between the menu and the main game.
  const [screen, setScreen] = useState<'menu' | 'main'>('menu');
  // Primary game state. Calls to setState will re‑render the UI.
  const [s, set] = useState<State>(() => createInitialState());
  // Toggles for the various overlays.
  const [fightOpen, setFightOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [polOpen, setPolOpen] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);
  // Refs for scrolling logs.
  const logRef = useRef<HTMLDivElement>(null);
  const fightLogRef = useRef<HTMLDivElement>(null);
  // Kingdom name typed in the menu.
  const [menuName, setMenuName] = useState('');

  // Append a new entry to the event log. Keeps only the last 600 entries.
  const appendLog = (text: string, tag: Tag = 'event') =>
    set((prev) => {
      const nextId = prev.logs.length ? prev.logs[prev.logs.length - 1].id + 1 : 1;
      const nextLogs = [...prev.logs, { text, tag, id: nextId }];
      return { ...prev, logs: nextLogs.slice(-600) };
    });

  // Scroll the main log to the bottom whenever it changes.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [s.logs]);

  // Save and load functions to persist state in localStorage. The save schema
  // version is embedded in the key so incompatible saves do not load.
  const save = () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    appendLog('Game saved.', 'system');
  };
  const load = () => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      appendLog('No save found.', 'system');
      return false;
    }
    try {
      const parsed: State = JSON.parse(raw);
      set(parsed);
      appendLog('Game loaded.', 'system');
      return true;
    } catch {
      appendLog('Failed to load save.', 'danger');
      return false;
    }
  };
  const clearSave = () => {
    localStorage.removeItem(SAVE_KEY);
    appendLog('Save cleared.', 'system');
  };

  // Merchant pricing helper: discounts scale with relationship level.
  const discountedPrice = (base: number) => {
    const discPct = s.merchant_relationship * 6;
    const disc = Math.floor(base * (discPct / 100));
    return { final: base - disc, discPct };
  };

  // Determine which actions are currently available based on state.
  const cheapestBuildCost = Math.min(...BUILDING_OPTIONS.map((b) => b.cost));
  const can = {
    tax: s.happiness >= 1 && s.strength >= 1,
    pay: s.people >= 1 && s.money >= 5 && s.strength >= 1,
    expand: s.number < 6 && s.money >= s.exmoney && s.strength >= 1,
    fight: s.strength >= 1,
    build: s.buildings.length < s.maxBuildings && s.money >= cheapestBuildCost && s.strength >= 1,
  };

  /**
   * Apply the daily benefits from constructed buildings. This is called at the
   * end of the sleep cycle after random events have been processed. Each building
   * adds to bread, money, happiness or maximum strength. Barracks also increase
   * max strength immediately when built.
   */
  function applyBuildingBenefits(next: State) {
    let deltaMoney = 0;
    let deltaBread = 0;
    let deltaHappy = 0;
    // Iterate through each building and accumulate effects.
    next.buildings.forEach((b) => {
      const def = BUILDING_OPTIONS.find((opt) => opt.id === b.id);
      if (!def) return;
      if (def.effect.money) deltaMoney += def.effect.money;
      if (def.effect.bread) deltaBread += def.effect.bread;
      if (def.effect.happiness) deltaHappy += def.effect.happiness;
    });
    if (deltaMoney > 0) {
      next.money += deltaMoney;
      appendLog(`Buildings produced ${deltaMoney} coins.`, 'good');
    }
    if (deltaBread > 0) {
      next.inventory.bread += deltaBread;
      appendLog(`Buildings produced ${deltaBread} food.`, 'good');
    }
    if (deltaHappy > 0) {
      next.happiness = clamp(next.happiness + deltaHappy, 0, 100);
      appendLog(`Buildings increased happiness by ${deltaHappy}.`, 'good');
    }
  }

  /**
   * Trigger a random choice event with some probability. If a choice event is
   * already active, do nothing. The event is selected randomly from the
   * CHOICE_EVENTS array.
   */
  function maybeTriggerChoiceEvent() {
    // Only one choice event at a time.
    if (s.choiceEvent) return;
    // 10% chance to trigger an event each day.
    const roll = Math.random();
    if (roll < 0.1) {
      const ev = CHOICE_EVENTS[Math.floor(Math.random() * CHOICE_EVENTS.length)];
      set((prev) => ({ ...prev, choiceEvent: ev }));
      appendLog('An important decision awaits you...', 'system');
    }
  }

  /**
   * Core day progression command. Restores strength, consumes food, applies
   * random events and building benefits. Once complete, calls random_event to
   * resolve additional occurrences.
   */
  const command_sleep = () => {
    set((prev) => {
      // Restore strength to full for the next day.
      let next: State = { ...prev, strength: prev.maxstrength, day: prev.day + 1 };
      // Determine how much food is required and consume it.
      let required_food = next.people;
      if (next.policies['Food Rationing'].active) required_food = Math.floor(next.people * 0.75);
      let bread = next.inventory.bread;
      if (bread >= required_food) {
        bread -= required_food;
        appendLog(`You consumed ${required_food} food for your population.`, 'event');
      } else {
        const shortage = required_food - bread;
        bread = 0;
        const happiness_loss = Math.floor(shortage / 2);
        const people_lost = Math.floor(shortage / 5);
        next.happiness = clamp(next.happiness - happiness_loss, 0, 100);
        next.people = Math.max(0, next.people - people_lost);
        appendLog(`Food shortage. Lost ${people_lost} people, happiness -${happiness_loss}.`, 'warn');
      }
      next.inventory = { ...next.inventory, bread };
      // Resolve random events.
      next = random_event(next);
      // Apply building benefits.
      applyBuildingBenefits(next);
      return next;
    });
    // Potentially trigger a choice event at the very end.
    maybeTriggerChoiceEvent();
  };

  /**
   * Tax command: subtracts happiness, adds money and consumes strength. If
   * happiness falls below 1, the people revolt and the kingdom collapses.
   */
  const command_tax = () => {
    if (!can.tax) return;
    const delta = rand(1, 5);
    set((prev) => {
      if (prev.happiness < 1) {
        appendLog('Your people were not happy and left. You became broke.', 'danger');
        return { ...prev, money: 0 };
      }
      return {
        ...prev,
        happiness: clamp(prev.happiness - delta, 0, 100),
        money: prev.money + rand(25, 50),
        strength: Math.max(0, prev.strength - 1),
      };
    });
    appendLog(`You taxed the people: happiness -${delta}.`, 'warn');
  };

  /**
   * Pay command: lowers money, increases happiness and consumes strength.
   * If there are no people left, paying has no effect.
   */
  const command_pay = () => {
    if (!can.pay) return;
    set((prev) => {
      if (prev.people < 1) {
        appendLog(`You have no-one left in ${prev.name}. You became broke and unpopular.`, 'danger');
        return { ...prev, money: 0 };
      }
      return {
        ...prev,
        money: prev.money - 5,
        happiness: clamp(prev.happiness + 5, 0, 100),
        strength: Math.max(0, prev.strength - 1),
      };
    });
    appendLog('You paid the people. Happiness +5.', 'good');
  };

  /**
   * Expand command: advances to the next era if possible. Requires money,
   * available strength and not already at the final era.
   */
  const command_expand = () => {
    if (!can.expand) {
      appendLog(
        s.number >= 6
          ? 'You are already at the top Age.'
          : 'You need more coins or strength to expand.',
        'muted',
      );
      return;
    }
    set((prev) => {
      const number = prev.number + 1;
      const currentEra = ERA_SEQ[number] || prev.currentEra;
      appendLog(`You advanced to ${currentEra}. Max population is now ${prev.maxpeople * 2}.`, 'good');
      // Advancing era also increases maximum building slots by one.
      const newMaxBuildings = Math.min(prev.maxBuildings + 1, 5);
      return {
        ...prev,
        money: prev.money - prev.exmoney,
        exmoney: prev.exmoney * 2,
        maxpeople: prev.maxpeople * 2,
        number,
        currentEra,
        maxstrength: Math.max(prev.maxstrength, 4),
        strength: Math.max(0, prev.strength - 1),
        maxBuildings: newMaxBuildings,
      };
    });
  };

  /**
   * Open the build interface. Does nothing if building is not available.
   */
  const openBuild = () => {
    if (!can.build) return;
    setBuildOpen(true);
  };

  /**
   * Construct a building of the specified type. Consumes money and strength
   * immediately. Some buildings (e.g. barracks) apply their effect on build.
   */
  const buildBuilding = (optionId: string) => {
    const def = BUILDING_OPTIONS.find((b) => b.id === optionId);
    if (!def) return;
    if (!can.build) return;
    if (s.money < def.cost) {
      appendLog('Not enough coins to build.', 'warn');
      return;
    }
    set((prev) => {
      // Deduct cost and strength, add building.
      const newBuildings = [...prev.buildings, { id: def.id }];
      let next: State = {
        ...prev,
        money: prev.money - def.cost,
        strength: Math.max(0, prev.strength - 1),
        buildings: newBuildings,
      };
      // Immediate effects: barracks increase max strength.
      if (def.effect.maxstrength) {
        next.maxstrength += def.effect.maxstrength;
        appendLog(`Your ${def.name} increases maximum strength by ${def.effect.maxstrength}.`, 'good');
      }
      appendLog(`You built a ${def.name}.`, 'system');
      return next;
    });
    setBuildOpen(false);
  };

  /**
   * Resolves a choice event by applying the selected option's effects to the
   * current state. The choiceEvent is cleared afterwards. The effects may
   * include positive or negative deltas for various resources.
   */
  const resolveChoice = (opt: ChoiceEventOption) => {
    set((prev) => {
      let next: State = { ...prev };
      const eff = opt.effect;
      // Apply resource deltas. Money can go negative but we clamp later.
      if (eff.money) next.money = Math.max(0, next.money + eff.money);
      if (eff.bread) next.inventory.bread = Math.max(0, next.inventory.bread + eff.bread);
      if (eff.happiness) next.happiness = clamp(next.happiness + eff.happiness, 0, 100);
      if (eff.people) next.people = Math.max(0, next.people + eff.people);
      if (eff.strength) next.strength = Math.max(0, next.strength + eff.strength);
      if (eff.maxstrength) next.maxstrength += eff.maxstrength;
      // Append log from effect.
      appendLog(eff.log, eff.money && eff.money < 0 ? 'warn' : 'good');
      return { ...next, choiceEvent: null };
    });
  };

  /**
   * The random_event function accepts the next state and returns a mutated copy
   * after applying a random event. Because it does not close over state it can
   * be called within setState safely.
   */
  function random_event(next: State): State {
    const roll = rand(1, 100);
    if (roll <= 10) {
      const loss = rand(100, 300);
      const happinessLoss = rand(5, 15);
      appendLog(`Protest in the streets. Lost ${loss} coins. Happiness reduced.`, 'warn');
      return {
        ...next,
        pmoney: next.pmoney + 1,
        money: Math.max(0, next.money - loss),
        happiness: clamp(next.happiness - happinessLoss, 0, 100),
      };
    } else if (roll <= 20) {
      const outcome = rand(1, 10);
      if (outcome <= 6) {
        const reward = rand(300, 800);
        appendLog(`You repelled a rogue faction and looted ${reward} coins.`, 'good');
        return { ...next, money: next.money + reward };
      } else {
        const loss = rand(100, 400);
        const casualties = rand(3, 10);
        appendLog(`You lost to a rogue faction. ${casualties} people and ${loss} coins lost.`, 'warn');
        return {
          ...next,
          people: Math.max(0, next.people - casualties),
          money: Math.max(0, next.money - loss),
        };
      }
    } else if (roll <= 30) {
      // Merchant event
      merchant_event();
      return next;
    } else if (roll <= 40) {
      // Disaster events
      if (Math.random() < 0.5) {
        const lost = rand(5, 15);
        appendLog(`Famine struck. ${lost} people died and food supplies dwindled.`, 'warn');
        return {
          ...next,
          people: Math.max(0, next.people - lost),
          inventory: { ...next.inventory, bread: Math.max(0, next.inventory.bread - lost) },
          happiness: clamp(next.happiness - 10, 0, 100),
        };
      } else {
        const loss = rand(10, 20);
        appendLog(`Flooding damaged crops. ${loss} bread lost.`, 'warn');
        return {
          ...next,
          inventory: { ...next.inventory, bread: Math.max(0, next.inventory.bread - loss) },
          happiness: clamp(next.happiness - 5, 0, 100),
        };
      }
    } else if (roll <= 50) {
      appendLog('A royal decision pleased the people. Happiness rises.', 'good');
      return { ...next, happiness: clamp(next.happiness + 10, 0, 100) };
    } else if (roll <= 55) {
      if (Math.random() < 0.5) {
        appendLog('A cursed relic brought misfortune.', 'warn');
        return {
          ...next,
          happiness: clamp(next.happiness - 10, 0, 100),
          money: Math.max(0, next.money - 200),
        };
      } else {
        appendLog('An enchanted relic blessed the land. +500 coins.', 'good');
        return {
          ...next,
          happiness: clamp(next.happiness + 10, 0, 100),
          money: next.money + 500,
        };
      }
    } else if (roll <= 60) {
      // Unlock new policies.
      const locked = Object.keys(next.policies).filter((k) => next.policies[k].locked);
      if (locked.length) {
        const key = locked[Math.floor(Math.random() * locked.length)];
        appendLog(`New policy emerged: ${key}. ${next.policies[key].desc}`, 'system');
        return { ...next, policies: { ...next.policies, [key]: { ...next.policies[key], locked: false } } };
      }
      return next;
    } else if (roll <= 70) {
      const bonus = rand(10, 30);
      appendLog(`A festival boosted morale. +${bonus} happiness.`, 'good');
      return { ...next, happiness: clamp(next.happiness + bonus, 0, 100) };
    } else if (roll <= 80) {
      const coins = rand(200, 600);
      appendLog(`Buried treasure found. +${coins} coins.`, 'good');
      return { ...next, money: next.money + coins };
    }
    // Default calm day: no effect.
    appendLog('A calm day passes.', 'muted');
    return next;
  }

  /**
   * Merchant event selects a random special weapon or unique item for purchase.
   * This function mutates state outside of set(), so it must be called in
   * random_event() which already clones next state. It uses appendLog to
   * communicate the offer to the player and sets pendingMerchant.
   */
  function merchant_event() {
    // Determine whether to offer a weapon or a unique item.
    let offerType: 'weapon' | 'unique' = 'unique';
    if (s.currentEra in MERCHANT_BY_ERA && !(s.currentEra in s.merchant_weapon_log)) {
      if (rand(1, 100) <= 3 && s.last_merchant_offer_type !== 'weapon') offerType = 'weapon';
    }
    if (offerType === s.last_merchant_offer_type) offerType = 'unique';
    if (offerType === 'weapon') {
      const pool = MERCHANT_BY_ERA[s.currentEra];
      const weighted: typeof pool = [];
      for (const w of pool) {
        const n = w.rarity === 'Common' ? 3 : w.rarity === 'Rare' ? 2 : 1;
        for (let i = 0; i < n; i++) weighted.push(w);
      }
      const sel = weighted[Math.floor(Math.random() * weighted.length)];
      const { final, discPct } = discountedPrice(sel.price);
      appendLog(
        `Merchant offers a ${sel.rarity} weapon: ${sel.name} (+${sel.bonus} DMG). Price ${final} coins (${discPct}% off).`,
        'merchant',
      );
      set((prev) => ({
        ...prev,
        pendingMerchant: { kind: 'weapon', name: sel.name, bonus: sel.bonus, price: final },
        last_merchant_offer_type: 'weapon',
      }));
    } else {
      const rare: MerchantUniqueOffer[] = [
        { kind: 'unique', name: 'Golden Cheese', effect: 'happiness', value: 5, price: 700 },
        { kind: 'unique', name: 'Ancient Scroll', effect: 'maxstrength', value: 1, price: 1000 },
        { kind: 'unique', name: 'Map Fragment', effect: null, value: 0, price: 800 },
      ].filter((x) => x.name !== s.last_merchant_offer_type) as MerchantUniqueOffer[];
      const sel = rare[Math.floor(Math.random() * rare.length)];
      const { final } = discountedPrice(sel.price);
      appendLog(`Merchant offers ${sel.name}. Price ${final} coins.`, 'merchant');
      set((prev) => ({
        ...prev,
        pendingMerchant: { ...sel, price: final },
        last_merchant_offer_type: sel.name,
      }));
    }
  }

  /**
   * Purchase the currently offered merchant item, if any. Adjusts state based
   * on the item purchased and clears the pendingMerchant afterwards.
   */
  const buyMerchant = () => {
    const p = s.pendingMerchant;
    if (!p) return;
    if (s.money < p.price) {
      appendLog('You cannot afford it.', 'warn');
      return;
    }
    if (p.kind === 'weapon') {
      set((prev) => ({
        ...prev,
        money: prev.money - p.price,
        minDmg: 5 + p.bonus,
        maxDmg: 15 + p.bonus,
        currentSword: `${p.name} (+${p.bonus} DMG)`,
        merchant_weapon_log: { ...prev.merchant_weapon_log, [prev.currentEra]: true },
        merchant_relationship: Math.min(5, prev.merchant_relationship + 1),
        pendingMerchant: null,
      }));
      appendLog(`You purchased ${p.name}.`, 'merchant');
    } else {
      set((prev) => {
        let happiness = prev.happiness;
        let maxstrength = prev.maxstrength;
        if (p.effect === 'happiness') happiness = clamp(happiness + p.value, 0, 100);
        if (p.effect === 'maxstrength') maxstrength += p.value;
        return {
          ...prev,
          money: prev.money - p.price,
          happiness,
          maxstrength,
          merchant_relationship: Math.min(5, prev.merchant_relationship + 1),
          pendingMerchant: null,
        };
      });
      appendLog(`You bought ${p.name}.`, 'merchant');
    }
  };

  /**
   * Buy a stack of potions or food from the shop. Calculates total cost and
   * updates inventory accordingly. Disabled if not enough coins.
   */
  const buyStack = (key: keyof State['inventory'], price: number, qty: number, name: string) => {
    if (qty <= 0) return;
    const total = price * qty;
    if (s.money < total) {
      appendLog('Not enough coins.', 'warn');
      return;
    }
    set((prev) => ({
      ...prev,
      money: prev.money - total,
      inventory: { ...prev.inventory, [key]: prev.inventory[key] + qty },
    }));
    appendLog(`Purchased ${qty} ${name}.`, 'good');
  };

  /**
   * Purchase a weapon from the shop. Updates owned_weapon, damage values and
   * currentSword. Fails if the weapon is locked or not affordable.
   */
  const buyWeapon = (era: EraId, wid: number) => {
    const w = WEAPONS.find((x) => x.era === era && x.id === wid);
    if (!w) return;
    if (wid <= (s.owned_weapon[era] || 0)) {
      appendLog('That weapon is locked.', 'muted');
      return;
    }
    if (s.money < w.price) {
      appendLog('Not enough coins.', 'warn');
      return;
    }
    set((prev) => ({
      ...prev,
      money: prev.money - w.price,
      owned_weapon: { ...prev.owned_weapon, [era]: wid },
      minDmg: 5 + w.damage,
      maxDmg: 15 + w.damage,
      currentSword: `${w.name} (+${w.damage} DMG)`,
    }));
    appendLog(`Purchased ${w.name}.`, 'good');
  };

  /**
   * Begin a fight of a given difficulty. Requires strength and consumes one
   * strength point on start. Initialises fight state and opens the overlay.
   */
  const startFight = (diff: 'EASY' | 'MEDIUM' | 'HARD') => {
    if (!can.fight) {
      appendLog('Too exhausted to fight. Sleep to restore strength.', 'muted');
      return;
    }
    set((prev) => ({
      ...prev,
      strength: prev.strength - 1,
      ehealth: ENEMY[diff].health,
      phealth: 100,
      fight: { cfg: ENEMY[diff], stunned: false, poisonTurns: 0, over: false },
    }));
    setFightOpen(true);
    if (fightLogRef.current) fightLogRef.current.textContent = '';
  };

  /**
   * Push a message into the fight log. The fight log is separate from the
   * main log and appears in the battle overlay.
   */
  const fightPush = (msg: string) => {
    const el = fightLogRef.current;
    if (!el) return;
    const p = document.createElement('div');
    p.textContent = msg;
    el.appendChild(p);
    el.scrollTop = el.scrollHeight;
  };

  /**
   * Update health bars in fight, apply poison damage and check for end of battle.
   */
  const updateFightBars = () => {
    set((prev) => {
      if (!prev.fight.cfg || prev.fight.over) return prev;
      let ehealth = prev.ehealth;
      let poisonTurns = prev.fight.poisonTurns;
      if (poisonTurns > 0 && ehealth > 0) {
        ehealth = Math.max(0, ehealth - 5);
        poisonTurns -= 1;
        fightPush('Poison deals 5 damage to the enemy.');
      }
      return { ...prev, ehealth, fight: { ...prev.fight, poisonTurns } };
    });
  };

  /**
   * Executes a combat action. Each action has unique behaviour and may use or
   * consume potions. The fight ends automatically when either combatant drops
   * to zero health.
   */
  const playerAction = (action: 'strike' | 'block' | 'heal' | 'dmg_pot' | 'lightning' | 'sleep' | 'poison') => {
    if (!s.fight.cfg || s.fight.over) return;
    const cfg = s.fight.cfg;
    let stunnedNow = false;
    let pdamage = 0;
    if (action === 'strike') {
      pdamage = rand(s.minDmg, s.maxDmg);
      fightPush(`You struck the enemy for ${pdamage} damage.`);
    } else if (action === 'block') {
      const blk = rand(10, 30);
      pdamage = -blk;
      fightPush(`You prepare to block ${blk} damage.`);
    } else if (action === 'heal') {
      if (s.inventory.hpotion > 0) {
        set((prev) => ({
          ...prev,
          phealth: 100,
          inventory: { ...prev.inventory, hpotion: prev.inventory.hpotion - 1 },
        }));
        fightPush('You healed to full health.');
      } else fightPush('No Health potions left.');
      updateFightBars();
      return;
    } else if (action === 'dmg_pot') {
      if (s.inventory.dpotion > 0) {
        const bonus = 10;
        pdamage = rand(s.minDmg, s.maxDmg) + bonus;
        set((prev) => ({ ...prev, inventory: { ...prev.inventory, dpotion: prev.inventory.dpotion - 1 } }));
        fightPush(`Damage Potion used. +${bonus} bonus. You hit for ${pdamage} damage.`);
      } else {
        fightPush('No Damage potions left.');
        return;
      }
    } else if (action === 'lightning') {
      if (s.inventory.lightning_potion > 0) {
        set((prev) => ({
          ...prev,
          inventory: { ...prev.inventory, lightning_potion: prev.inventory.lightning_potion - 1 },
        }));
        stunnedNow = true;
        fightPush('Lightning potion used. Enemy is stunned next turn.');
      } else fightPush('No Lightning potions left.');
      updateFightBars();
      return;
    } else if (action === 'sleep') {
      if (s.inventory.sleep_potion > 0) {
        set((prev) => ({
          ...prev,
          inventory: { ...prev.inventory, sleep_potion: prev.inventory.sleep_potion - 1 },
        }));
        stunnedNow = true;
        fightPush('Sleep potion used. Enemy sleeps for one turn.');
      } else fightPush('No Sleep potions left.');
      updateFightBars();
      return;
    } else if (action === 'poison') {
      if (s.inventory.poison_potion > 0) {
        set((prev) => ({
          ...prev,
          fight: { ...prev.fight, poisonTurns: 3 },
          inventory: { ...prev.inventory, poison_potion: prev.inventory.poison_potion - 1 },
        }));
        fightPush('Poison applied. Enemy will take damage over 3 turns.');
      } else fightPush('No Poison potions left.');
      updateFightBars();
      return;
    }
    // Apply player damage to enemy.
    if (pdamage >= 0) set((prev) => ({ ...prev, ehealth: Math.max(0, prev.ehealth - pdamage) }));
    // Enemy turn or skip if stunned.
    if (s.fight.stunned) {
      fightPush('Enemy is stunned and skips its turn.');
      set((prev) => ({ ...prev, fight: { ...prev.fight, stunned: false } }));
    } else {
      const raw = rand(cfg.damage_min, cfg.damage_max);
      const edmg = pdamage < 0 ? Math.max(0, raw + pdamage) : raw;
      set((prev) => ({ ...prev, phealth: Math.max(0, prev.phealth - edmg) }));
      fightPush(`Enemy attacks and deals ${edmg} damage.`);
    }
    // Stun applies next turn.
    if (stunnedNow) set((prev) => ({ ...prev, fight: { ...prev.fight, stunned: true } }));
    updateFightBars();
    // Check end conditions.
    set((prev) => {
      if (!prev.fight.cfg) return prev;
      const over = prev.ehealth <= 0 || prev.phealth <= 0;
      if (!over) return prev;
      if (prev.ehealth <= 0) {
        const reward = rand(prev.fight.cfg.coins_min, prev.fight.cfg.coins_max);
        fightPush(`You defeated the enemy. Earned ${reward} coins.`);
        return { ...prev, money: prev.money + reward, wfight: prev.wfight + 1, fight: { ...prev.fight, over: true } };
      } else {
        fightPush('You were defeated. Retreating to your kingdom.');
        return { ...prev, lfight: prev.lfight + 1, fight: { ...prev.fight, over: true } };
      }
    });
  };

  // Global keyboard shortcuts: save (F2), sleep (F5), shop (Ctrl+S), policies (Ctrl+P).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        save();
      }
      if (e.key === 'F5') {
        e.preventDefault();
        command_sleep();
      }
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setShopOpen(true);
      }
      if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setPolOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Header line summarising current state for display.
  const headerStat = `${s.name} | Day ${s.day} | ${s.currentEra} | ${s.money} coins`;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Sticky header with title, status and utility buttons. */}
      <header style={{ background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', boxShadow: 'var(--shadow)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Kingdom Simulator</div>
        <div style={{ color: 'var(--muted)' }}>{headerStat}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn accent" onClick={save}>Save</button>
          <button className="btn" onClick={() => document.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light')}>Toggle Theme</button>
        </div>
      </header>

      {/* Menu screen: choose name, load save or clear save. */}
      {screen === 'menu' ? (
        <div style={{ flex: 1 }} className="center">
          <div className="modal" style={{ maxWidth: 720 }}>
            <h2 className="title">Start</h2>
            <div className="sep" />
            <p>Welcome. Name your kingdom and begin, or load your last save.</p>
            <div className="row">
              <label htmlFor="nm">Kingdom Name</label>
              <input id="nm" placeholder="Type a name" value={menuName} onChange={(e) => setMenuName(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                className="btn accent"
                onClick={() => {
                  set((prev) => ({ ...prev, name: menuName.trim() || 'kingdom name' }));
                  setScreen('main');
                  appendLog(`${menuName.trim() || 'kingdom name'}, it is. Use the actions on the left to play.`, 'system');
                  appendLog('==================================================', 'muted');
                }}
              >
                New Game
              </button>
              <button
                className="btn"
                onClick={() => {
                  if (load()) setScreen('main');
                }}
              >
                Load Save
              </button>
              <button className="btn danger" onClick={clearSave}>Clear Save</button>
            </div>
            <div className="sep" />
            <small className="muted">No pop ups. Everything runs in this page.</small>
          </div>
        </div>
      ) : (
        <main style={{ flex: 1 }}>
          <div className="grid-3">
            {/* Left column: primary actions. */}
            <aside className="card actions">
              <div className="section-title">Actions</div>
              <button className="btn accent" onClick={command_sleep}>Sleep</button>
              <button className="btn" onClick={command_tax} disabled={!can.tax} title={!can.tax ? 'Requires happiness ≥ 1 and strength ≥ 1' : ''}>Tax</button>
              <button className="btn" onClick={command_pay} disabled={!can.pay} title={!can.pay ? 'Requires people ≥ 1, money ≥ 5, strength ≥ 1' : ''}>Pay</button>
              <button className="btn" onClick={command_expand} disabled={!can.expand} title={!can.expand ? 'Need coins, strength, and not at top age' : ''}>Expand</button>
              <button className="btn" onClick={() => setFightOpen(true)} disabled={!can.fight} title={!can.fight ? 'Too exhausted to fight' : ''}>Fight</button>
              <button className="btn" onClick={openBuild} disabled={!can.build} title={!can.build ? 'No slots, coins, or strength to build' : ''}>Build</button>
              <button className="btn" onClick={() => document.getElementById('tab-inventory-btn')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}>Inventory</button>
              <button className="btn" onClick={() => setShopOpen(true)}>Shop</button>
              <button className="btn" onClick={() => setPolOpen(true)}>Policies</button>
              <button className="btn" onClick={() => setScreen('menu')}>Menu</button>
              <div className="sep" />
              <small className="muted">Shortcuts: F2 save, F5 sleep, Ctrl+S shop, Ctrl+P policies.</small>
            </aside>

            {/* Centre column: tabs for log, inventory and merchant. */}
            <section className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <Tabs
                s={s}
                logRef={logRef}
                pending={s.pendingMerchant}
                onBuy={buyMerchant}
                onDismiss={() => set((prev) => ({ ...prev, pendingMerchant: null }))}
              />
            </section>

            {/* Right column: summary statistics. */}
            <aside className="card">
              <div className="section-title">Stats</div>
              <KV k="Age" v={s.currentEra} />
              <KV k="Day" v={String(s.day)} />
              <KV k="Money" v={String(s.money)} />
              <KV k="Population" v={`${s.people}/${s.maxpeople}`} />
              <KV k="Happiness" v={String(s.happiness)} />
              <KV k="Food" v={String(s.inventory.bread)} />
              <KV k="Sword" v={s.currentSword} />
              <KV k="Strength" v={`${s.strength}/${s.maxstrength}`} />
              <div className="sep" />
              <KV k="Buildings" v={`${s.buildings.length}/${s.maxBuildings}`} />
            </aside>
          </div>
        </main>
      )}

      {/* Fight overlay: choose difficulty or battle view depending on fight state. */}
      {fightOpen && (
        <Overlay onClose={() => setFightOpen(false)}>
          <h3 style={{ margin: '0 0 8px 0' }}>Battle</h3>
          <div className="cols-2">
            <div>
              {!s.fight.cfg ? (
                <>
                  <div className="muted" style={{ marginBottom: 6 }}>Start fight:</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn" onClick={() => startFight('EASY')} disabled={!can.fight}>Easy</button>
                    <button className="btn" onClick={() => startFight('MEDIUM')} disabled={!can.fight}>Medium</button>
                    <button className="btn" onClick={() => startFight('HARD')} disabled={!can.fight}>Hard</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="muted">Your Health</div>
                  <Bar pct={s.phealth} />
                  <div style={{ margin: '4px 0 10px 0' }}>{s.phealth}</div>
                  <div className="muted">Enemy Health</div>
                  <Bar pct={Math.max(0, Math.min(100, (100 * s.ehealth) / Math.max(1, s.fight.cfg?.health || 100)))} />
                  <div style={{ margin: '4px 0 10px 0' }}>{s.ehealth}</div>
                  <div className="grid-btns" style={{ marginTop: 8 }}>
                    <button className="btn" onClick={() => playerAction('strike')} disabled={s.fight.over}>Strike</button>
                    <button className="btn" onClick={() => playerAction('block')} disabled={s.fight.over}>Block</button>
                    <button className="btn" onClick={() => playerAction('heal')} disabled={s.fight.over || s.inventory.hpotion <= 0} title={s.inventory.hpotion <= 0 ? 'No Health potions' : ''}>Heal</button>
                    <button className="btn" onClick={() => playerAction('dmg_pot')} disabled={s.fight.over || s.inventory.dpotion <= 0} title={s.inventory.dpotion <= 0 ? 'No Damage potions' : ''}>Damage Potion</button>
                    <button className="btn" onClick={() => playerAction('lightning')} disabled={s.fight.over || s.inventory.lightning_potion <= 0} title={s.inventory.lightning_potion <= 0 ? 'No Lightning potions' : ''}>Lightning</button>
                    <button className="btn" onClick={() => playerAction('sleep')} disabled={s.fight.over || s.inventory.sleep_potion <= 0} title={s.inventory.sleep_potion <= 0 ? 'No Sleep potions' : ''}>Sleep</button>
                    <button className="btn" onClick={() => playerAction('poison')} disabled={s.fight.over || s.inventory.poison_potion <= 0} title={s.inventory.poison_potion <= 0 ? 'No Poison potions' : ''}>Poison</button>
                  </div>
                </>
              )}
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <button className="btn danger" onClick={() => setFightOpen(false)}>End Battle</button>
              </div>
            </div>
            <div>
              <div className="log" ref={fightLogRef} style={{ height: 310 }} />
            </div>
          </div>
        </Overlay>
      )}

      {/* Shop overlay: buy potions, food and weapons. */}
      {shopOpen && (
        <Overlay onClose={() => setShopOpen(false)}>
          <h3 style={{ margin: '0 0 8px 0' }}>Shop</h3>
          <Shop s={s} onBuyStack={buyStack} onBuyWeapon={buyWeapon} />
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <button className="btn" onClick={() => setShopOpen(false)}>Close</button>
          </div>
        </Overlay>
      )}

      {/* Policies overlay: view and toggle policy cards. */}
      {polOpen && (
        <Overlay onClose={() => setPolOpen(false)}>
          <h3 style={{ margin: '0 0 8px 0' }}>Policies</h3>
          <div>
            {Object.entries(s.policies).map(([name, data]) => (
              <div className="row" key={name}>
                <div>
                  <div>
                    <strong>{name}</strong>{' '}
                    {data.locked ? (
                      <span className="pill">Locked</span>
                    ) : data.active ? (
                      <span className="pill">Active</span>
                    ) : (
                      <span className="pill">Inactive</span>
                    )}
                  </div>
                  <div className="muted">{data.desc}</div>
                </div>
                <button
                  className="btn"
                  disabled={data.locked}
                  onClick={() => {
                    set((prev) => ({ ...prev, policies: { ...prev.policies, [name]: { ...data, active: !data.active } } }));
                    appendLog(`${name} is now ${!data.active ? 'ENABLED' : 'DISABLED'}.`, 'system');
                  }}
                >
                  {data.locked ? 'Locked' : data.active ? 'Disable' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <button className="btn" onClick={() => setPolOpen(false)}>Close</button>
          </div>
        </Overlay>
      )}

      {/* Build overlay: choose which building to construct. */}
      {buildOpen && (
        <Overlay onClose={() => setBuildOpen(false)}>
          <h3 style={{ margin: '0 0 8px 0' }}>Construct a Building</h3>
          <p>You have {s.buildings.length} of {s.maxBuildings} building slots filled.</p>
          <div>
            {BUILDING_OPTIONS.map((b) => {
              const disabled = s.money < b.cost || s.buildings.length >= s.maxBuildings || s.strength < 1;
              return (
                <div className="row" key={b.id}>
                  <div>
                    <strong>{b.name}</strong> – {b.description}{' '}
                    <span className="muted">({b.cost} coins)</span>
                  </div>
                  <button className="btn" disabled={disabled} onClick={() => buildBuilding(b.id)} title={disabled ? 'Not enough coins, strength or slots' : ''}>
                    Build
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <button className="btn" onClick={() => setBuildOpen(false)}>Close</button>
          </div>
        </Overlay>
      )}

      {/* Choice event overlay: present choices to the player. */}
      {s.choiceEvent && (
        <div className="overlay show" onMouseDown={(e) => e.target === e.currentTarget && set((prev) => ({ ...prev, choiceEvent: null }))}>
          <div className="event-box">
            <h3 style={{ marginTop: 0 }}>{s.choiceEvent.description}</h3>
            {s.choiceEvent.options.map((opt, idx) => (
              <button key={idx} className="btn" style={{ display: 'block', width: '100%', margin: '8px 0' }} onClick={() => resolveChoice(opt)}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- UI helper components ---------- */
function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="row">
      <div className="kv">
        <div className="k">{k}</div>
        <div className="v">{v}</div>
      </div>
    </div>
  );
}

function Tabs({ s, logRef, pending, onBuy, onDismiss }: { s: State; logRef: React.RefObject<HTMLDivElement>; pending: MerchantOffer | null; onBuy: () => void; onDismiss: () => void; }) {
  const [tab, setTab] = useState<'log' | 'inventory' | 'merchant'>('log');
  return (
    <>
      <div className="tabs">
        <div className={`tab ${tab === 'log' ? 'active' : ''}`} onClick={() => setTab('log')}>Log</div>
        <div id="tab-inventory-btn" className={`tab ${tab === 'inventory' ? 'active' : ''}`} onClick={() => setTab('inventory')}>Inventory</div>
        <div className={`tab ${tab === 'merchant' ? 'active' : ''}`} onClick={() => setTab('merchant')}>Merchant</div>
      </div>
      {tab === 'log' && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <div ref={logRef} className="log">
            {s.logs.map((l) => (
              <div key={l.id} className={l.tag}>{l.text}</div>
            ))}
          </div>
        </div>
      )}
      {tab === 'inventory' && (
        <div>
          <InvRow label="Health Potion" value={s.inventory.hpotion} />
          <InvRow label="Mana Potion" value={s.inventory.mpotion} />
          <InvRow label="Stamina Potion" value={s.inventory.spotion} />
          <InvRow label="Damage Potion" value={s.inventory.dpotion} />
          <InvRow label="Lightning Potion" value={s.inventory.lightning_potion} />
          <InvRow label="Sleep Potion" value={s.inventory.sleep_potion} />
          <InvRow label="Poison Potion" value={s.inventory.poison_potion} />
          <div className="sep" />
          <InvRow label="Bread" value={s.inventory.bread} />
          <InvRow label="Meat" value={s.inventory.meat} />
          <InvRow label="Fruit" value={s.inventory.fruit} />
          <InvRow label="Cheese" value={s.inventory.cheese} />
          <div className="sep" />
          <InvRow label="Weapon" value={s.currentSword} />
          <InvRow label="Coins" value={s.money} />
          <InvRow label="Expansion Cost" value={s.exmoney} />
        </div>
      )}
      {tab === 'merchant' && (
        <div id="tab-merchant">
          <div className="merchant-box">
            <div className="muted">
              {!pending
                ? 'No active offer.'
                : pending.kind === 'weapon'
                ? `${pending.name} (+${pending.bonus} DMG) for ${pending.price} coins`
                : pending.effect === 'happiness'
                ? `${pending.name} (+5 happiness) for ${pending.price} coins`
                : pending.effect === 'maxstrength'
                ? `${pending.name} (+1 max strength) for ${pending.price} coins`
                : `${pending.name} (collectible) for ${pending.price} coins`}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={onBuy} disabled={!pending}>Buy</button>
              <button className="btn" onClick={onDismiss} disabled={!pending}>Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InvRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="row">
      <div className="kv">
        <div className="k">{label}</div>
        <div className="v">{String(value)}</div>
      </div>
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="bar">
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="overlay show" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">{children}</div>
    </div>
  );
}

function Shop({ s, onBuyStack, onBuyWeapon }: { s: State; onBuyStack: (k: keyof State['inventory'], p: number, q: number, n: string) => void; onBuyWeapon: (era: EraId, wid: number) => void; }) {
  const [tab, setTab] = useState<'potions' | 'food' | 'weapons'>('potions');
  return (
    <>
      <div className="tabs">
        <div className={`tab ${tab === 'potions' ? 'active' : ''}`} onClick={() => setTab('potions')}>Potions</div>
        <div className={`tab ${tab === 'food' ? 'active' : ''}`} onClick={() => setTab('food')}>Food</div>
        <div className={`tab ${tab === 'weapons' ? 'active' : ''}`} onClick={() => setTab('weapons')}>Weapons</div>
        <div className="pill" style={{ marginLeft: 'auto' }}>
          Wallet: <span>{s.money}</span>
        </div>
      </div>
      {tab === 'potions' && POTIONS.map((it) => <ShopRow key={it.id} title={it.name} price={it.price} money={s.money} onBuy={(q) => onBuyStack(it.var, it.price, q, it.name)} />)}
      {tab === 'food' && FOOD.map((it) => <ShopRow key={it.id} title={it.name} price={it.price} money={s.money} onBuy={(q) => onBuyStack(it.var, it.price, q, it.name)} />)}
      {tab === 'weapons' && (
        <div>
          {Object.keys(ERAS)
            .map(Number)
            .sort((a, b) => a - b)
            .map((era) => (
              <div key={era} style={{ marginTop: 8 }}>
                <div className="section-title">{ERAS[era as EraId]}</div>
                {WEAPONS.filter((w) => w.era === (era as EraId)).map((w) => {
                  const locked = w.id <= (s.owned_weapon[era as EraId] || 0);
                  return (
                    <div className="shop-row" key={`${era}-${w.id}`}>
                      <div>[{w.id}] {w.name} +{w.damage} DMG</div>
                      <div className="muted">{locked ? 'LOCKED' : `${w.price} coins`}</div>
                      <div />
                      <button className="btn" disabled={locked || s.money < w.price} onClick={() => onBuyWeapon(era as EraId, w.id)}>
                        Buy
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
      )}
    </>
  );
}

function ShopRow({ title, price, money, onBuy }: { title: string; price: number; money: number; onBuy: (qty: number) => void }) {
  const [qty, setQty] = useState(1);
  const total = price * qty;
  const disabled = total > money;
  return (
    <div className="shop-row">
      <div>{title}</div>
      <div className="muted">{price} coins</div>
      <input className="spin" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))} />
      <button className="btn" onClick={() => onBuy(qty)} disabled={disabled} title={disabled ? 'Not enough coins' : ''}>
        Buy
      </button>
    </div>
  );
}

// Mount the React application into the root element. Creates the root if necessary.
const rootEl = document.getElementById('root')!;
createRoot(rootEl).render(<App />);