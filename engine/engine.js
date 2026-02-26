// engine/engine.js — gedeelde rekenlogica (UI-onafhankelijk)
// Exporteert alles via window.* voor gebruik in zowel index.html als AI-intake.

// ===== Data & constanten =====
const ZONES = [
  { id: 'med',    name: 'Méditerranée (zacht)',            hdd: 1400, cdd: 700,  pool_temp: 22, Tref: 12 },
  { id: 'ouest',  name: 'Zuid‑West / Atlantisch',          hdd: 1900, cdd: 350,  pool_temp: 20, Tref: 10 },
  { id: 'paris',  name: 'Noord / Parijs (Île‑de‑France)',  hdd: 2200, cdd: 250,  pool_temp: 19, Tref: 7  },
  { id: 'centre', name: 'Centraal / Bourgogne',            hdd: 2500, cdd: 200,  pool_temp: 19, Tref: 6  },
  { id: 'est',    name: 'Oost / Elzas‑Lotharingen',        hdd: 2800, cdd: 150,  pool_temp: 18, Tref: 5  },
  { id: 'mont',   name: 'Bergen (koel)',                   hdd: 3400, cdd:  50,  pool_temp: 17, Tref: 2  }
];

const PV_YIELD = { med: 1450, ouest: 1250, paris: 1150, centre: 1200, est: 1150, mont: 1100 };

const DEFAULT_APPLIANCES = [
  { key: 'fridge',   label: 'Koelkast/vriezer',       kwh: 250, on: true,  scales: false },
  { key: 'wash',     label: 'Wassen/drogen',          kwh: 220, on: true,  scales: true  },
  { key: 'dish',     label: 'Vaatwasser',              kwh: 160, on: true,  scales: true  },
  { key: 'it',       label: 'IT & randapparatuur',     kwh: 150, on: true,  scales: true  },
  { key: 'tv',       label: 'TV & media',              kwh: 120, on: true,  scales: true  },
  { key: 'small',    label: 'Kleine verbruikers',      kwh: 150, on: true,  scales: true  },
  { key: 'lighting', label: 'Verlichting (LED)',        kwh: 180, on: true,  scales: true  }
];

const PRICE_DEFAULTS_USER = { elec: 0.25, gas: 1.20, fioul: 1.15, pellet: 0.60, wood: 85, propaan: 1.80, petroleum: 2.00 };
const ENERGY_UNITS        = { elec: '€/kWh', gas: '€/m³', fioul: '€/L', pellet: '€/kg', wood: '€/stère', propaan: '€/L', petroleum: '€/L' };
const KWH_CONVERSION      = { elec: 1, gas: 10, fioul: 10, pellet: 5, wood: 1800, propaan: 7.1, petroleum: 10 };

const HEAT_MAIN_DEF = [
  { key: 'elec',   label: 'Elektrisch (direct)',   priceKey: 'elec'   },
  { key: 'hp',     label: 'Warmtepomp (SCOP)',     priceKey: 'elec'   },
  { key: 'gas',    label: 'Aardgas (ketel η)',     priceKey: 'gas'    },
  { key: 'fioul',  label: 'Fioul/mazout (η)',      priceKey: 'fioul'  },
  { key: 'pellet', label: 'Houtpellets‑CV (η)',    priceKey: 'pellet' },
  { key: 'wood',   label: 'Hout‑CV (η)',           priceKey: 'wood'   }
];

const HEAT_AUX_DEF = [
  { key: 'none',      label: 'Geen bijverwarming',      priceKey: null        },
  { key: 'inverter',  label: 'Inverter‑airco (SCOP)',   priceKey: 'elec'      },
  { key: 'elec',      label: 'Elektrisch (direct)',     priceKey: 'elec'      },
  { key: 'pellet',    label: 'Houtpelletkachel (η)',    priceKey: 'pellet'    },
  { key: 'wood',      label: 'Houtkachel (η)',          priceKey: 'wood'      },
  { key: 'petroleum', label: 'Petroleumkachel (η)',     priceKey: 'petroleum' }
];

const DHW_TYPES_DEF = [
  { key: 'elec',  label: 'Boiler elektrisch',   priceKey: 'elec' },
  { key: 'gas',   label: 'Gasgeiser/ketel (η)', priceKey: 'gas'  },
  { key: 'hp',    label: 'WP‑boiler (SCOP)',    priceKey: 'elec' },
  { key: 'solar', label: 'Zonneboiler',         priceKey: null   }
];

const POOL_HEAT_DEF = [
  { key: 'none', label: 'Geen verwarming',    priceKey: null   },
  { key: 'elec', label: 'Elektrisch',         priceKey: 'elec' },
  { key: 'gas',  label: 'Gas (η)',            priceKey: 'gas'  },
  { key: 'hp',   label: 'Warmtepomp (SCOP)',  priceKey: 'elec' }
];

const U_PRESETS = {
  wall:  { 'Ongeïsoleerd (~1975)': 2.0, 'Matig (~5cm)': 0.8, 'Goed (~10cm)': 0.4, 'Zeer goed (15cm+)': 0.25 },
  roof:  { 'Ongeïsoleerd': 3.0, 'Matig (~10cm)': 0.5, 'Goed (~20cm)': 0.25, 'Zeer goed (30cm+)': 0.15 },
  floor: { 'Op zand': 2.2, 'Kruipruimte': 1.2, 'Matig geïsoleerd': 0.8, 'Goed geïsoleerd': 0.3 },
  win:   { 'Enkel glas': 5.5, 'Oud dubbelglas': 2.8, 'Modern HR(+)': 1.6, 'Triple HR++': 1.0 }
};

// ===== Helpers =====
const fmt0  = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 });
const eur0  = (x) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(x || 0);
const num   = (v, d = 0) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : d; };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

function personsMultiplier(p) { return Math.max(0.5, Math.min(3, p / 2)); }

// ===== Rekenlogica =====
function computeResults(s) {
  const z = ZONES.find(x => x.id === s.zone) || ZONES[2];
  const pricesKwh = {};
  Object.keys(s.userPrices).forEach(k => pricesKwh[k] = s.userPrices[k] / (KWH_CONVERSION[k] || 1));

  const UA       = s.wallA * s.wallU + s.roofA * s.roofU + s.floorA * s.floorU + s.winA * s.winU;
  const Hvent    = 0.34 * s.volume * s.ach;
  const etaHRV   = s.ventType === 'hrv' ? clamp(s.hrvEta, 0, 0.95) : 0;
  const HventEff = s.ventType === 'hrv' ? Hvent * (1 - etaHRV) : Hvent;
  const H        = UA + HventEff;

  const scale      = (sp) => Math.max(0, (sp - z.Tref) / (18 - z.Tref));
  const HDD_present = z.hdd * scale(s.setpoint);
  const HDD_away    = z.hdd * scale(s.awaySetpoint);
  const daysPresent = s.presentDays;
  const daysAway    = 365 - daysPresent;
  const heatDemand  = H * ((HDD_present * (daysPresent / 365)) + (HDD_away * (daysAway / 365))) * 24 / 1000;

  // hoofd/bij
  const auxSharePct = (s.auxSharePreset === 'custom' ? s.auxShareCustom : Number(s.auxSharePreset));
  const auxFrac  = s.auxType === 'none' ? 0 : Math.min(0.9, Math.max(0, auxSharePct / 100));
  const mainFrac = 1 - auxFrac;
  const mainDef  = HEAT_MAIN_DEF.find(h => h.key === s.mainType);
  const auxDef   = HEAT_AUX_DEF.find(h => h.key === s.auxType) || { priceKey: null };
  const effOf    = (def, scop, eta) => def?.label?.includes('SCOP') ? Math.max(1, scop || 3) : (def?.label?.includes('η') ? Math.max(0.5, eta || 0.9) : 1);
  const mainEff  = effOf(mainDef, s.mainScop, s.mainEta);
  const auxEff   = effOf(auxDef,  s.auxScop,  s.auxEta);
  const mainInput = heatDemand * mainFrac / mainEff;
  const auxInput  = auxDef.key === 'none' ? 0 : (heatDemand * auxFrac / auxEff);

  // tapwater
  const ppl    = Math.max(1, s.persons);
  const dpp    = Math.max(0, s.showersPerPerson);
  const liters = Math.max(1, s.litersPer);
  const dhwThermal = (ppl * dpp * liters * 365 * (40 - 12) * 4.186) / 3600;
  const dhwDef  = DHW_TYPES_DEF.find(d => d.key === s.dhwType) || { priceKey: null };
  const dhwEff  = effOf(dhwDef, s.dhwScop, s.dhwEta);
  const dhwInput = dhwDef.priceKey ? (dhwThermal / dhwEff) : 0;

  // apparaten
  const m          = personsMultiplier(ppl);
  const applKwhRaw = s.appls.reduce((sum, a) => sum + (a.on ? a.kwh * (a.scales ? m : 1) : 0), 0);
  const applKwh    = applKwhRaw * (daysPresent / 365);

  // EV
  const evKwhYear = (s.evKmWeek * 52) * (s.evKwh100 / 100) * (1 + s.evLoss / 100);

  // Zwembad
  let pool = { kwh: 0, cost: 0, elec: 0, gas: 0 };
  if (s.poolHas) {
    const days        = s.poolSeason * 30;
    const pumpKwh     = (s.poolPumpW / 1000) * s.poolPumpH * days;
    const ambient     = z.pool_temp;
    const deltaT      = Math.max(0, s.poolTargetT - ambient);
    const thermalDaily = s.poolVol * deltaT * 1.16 * (s.poolCover === 'true' ? 0.5 : 1.0) * (s.poolWind || 1);
    const thermal     = thermalDaily * days;
    const def         = POOL_HEAT_DEF.find(h => h.key === s.poolHeatType);
    const eff         = def?.label.includes('SCOP') ? Math.max(1, s.poolHpScop || 4) : (def?.label.includes('η') ? Math.max(0.5, 0.9) : 1);
    const input       = def?.key === 'none' ? 0 : (thermal / eff);
    let elecUse = pumpKwh, gasUse = 0;
    if (def?.priceKey === 'elec') elecUse += input;
    if (def?.priceKey === 'gas')  gasUse  += input;
    const poolCost = elecUse * (pricesKwh.elec || 0) + gasUse * (pricesKwh.gas || 0);
    pool = { kwh: pumpKwh + input, cost: poolCost, elec: elecUse, gas: gasUse };
  }

  // Koeling (AC)
  let coolTherm = 0, coolEl = 0;
  if (s.acOn) {
    const kCool = 0.6;
    const CDD   = z.cdd * (daysPresent / 365);
    const SEER  = Math.max(2.5, s.seer || 4);
    coolTherm = kCool * H * CDD * 24 / 1000;
    coolEl    = coolTherm / SEER;
  }

  // Bruto elektra (onafhankelijk van PV)
  const elecHeatingInput = (mainDef?.priceKey === 'elec' ? mainInput : 0) + (auxDef?.priceKey === 'elec' ? auxInput : 0);
  const elecDhwInput     = (dhwDef?.priceKey === 'elec' ? dhwInput : 0);
  const elecTotalGross   = elecHeatingInput + elecDhwInput + applKwh + evKwhYear + pool.elec + coolEl;

  // PV (cap + export)
  const pvYield   = s.pvKwp > 0 ? s.pvKwp * (PV_YIELD[s.zone] || 1150) : 0;
  const pvSelfMax = pvYield * (s.pvSelfUse / 100);
  const pvSelf    = Math.min(pvSelfMax, elecTotalGross);
  const pvExport  = Math.max(0, pvYield - pvSelf);

  // Exportvergoeding
  let exportTariff = 0;
  if (s.pvExportMode === 'vente')  exportTariff = 0.04;
  if (s.pvExportMode === 'custom') exportTariff = Math.max(0, s.pvExportTariff || 0);

  const elecNet = Math.max(0, elecTotalGross - pvSelf);

  // Kosten
  const mainCost    = (pricesKwh[mainDef?.priceKey] || 0) * mainInput;
  const auxCost     = (pricesKwh[auxDef?.priceKey]  || 0) * auxInput;
  const dhwCost     = (pricesKwh[dhwDef?.priceKey]  || 0) * dhwInput;
  const coolCost    = coolEl * (pricesKwh.elec || 0);
  const nonElecMain = mainDef?.priceKey !== 'elec' ? mainCost : 0;
  const nonElecAux  = auxDef?.priceKey  !== 'elec' ? auxCost  : 0;
  const nonElecDhw  = dhwDef?.priceKey  !== 'elec' ? dhwCost  : 0;
  const elecCost    = elecNet * (pricesKwh.elec || 0) - pvExport * exportTariff;
  const totalCost   = elecCost + nonElecMain + nonElecAux + nonElecDhw + (pool.gas * (pricesKwh.gas || 0));

  const costs = {
    verwarming:        mainCost + auxCost,
    tapwater:          dhwCost,
    koeling:           coolCost,
    apparaten:         applKwh * (pricesKwh.elec || 0),
    ev:                evKwhYear * (pricesKwh.elec || 0),
    zwembad:           pool.cost,
    pvWaarde:          -(pvSelf * (pricesKwh.elec || 0)),
    pvExportOpbrengst: pvExport * exportTariff * -1
  };

  // Audit elektra
  const elecParts    = { hp: elecHeatingInput, dhw: elecDhwInput, appl: applKwh, ev: evKwhYear, pool: pool.elec, cool: coolEl };
  const elecPartsSum = Object.values(elecParts).reduce((a, b) => a + b, 0);
  const mismatch     = Math.abs(elecPartsSum - elecTotalGross) > 0.05 * Math.max(1, elecTotalGross);

  return {
    totalCost,
    perMonth: totalCost / 12,
    heatDemand,
    costs,
    verbruik: {
      nettoElec: elecNet,
      brutoElec: elecTotalGross,
      pvEigen:   pvSelf,
      pvExport,
      warmte:    mainInput + auxInput,
      heatMain:  mainInput,
      heatAux:   auxInput,
      tapwater:  dhwInput,
      koelingEl: coolEl,
      ev:        evKwhYear,
      overig:    applKwh + coolEl + pool.kwh
    },
    debug: {
      UA, Hvent, HventEff, H,
      HDD_present, HDD_away, daysPresent, daysAway,
      mainFrac, auxFrac,
      mainEff, auxEff,
      mainInput, auxInput,
      elecTotalGross, pvYield, pvSelf, pvExport, elecNet, exportTariff,
      totalCost, elecParts, elecPartsSum, mismatch
    }
  };
}
