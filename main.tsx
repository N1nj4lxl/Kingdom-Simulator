import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

/* ---------- Data & Types ---------- */

type Tag = "event" | "good" | "warn" | "danger" | "system" | "merchant" | "muted";
type EraId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type Weapon = { id: number; era: EraId; name: string; price: number; damage: number };
type Item = { id: number; name: string; price: number; var: keyof Inventory };
type EnemyCfg = { health: number; damage_min: number; damage_max: number; coins_min: number; coins_max: number };

type Policies = {
  [k: string]: { locked: boolean; active: boolean; desc: string };
};

type Inventory = {
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

type MerchantWeaponOffer = { kind: "weapon"; name: string; bonus: number; price: number };
type MerchantUniqueOffer =
  | { kind: "unique"; name: "Golden Cheese"; effect: "happiness"; value: number; price: number }
  | { kind: "unique"; name: "Ancient Scroll"; effect: "maxstrength"; value: number; price: number }
  | { kind: "unique"; name: "Map Fragment"; effect: null; value: number; price: number };
type MerchantOffer = MerchantWeaponOffer | MerchantUniqueOffer;

type FightState = { cfg: EnemyCfg | null; stunned: boolean; poisonTurns: number };

type State = {
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
  inventory: Inventory;
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
  policies: Policies;
  logs: { text: string; tag: Tag; id: number }[];
  pendingMerchant: MerchantOffer | null;
  fight: FightState;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

const ERAS: Record<EraId, string> = {
  1: "Stone Age",
  2: "Bronze Age",
  3: "Iron Age",
  4: "Roman Age",
  5: "Medievil Age",
  6: "Electric Age",
  7: "Modern Age",
};
const ERA_SEQ = ["Bronze Age", "Iron Age", "Roman Age", "Medievil Age", "Electric Age", "Modern Age"];

const WEAPONS: Weapon[] = [
  { id: 1, era: 1, name: "Pebble", price: 1000, damage: 2 },
  { id: 2, era: 1, name: "Stone", price: 5000, damage: 5 },
  { id: 3, era: 1, name: "Rock", price: 7500, damage: 7 },
  { id: 4, era: 1, name: "Chiselled Stone", price: 12000, damage: 12 },
  { id: 5, era: 1, name: "Sharpened Rock", price: 16000, damage: 15 },

  { id: 1, era: 3, name: "Iron Spear", price: 165000, damage: 34 },
  { id: 2, era: 3, name: "Steel Sword", price: 200000, damage: 38 },
  { id: 3, era: 3, name: "Lance", price: 220000, damage: 42 },
  { id: 4, era: 3, name: "Axe", price: 235000, damage: 46 },
  { id: 5, era: 3, name: "Bow", price: 260000, damage: 50 },

  { id: 1, era: 5, name: "Socketed Axe", price: 30000, damage: 17 },
  { id: 2, era: 5, name: "Dagger", price: 45000, damage: 20 },
  { id: 3, era: 5, name: "Sickle Sword", price: 60000, damage: 24 },
  { id: 4, era: 5, name: "Reinforced Axe", price: 90000, damage: 27 },
  { id: 5, era: 5, name: "Dead Oak Bow", price: 120000, damage: 30 },

  { id: 1, era: 6, name: "Glock", price: 1045000, damage: 98 },
  { id: 2, era: 6, name: "Uzi", price: 1100000, damage: 100 },
  { id: 3, era: 6, name: "Maxim Gun", price: 1150000, damage: 102 },
  { id: 4, era: 6, name: "AK-47", price: 1200000, damage: 104 },
  { id: 5, era: 6, name: "M1 Garand", price: 1300000, damage: 106 },

  { id: 1, era: 7, name: "Composite Knife", price: 9000, damage: 75 },
  { id: 2, era: 7, name: "Smartsteel Katana", price: 12000, damage: 95 },
  { id: 3, era: 7, name: "Laser Saber", price: 20000, damage: 120 },
];

const POTIONS: Item[] = [
  { id: 1, name: "Health Potion", price: 500, var: "hpotion" },
  { id: 2, name: "Mana Potion", price: 750, var: "mpotion" },
  { id: 3, name: "Stamina Potion", price: 1000, var: "spotion" },
  { id: 4, name: "Damage Potion", price: 1500, var: "dpotion" },
  { id: 5, name: "Lightning Potion", price: 2000, var: "lightning_potion" },
  { id: 6, name: "Sleep Potion", price: 1800, var: "sleep_potion" },
  { id: 7, name: "Poison Potion", price: 1700, var: "poison_potion" },
];

const FOOD: Item[] = [
  { id: 1, name: "Bread", price: 20, var: "bread" },
  { id: 2, name: "Meat", price: 50, var: "meat" },
  { id: 3, name: "Fruit", price: 30, var: "fruit" },
  { id: 4, name: "Cheese", price: 40, var: "cheese" },
];

const ENEMY: Record<"EASY" | "MEDIUM" | "HARD", EnemyCfg> = {
  EASY: { health: 100, damage_min: 2, damage_max: 7, coins_min: 50, coins_max: 150 },
  MEDIUM: { health: 200, damage_min: 7, damage_max: 12, coins_min: 100, coins_max: 500 },
  HARD: { health: 300, damage_min: 10, damage_max: 20, coins_min: 150, coins_max: 800 },
};

const MERCHANT_BY_ERA: Record<string, { name: string; bonus: number; price: number; rarity: "Common" | "Rare" | "Epic" }[]> = {
  "Stone Age": [
    { name: "Sharpened Bone", bonus: 15, price: 600, rarity: "Common" },
    { name: "Jagged Flint Axe", bonus: 20, price: 1200, rarity: "Rare" },
    { name: "Mammoth Fang Blade", bonus: 30, price: 2000, rarity: "Epic" },
  ],
  "Bronze Age": [
    { name: "Bronze Shortblade", bonus: 22, price: 1400, rarity: "Common" },
    { name: "Fire-Hardened Spear", bonus: 30, price: 2400, rarity: "Rare" },
    { name: "Sun-Kissed Dagger", bonus: 38, price: 3500, rarity: "Epic" },
  ],
  "Iron Age": [
    { name: "Iron Cleaver", bonus: 35, price: 3000, rarity: "Common" },
    { name: "Spiked Mace", bonus: 42, price: 4000, rarity: "Rare" },
    { name: "Molten Iron Blade", bonus: 52, price: 5500, rarity: "Epic" },
  ],
  "Roman Age": [
    { name: "Legionnaire’s Gladius", bonus: 40, price: 3500, rarity: "Common" },
    { name: "Colosseum Cutter", bonus: 50, price: 5000, rarity: "Rare" },
    { name: "Centurion’s Edge", bonus: 65, price: 7500, rarity: "Epic" },
  ],
  "Medievil Age": [
    { name: "Crusader Sword", bonus: 50, price: 5000, rarity: "Common" },
    { name: "Dragonsteel Falchion", bonus: 60, price: 7000, rarity: "Rare" },
    { name: "Vampire Slayer", bonus: 80, price: 10000, rarity: "Epic" },
  ],
  "Electric Age": [
    { name: "Insulated Cutter", bonus: 65, price: 7000, rarity: "Common" },
    { name: "Arc Blade", bonus: 80, price: 10000, rarity: "Rare" },
    { name: "Tesla Edge", bonus: 100, price: 15000, rarity: "Epic" },
  ],
  "Modern Age": [
    { name: "Composite Tactical Knife", bonus: 75, price: 9000, rarity: "Common" },
    { name: "Smartsteel Katana", bonus: 95, price: 12000, rarity: "Rare" },
    { name: "Prototype Laser Saber", bonus: 120, price: 20000, rarity: "Epic" },
  ],
};

/* ---------- App ---------- */

const SAVE_KEY = "kingdom_save_v1_tsx";

function usePersistentTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}

function initialState(): State {
  return {
    name: "kingdom name",
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
    currentEra: "Stone Age",
    currentSword: "None",
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
      "Universal Tax": { locked: true, active: false, desc: "Gain more tax money, but lower happiness." },
      "Charity Relief": { locked: true, active: false, desc: "Lose money per day to boost happiness." },
      "Royal Festival": { locked: true, active: false, desc: "Auto-celebrates a festival every 5 days." },
      "Food Rationing": { locked: true, active: false, desc: "Reduce food consumption, reduce happiness." },
      "Open Borders": { locked: true, active: false, desc: "Chance for more migrants, but occasional unrest." },
      "Public Health": { locked: true, active: false, desc: "Reduces sickness, small gold cost daily." },
      "Work Tax Rebate": { locked: true, active: false, desc: "Boost worker morale, costs coins." },
      "Electric Welfare": { locked: true, active: false, desc: "Auto-fixes disasters. Electric+ only." },
    },
    logs: [],
    pendingMerchant: null,
    fight: { cfg: null, stunned: false, poisonTurns: 0 },
  };
}

function App() {
  const [screen, setScreen] = useState<"menu" | "main">("menu");
  const [s, set] = useState<State>(() => initialState());
  const [fightOpen, setFightOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [polOpen, setPolOpen] = useState(false);
  const { toggle } = usePersistentTheme();
  const logRef = useRef<HTMLDivElement>(null);
  const fightLogRef = useRef<HTMLDivElement>(null);
  const [menuName, setMenuName] = useState("");

  const appendLog = (text: string, tag: Tag = "event") =>
    set((prev) => {
      const nextLogs = [...prev.logs, { text, tag, id: prev.logs.length ? prev.logs[prev.logs.length - 1].id + 1 : 1 }];
      return { ...prev, logs: nextLogs.slice(-600) };
    });

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [s.logs]);

  const save = () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    appendLog("Game saved.", "system");
  };

  const load = () => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      appendLog("No save found.", "system");
      return false;
    }
    try {
      const parsed: State = JSON.parse(raw);
      set(parsed);
      appendLog("Game loaded.", "system");
      return true;
    } catch {
      appendLog("Failed to load save.", "danger");
      return false;
    }
  };

  const clearSave = () => {
    localStorage.removeItem(SAVE_KEY);
    appendLog("Save cleared.", "system");
  };

  const discountedPrice = (base: number) => {
    const discPct = s.merchant_relationship * 6;
    const disc = Math.floor(base * (discPct / 100));
    return { final: base - disc, discPct };
  };

  const showMerchantOffer = (payload: MerchantOffer) => {
    set((prev) => ({ ...prev, pendingMerchant: payload }));
  };

  const random_event = () => {
    const roll = rand(1, 100);
    if (roll <= 10) {
      set((prev) => {
        const loss = rand(100, 300);
        const happinessLoss = rand(5, 15);
        appendLog(`Protest in the streets. Lost ${loss} coins. Happiness reduced.`, "warn");
        return {
          ...prev,
          pmoney: prev.pmoney + 1,
          money: Math.max(0, prev.money - loss),
          happiness: clamp(prev.happiness - happinessLoss, 0, 100),
        };
      });
    } else if (roll <= 20) {
      const outcome = rand(1, 10);
      if (outcome <= 6) {
        const reward = rand(300, 800);
        set((prev) => ({ ...prev, money: prev.money + reward }));
        appendLog(`You repelled a rogue faction and looted ${reward} coins.`, "good");
      } else {
        const loss = rand(100, 400);
        set((prev) => ({
          ...prev,
          people: Math.max(0, prev.people - rand(3, 10)),
          money: Math.max(0, prev.money - loss),
        }));
        appendLog(`You lost to a rogue faction. People and ${loss} coins lost.`, "warn");
      }
    } else if (roll <= 30) {
      merchant_event();
    } else if (roll <= 40) {
      if (Math.random() < 0.5) {
        const lost = rand(5, 15);
        set((prev) => ({
          ...prev,
          people: Math.max(0, prev.people - lost),
          inventory: { ...prev.inventory, bread: Math.max(0, prev.inventory.bread - lost) },
          happiness: clamp(prev.happiness - 10, 0, 100),
        }));
        appendLog(`Famine struck. ${lost} people died and food supplies dwindled.`, "warn");
      } else {
        const loss = rand(10, 20);
        set((prev) => ({
          ...prev,
          inventory: { ...prev.inventory, bread: Math.max(0, prev.inventory.bread - loss) },
          happiness: clamp(prev.happiness - 5, 0, 100),
        }));
        appendLog(`Flooding damaged crops. ${loss} bread lost.`, "warn");
      }
    } else if (roll <= 50) {
      set((prev) => ({ ...prev, happiness: clamp(prev.happiness + 10, 0, 100) }));
      appendLog("A royal decision pleased the people. Happiness rises.", "good");
    } else if (roll <= 55) {
      if (Math.random() < 0.5) {
        set((prev) => ({
          ...prev,
          happiness: clamp(prev.happiness - 10, 0, 100),
          money: Math.max(0, prev.money - 200),
        }));
        appendLog("A cursed relic brought misfortune.", "warn");
      } else {
        set((prev) => ({ ...prev, happiness: clamp(prev.happiness + 10, 0, 100), money: prev.money + 500 }));
        appendLog("An enchanted relic blessed the land. +500 coins.", "good");
      }
    } else if (roll <= 60) {
      const locked = Object.keys(s.policies).filter((k) => s.policies[k].locked);
      if (locked.length) {
        const key = locked[Math.floor(Math.random() * locked.length)];
        set((prev) => ({ ...prev, policies: { ...prev.policies, [key]: { ...prev.policies[key], locked: false } } }));
        appendLog(`New policy emerged: ${key}. ${s.policies[key].desc}`, "system");
      }
    } else if (roll <= 70) {
      const bonus = rand(10, 30);
      set((prev) => ({ ...prev, happiness: clamp(prev.happiness + bonus, 0, 100) }));
      appendLog(`A festival boosted morale. +${bonus} happiness.`, "good");
    } else if (roll <= 80) {
      const coins = rand(200, 600);
      set((prev) => ({ ...prev, money: prev.money + coins }));
      appendLog(`Buried treasure found. +${coins} coins.`, "good");
    } else {
      appendLog("A calm day passes.", "muted");
    }
  };

  const merchant_event = () => {
    let offerType: "weapon" | "unique" = "unique";
    if (s.currentEra in MERCHANT_BY_ERA && !(s.currentEra in s.merchant_weapon_log)) {
      if (rand(1, 100) <= 3 && s.last_merchant_offer_type !== "weapon") offerType = "weapon";
    }
    if (offerType === s.last_merchant_offer_type) offerType = "unique";

    if (offerType === "weapon") {
      const pool = MERCHANT_BY_ERA[s.currentEra];
      const weighted: typeof pool = [];
      for (const w of pool) {
        const n = w.rarity === "Common" ? 3 : w.rarity === "Rare" ? 2 : 1;
        for (let i = 0; i < n; i++) weighted.push(w);
      }
      const sel = weighted[Math.floor(Math.random() * weighted.length)];
      const { final, discPct } = discountedPrice(sel.price);
      appendLog(
        `Merchant offers a ${sel.rarity} weapon: ${sel.name} (+${sel.bonus} DMG). Price ${final} coins (${discPct}% off).`,
        "merchant"
      );
      showMerchantOffer({ kind: "weapon", name: sel.name, bonus: sel.bonus, price: final });
      set((prev) => ({ ...prev, last_merchant_offer_type: "weapon" }));
    } else {
      const rare: MerchantUniqueOffer[] = [
        { kind: "unique", name: "Golden Cheese", effect: "happiness", value: 5, price: 700 },
        { kind: "unique", name: "Ancient Scroll", effect: "maxstrength", value: 1, price: 1000 },
        { kind: "unique", name: "Map Fragment", effect: null, value: 0, price: 800 },
      ].filter((x) => x.name !== s.last_merchant_offer_type) as MerchantUniqueOffer[];
      const sel = rare[Math.floor(Math.random() * rare.length)];
      const { final } = discountedPrice(sel.price);
      appendLog(`Merchant offers ${sel.name}. Price ${final} coins.`, "merchant");
      showMerchantOffer({ ...sel, price: final });
      set((prev) => ({ ...prev, last_merchant_offer_type: sel.name }));
    }
  };

  const command_sleep = () => {
    set((prev) => {
      let bread = prev.inventory.bread;
      const strength = prev.maxstrength;
      const day = prev.day + 1;
      let happiness = prev.happiness;
      let people = prev.people;
      const required_food = prev.policies["Food Rationing"].active ? Math.floor(prev.people * 0.75) : prev.people;
      if (bread >= required_food) {
        bread -= required_food;
        appendLog(`You consumed ${required_food} food for your population.`, "event");
      } else {
        const shortage = required_food - bread;
        bread = 0;
        const happiness_loss = Math.floor(shortage / 2);
        const people_lost = Math.floor(shortage / 5);
        happiness = clamp(happiness - happiness_loss, 0, 100);
        people = Math.max(0, people - people_lost);
        appendLog(`Food Shortage. Lost ${people_lost} people, happiness -${happiness_loss}.`, "warn");
      }
      const inventory = { ...prev.inventory, bread };
      const next = { ...prev, day, strength, inventory, happiness, people };

      const r = rand(1, 100);
      if (r <= 15) {
        const loss = rand(50, 200);
        next.money = Math.max(0, next.money - loss);
        appendLog(`Bandits raided your treasury. Lost ${loss} coins.`, "warn");
      } else if (r <= 30) {
        const g = rand(5, 15);
        next.happiness = clamp(next.happiness + g, 0, 100);
        appendLog(`Festival. Happiness +${g}.`, "good");
      } else if (r <= 40) {
        const p = rand(3, 10);
        next.people = Math.min(next.maxpeople, next.people + p);
        appendLog(`Travellers joined your kingdom. +${p} population.`, "good");
      }

      const flavour: Record<string, string> = {
        "Stone Age": "Your people are learning to craft stone tools.",
        "Bronze Age": "Metalworking begins to shape the future of your army.",
        "Iron Age": "Blacksmiths forge powerful weapons.",
        "Roman Age": "Infrastructure expands under imperial guidance.",
        "Medievil Age": "Armies are growing and the people whisper of war.",
        "Electric Age": "Inventions surge across your cities.",
        "Modern Age": "Skyscrapers rise as society industrialises.",
      };
      if (flavour[next.currentEra]) appendLog(flavour[next.currentEra], "muted");

      if ([next.death_day - 10, next.death_day - 5].includes(next.day)) appendLog("You feel your age catching up to you...", "muted");
      if (next.day >= next.death_day) {
        appendLog("Your time has come. Your kingdom now lives on in legend.", "danger");
        return next;
      }

      if (next.policies["Universal Tax"].active) {
        const bonus = rand(20, 50);
        next.money += bonus;
        next.happiness = clamp(next.happiness - 2, 0, 100);
        appendLog(`Universal Tax active: +${bonus} coins, -2 happiness.`, "system");
      }
      if (next.policies["Charity Relief"].active) {
        const cost = 30;
        if (next.money >= cost) {
          next.money -= cost;
          next.happiness = clamp(next.happiness + 4, 0, 100);
          appendLog("Charity Relief: -30 coins, +4 happiness.", "system");
        }
      }
      if (next.policies["Royal Festival"].active && next.day % 5 === 0) {
        next.happiness = clamp(next.happiness + 8, 0, 100);
        appendLog("Royal Festival held: +8 happiness.", "good");
      }
      if (next.policies["Public Health"].active) {
        if (rand(1, 100) <= 10) appendLog("Public Health prevented a disease outbreak.", "good");
        else next.happiness = clamp(next.happiness + 1, 0, 100);
      }
      if (next.policies["Open Borders"].active && rand(1, 100) <= 15) {
        const influx = rand(2, 8);
        next.people += influx;
        appendLog(`Open Borders: +${influx} migrants joined.`, "good");
      }
      if (next.policies["Electric Welfare"].active && next.currentEra === "Electric Age" && rand(1, 100) <= 20) {
        appendLog("Electric Welfare prevented a disaster.", "good");
      }
      return next;
    });
    random_event();
  };

  const command_tax = () => {
    if (s.happiness < 1) {
      appendLog("Your people were not happy and left. You became broke.", "danger");
      set((prev) => ({ ...prev, money: 0 }));
      return;
    }
    const delta = rand(1, 5);
    set((prev) => ({
      ...prev,
      happiness: clamp(prev.happiness - delta, 0, 100),
      money: prev.money + rand(25, 50),
      strength: Math.max(0, prev.strength - 1),
    }));
    appendLog(`You taxed the people: happiness -${delta}.`, "warn");
  };

  const command_pay = () => {
    if (s.people < 1) {
      appendLog(`You have no-one left in ${s.name}. You became broke and unpopular.`, "danger");
      set((prev) => ({ ...prev, money: 0 }));
      return;
    }
    set((prev) => ({
      ...prev,
      money: Math.max(0, prev.money - 5),
      happiness: clamp(prev.happiness + 5, 0, 100),
      strength: Math.max(0, prev.strength - 1),
    }));
    appendLog("You paid the people. Happiness +5.", "good");
  };

  const command_expand = () => {
    if (s.number >= 6) {
      appendLog("You are already at the top Age.", "muted");
      return;
    }
    if (s.money < s.exmoney) {
      appendLog(`You need ${s.exmoney - s.money} more coins to expand.`, "muted");
      return;
    }
    set((prev) => {
      const number = prev.number + 1;
      const currentEra = ERA_SEQ[number] || prev.currentEra;
      appendLog(`You advanced to ${currentEra}. Max population is now ${prev.maxpeople * 2}.`, "good");
      return {
        ...prev,
        money: prev.money - prev.exmoney,
        exmoney: prev.exmoney * 2,
        maxpeople: prev.maxpeople * 2,
        number,
        currentEra,
        maxstrength: Math.max(prev.maxstrength, 4),
        strength: Math.max(0, prev.strength - 1),
      };
    });
  };

  const buyStack = (key: keyof Inventory, price: number, qty: number, name: string) => {
    if (qty <= 0) return;
    const total = price * qty;
    if (s.money < total) {
      appendLog("Not enough coins.", "warn");
      return;
    }
    set((prev) => ({
      ...prev,
      money: prev.money - total,
      inventory: { ...prev.inventory, [key]: prev.inventory[key] + qty },
    }));
    appendLog(`Purchased ${qty} ${name}.`, "good");
  };

  const buyWeapon = (era: EraId, wid: number) => {
    const w = WEAPONS.find((x) => x.era === era && x.id === wid);
    if (!w) return;
    if (wid <= (s.owned_weapon[era] || 0)) {
      appendLog("That weapon is locked.", "muted");
      return;
    }
    if (s.money < w.price) {
      appendLog("Not enough coins.", "warn");
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
    appendLog(`Purchased ${w.name}.`, "good");
  };

  const buyMerchant = () => {
    const p = s.pendingMerchant;
    if (!p) return;
    if (s.money < p.price) {
      appendLog("You cannot afford it.", "warn");
      return;
    }
    if (p.kind === "weapon") {
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
      appendLog(`You purchased ${p.name}.`, "merchant");
    } else {
      set((prev) => {
        let happiness = prev.happiness;
        let maxstrength = prev.maxstrength;
        if (p.effect === "happiness") happiness = clamp(happiness + 5, 0, 100);
        if (p.effect === "maxstrength") maxstrength += 1;
        return {
          ...prev,
          money: prev.money - p.price,
          happiness,
          maxstrength,
          merchant_relationship: Math.min(5, prev.merchant_relationship + 1),
          pendingMerchant: null,
        };
      });
      appendLog(`You bought ${p.name}.`, "merchant");
    }
  };

  const startFight = (diff: "EASY" | "MEDIUM" | "HARD") => {
    set((prev) => ({ ...prev, ehealth: ENEMY[diff].health, phealth: 100, fight: { cfg: ENEMY[diff], stunned: false, poisonTurns: 0 } }));
    setFightOpen(true);
    if (fightLogRef.current) fightLogRef.current.textContent = "";
  };

  const fightPush = (msg: string) => {
    const el = fightLogRef.current;
    if (!el) return;
    const p = document.createElement("div");
    p.textContent = msg;
    el.appendChild(p);
    el.scrollTop = el.scrollHeight;
  };

  const playerAction = (action: "strike" | "block" | "heal" | "dmg_pot" | "lightning" | "sleep" | "poison") => {
    const cfg = s.fight.cfg;
    if (!cfg) return;
    let stunnedNow = false;
    let pdamage = 0;

    if (action === "strike") {
      pdamage = rand(s.minDmg, s.maxDmg);
      fightPush(`You struck the enemy for ${pdamage} damage.`);
    } else if (action === "block") {
      const blk = rand(10, 30);
      pdamage = -blk;
      fightPush(`You prepare to block ${blk} damage.`);
    } else if (action === "heal") {
      if (s.inventory.hpotion > 0) {
        set((prev) => ({ ...prev, phealth: 100, inventory: { ...prev.inventory, hpotion: prev.inventory.hpotion - 1 } }));
        fightPush("You healed to full health.");
      } else fightPush("No Health potions left.");
      updateFightBars();
      return;
    } else if (action === "dmg_pot") {
      if (s.inventory.dpotion > 0) {
        const bonus = 10;
        pdamage = rand(s.minDmg, s.maxDmg) + bonus;
        set((prev) => ({ ...prev, inventory: { ...prev.inventory, dpotion: prev.inventory.dpotion - 1 } }));
        fightPush(`Damage Potion used. +${bonus} bonus. You hit for ${pdamage} damage.`);
      } else {
        fightPush("No Damage potions left.");
        return;
      }
    } else if (action === "lightning") {
      if (s.inventory.lightning_potion > 0) {
        set((prev) => ({ ...prev, inventory: { ...prev.inventory, lightning_potion: prev.inventory.lightning_potion - 1 } }));
        stunnedNow = true;
        fightPush("Lightning potion used. Enemy is stunned next turn.");
      } else fightPush("No Lightning potions left.");
      updateFightBars();
      return;
    } else if (action === "sleep") {
      if (s.inventory.sleep_potion > 0) {
        set((prev) => ({ ...prev, inventory: { ...prev.inventory, sleep_potion: prev.inventory.sleep_potion - 1 } }));
        stunnedNow = true;
        fightPush("Sleep potion used. Enemy sleeps for one turn.");
      } else fightPush("No Sleep potions left.");
      updateFightBars();
      return;
    } else if (action === "poison") {
      if (s.inventory.poison_potion > 0) {
        set((prev) => ({
          ...prev,
          fight: { ...prev.fight, poisonTurns: 3 },
          inventory: { ...prev.inventory, poison_potion: prev.inventory.poison_potion - 1 },
        }));
        fightPush("Poison applied. Enemy will take damage over 3 turns.");
      } else fightPush("No Poison potions left.");
      updateFightBars();
      return;
    }

    if (pdamage >= 0) set((prev) => ({ ...prev, ehealth: Math.max(0, prev.ehealth - pdamage) }));

    if (s.fight.stunned) {
      fightPush("Enemy is stunned and skips its turn.");
      set((prev) => ({ ...prev, fight: { ...prev.fight, stunned: false } }));
    } else {
      const raw = rand(cfg.damage_min, cfg.damage_max);
      const edmg = pdamage < 0 ? Math.max(0, raw + pdamage) : raw;
      set((prev) => ({ ...prev, phealth: Math.max(0, prev.phealth - edmg) }));
      fightPush(`Enemy attacks and deals ${edmg} damage.`);
    }

    if (stunnedNow) set((prev) => ({ ...prev, fight: { ...prev.fight, stunned: true } }));

    updateFightBars();

    const post = (next: State) => {
      const ended = next.ehealth <= 0 || next.phealth <= 0;
      if (ended) {
        if (next.ehealth <= 0) {
          const reward = rand(cfg.coins_min, cfg.coins_max);
          set((prev) => ({ ...prev, money: prev.money + reward, wfight: prev.wfight + 1 }));
          fightPush(`You defeated the enemy. Earned ${reward} coins.`);
        } else {
          set((prev) => ({ ...prev, lfight: prev.lfight + 1 }));
          fightPush("You were defeated. Retreating to your kingdom.");
        }
      }
    };
    set((prev) => {
      const next = { ...prev };
      post(next);
      return next;
    });
  };

  const updateFightBars = () => {
    set((prev) => {
      let ehealth = prev.ehealth;
      let poisonTurns = prev.fight.poisonTurns;
      if (poisonTurns > 0 && ehealth > 0) {
        ehealth = Math.max(0, ehealth - 5);
        poisonTurns -= 1;
        fightPush("Poison deals 5 damage to the enemy.");
      }
      return { ...prev, ehealth, fight: { ...prev.fight, poisonTurns } };
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        save();
      }
      if (e.key === "F5") {
        e.preventDefault();
        command_sleep();
      }
      if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        setShopOpen(true);
      }
      if (e.ctrlKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        setPolOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const headerStat = `${s.name} | Day ${s.day} | ${s.currentEra} | ${s.money} coins`;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)" }}>
      <header
        style={{
          background: "var(--surface)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 16px",
          boxShadow: "var(--shadow)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18 }}>Kingdom Simulator</div>
        <div style={{ color: "var(--muted)" }}>{headerStat}</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn accent" onClick={save}>
            Save
          </button>
          <button className="btn" onClick={toggle}>
            Toggle Theme
          </button>
        </div>
      </header>

      {screen === "menu" ? (
        <div style={{ flex: 1 }} className="center">
          <div className="modal" style={{ maxWidth: 720 }}>
            <h2 className="title">Start</h2>
            <div className="sep" />
            <p>Welcome. Name your kingdom and begin, or load your last save.</p>
            <div className="row">
              <label htmlFor="nm">Kingdom Name</label>
              <input id="nm" placeholder="Type a name" value={menuName} onChange={(e) => setMenuName(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                className="btn accent"
                onClick={() => {
                  set((prev) => ({ ...prev, name: menuName.trim() || "kingdom name" }));
                  setScreen("main");
                  appendLog(`${menuName.trim() || "kingdom name"}, it is. Use the actions on the left to play.`, "system");
                  appendLog("==================================================", "muted");
                }}
              >
                New Game
              </button>
              <button
                className="btn"
                onClick={() => {
                  if (load()) setScreen("main");
                }}
              >
                Load Save
              </button>
              <button className="btn danger" onClick={clearSave}>
                Clear Save
              </button>
            </div>
            <div className="sep" />
            <small className="muted">No pop ups. Everything runs in this page.</small>
          </div>
        </div>
      ) : (
        <main style={{ flex: 1 }}>
          <div className="grid-3">
            <aside className="card actions">
              <div className="section-title">Actions</div>
              <button className="btn accent" onClick={command_sleep}>
                Sleep
              </button>
              <button className="btn" onClick={command_tax}>
                Tax
              </button>
              <button className="btn" onClick={command_pay}>
                Pay
              </button>
              <button className="btn" onClick={command_expand}>
                Expand
              </button>
              <button
                className="btn"
                onClick={() => {
                  appendLog("Choose difficulty:", "system");
                }}
              />
              <button className="btn" onClick={() => setFightOpen(true)}>
                Fight
              </button>
              <button className="btn" onClick={() => (document.getElementById("tab-inventory-btn") as HTMLButtonElement)?.click()}>
                Inventory
              </button>
              <button className="btn" onClick={() => setShopOpen(true)}>
                Shop
              </button>
              <button className="btn" onClick={() => setPolOpen(true)}>
                Policies
              </button>
              <button className="btn" onClick={() => setScreen("menu")}>
                Menu
              </button>
              <div className="sep" />
              <small className="muted">Shortcuts: F2 save, F5 sleep, Ctrl+S shop, Ctrl+P policies.</small>
            </aside>

            <section className="card" style={{ display: "flex", flexDirection: "column" }}>
              <Tabs
                s={s}
                logRef={logRef}
                pending={s.pendingMerchant}
                onBuy={buyMerchant}
                onDismiss={() => set((prev) => ({ ...prev, pendingMerchant: null }))}
              />
            </section>

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
            </aside>
          </div>
        </main>
      )}

      {fightOpen && (
        <Overlay onClose={() => setFightOpen(false)}>
          <h3 style={{ margin: "0 0 8px 0" }}>Battle</h3>
          <div className="cols-2">
            <div>
              <div className="muted">Your Health</div>
              <Bar pct={s.phealth} />
              <div style={{ margin: "4px 0 10px 0" }}>{s.phealth}</div>
              <div className="muted">Enemy Health</div>
              <Bar pct={Math.max(0, Math.min(100, (100 * s.ehealth) / Math.max(1, s.fight.cfg?.health || 100)))} />
              <div style={{ margin: "4px 0 10px 0" }}>{s.ehealth}</div>
              <div className="grid-btns" style={{ marginTop: 8 }}>
                <button className="btn" onClick={() => playerAction("strike")}>
                  Strike
                </button>
                <button className="btn" onClick={() => playerAction("block")}>
                  Block
                </button>
                <button className="btn" onClick={() => playerAction("heal")}>
                  Heal
                </button>
                <button className="btn" onClick={() => playerAction("dmg_pot")}>
                  Damage Potion
                </button>
                <button className="btn" onClick={() => playerAction("lightning")}>
                  Lightning
                </button>
                <button className="btn" onClick={() => playerAction("sleep")}>
                  Sleep
                </button>
                <button className="btn" onClick={() => playerAction("poison")}>
                  Poison
                </button>
              </div>
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <button className="btn danger" onClick={() => setFightOpen(false)}>
                  End Battle
                </button>
              </div>
              <div style={{ marginTop: 8 }}>
                <div className="muted" style={{ marginBottom: 6 }}>
                  Start fight:
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn" onClick={() => startFight("EASY")}>
                    Easy
                  </button>
                  <button className="btn" onClick={() => startFight("MEDIUM")}>
                    Medium
                  </button>
                  <button className="btn" onClick={() => startFight("HARD")}>
                    Hard
                  </button>
                </div>
              </div>
            </div>
            <div>
              <div className="log" ref={fightLogRef} style={{ height: 310 }} />
            </div>
          </div>
        </Overlay>
      )}

      {shopOpen && (
        <Overlay onClose={() => setShopOpen(false)}>
          <h3 style={{ margin: "0 0 8px 0" }}>Shop</h3>
          <Shop s={s} onBuyStack={buyStack} onBuyWeapon={buyWeapon} />
          <div style={{ textAlign: "right", marginTop: 8 }}>
            <button className="btn" onClick={() => setShopOpen(false)}>
              Close
            </button>
          </div>
        </Overlay>
      )}

      {polOpen && (
        <Overlay onClose={() => setPolOpen(false)}>
          <h3 style={{ margin: "0 0 8px 0" }}>Policies</h3>
          <div>
            {Object.entries(s.policies).map(([name, data]) => (
              <div className="row" key={name}>
                <div>
                  <div>
                    <strong>{name}</strong>{" "}
                    {data.locked ? <span className="pill">Locked</span> : data.active ? <span className="pill">Active</span> : <span className="pill">Inactive</span>}
                  </div>
                  <div className="muted">{data.desc}</div>
                </div>
                <button
                  className="btn"
                  disabled={data.locked}
                  onClick={() => {
                    set((prev) => ({ ...prev, policies: { ...prev.policies, [name]: { ...data, active: !data.active } } }));
                    appendLog(`${name} is now ${!data.active ? "ENABLED" : "DISABLED"}.`, "system");
                  }}
                >
                  {data.locked ? "Locked" : data.active ? "Disable" : "Enable"}
                </button>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "right", marginTop: 8 }}>
            <button className="btn" onClick={() => setPolOpen(false)}>
              Close
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

/* ---------- UI Bits ---------- */

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

function Tabs({
  s,
  logRef,
  pending,
  onBuy,
  onDismiss,
}: {
  s: State;
  logRef: React.RefObject<HTMLDivElement>;
  pending: MerchantOffer | null;
  onBuy: () => void;
  onDismiss: () => void;
}) {
  const [tab, setTab] = useState<"log" | "inventory" | "merchant">("log");
  return (
    <>
      <div className="tabs">
        <div className={`tab ${tab === "log" ? "active" : ""}`} onClick={() => setTab("log")}>
          Log
        </div>
        <div id="tab-inventory-btn" className={`tab ${tab === "inventory" ? "active" : ""}`} onClick={() => setTab("inventory")}>
          Inventory
        </div>
        <div className={`tab ${tab === "merchant" ? "active" : ""}`} onClick={() => setTab("merchant")}>
          Merchant
        </div>
      </div>
      {tab === "log" && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <div ref={logRef} className="log">
            {s.logs.map((l) => (
              <div key={l.id} className={l.tag}>
                {l.text}
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === "inventory" && (
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
      {tab === "merchant" && (
        <div id="tab-merchant">
          <div className="merchant-box">
            <div className="muted">
              {!pending
                ? "No active offer."
                : pending.kind === "weapon"
                ? `${pending.name} (+${pending.bonus} DMG) for ${pending.price} coins`
                : pending.effect === "happiness"
                ? `${pending.name} (+5 happiness) for ${pending.price} coins`
                : pending.effect === "maxstrength"
                ? `${pending.name} (+1 max strength) for ${pending.price} coins`
                : `${pending.name} (collectible) for ${pending.price} coins`}
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn" onClick={onBuy} disabled={!pending}>
                Buy
              </button>
              <button className="btn" onClick={onDismiss} disabled={!pending}>
                Dismiss
              </button>
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

function Shop({
  s,
  onBuyStack,
  onBuyWeapon,
}: {
  s: State;
  onBuyStack: (key: keyof Inventory, price: number, qty: number, name: string) => void;
  onBuyWeapon: (era: EraId, wid: number) => void;
}) {
  const [tab, setTab] = useState<"potions" | "food" | "weapons">("potions");
  return (
    <>
      <div className="tabs">
        <div className={`tab ${tab === "potions" ? "active" : ""}`} onClick={() => setTab("potions")}>
          Potions
        </div>
        <div className={`tab ${tab === "food" ? "active" : ""}`} onClick={() => setTab("food")}>
          Food
        </div>
        <div className={`tab ${tab === "weapons" ? "active" : ""}`} onClick={() => setTab("weapons")}>
          Weapons
        </div>
        <div className="pill" style={{ marginLeft: "auto" }}>
          Wallet: <span>{s.money}</span>
        </div>
      </div>
      {tab === "potions" &&
        POTIONS.map((it) => <ShopRow key={it.id} title={it.name} price={it.price} onBuy={(q) => onBuyStack(it.var, it.price, q, it.name)} />)}
      {tab === "food" &&
        FOOD.map((it) => <ShopRow key={it.id} title={it.name} price={it.price} onBuy={(q) => onBuyStack(it.var, it.price, q, it.name)} />)}
      {tab === "weapons" && (
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
                      <div>
                        [{w.id}] {w.name} +{w.damage} DMG
                      </div>
                      <div className="muted">{locked ? "LOCKED" : `${w.price} coins`}</div>
                      <div />
                      <button className="btn" disabled={locked} onClick={() => onBuyWeapon(era as EraId, w.id)}>
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

function ShopRow({ title, price, onBuy }: { title: string; price: number; onBuy: (qty: number) => void }) {
  const [qty, setQty] = useState(1);
  return (
    <div className="shop-row">
      <div>{title}</div>
      <div className="muted">{price} coins</div>
      <input className="spin" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))} />
      <button className="btn" onClick={() => onBuy(qty)}>
        Buy
      </button>
    </div>
  );
}

/* ---------- Mount ---------- */

const rootEl = document.getElementById("root");
if (!rootEl) {
  const el = document.createElement("div");
  el.id = "root";
  document.body.appendChild(el);
  createRoot(el).render(<App />);
} else {
  createRoot(rootEl).render(<App />);
}
