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

// ===== Waarden uit Peil: één configuratieplek =====
// Alle standaardwaarden hieronder komen uit Peil (het parameterregister van Communities Abroad) of zijn
// als aanname gemarkeerd. Per waarde staan bron en jaar erbij. Peil-id's verwijzen naar peil/waarden.json;
// tests/peil.test.mjs bewaakt dat beide overeenkomen. Stand van de controle: PEIL_WAARDEN_STAND.
const PEIL_WAARDEN_STAND = '2026-10-20';

// Status: 'vastgesteld' = officiële bron, 'raming' = gemeten gemiddelde van een overheidsinstantie,
// 'aanname' = keuze van de tool (marktprijs of eigen koppeling), zichtbaar als standaard die de gebruiker kan aanpassen.
const PRIJS_INFO = {
  elec:      { waarde: 0.2001, status: 'vastgesteld', peilId: 'p.fr.energie.prijs_elektriciteit_trve',
               bron: 'CRE, tarief réglementé Bleu optie Base, 3 en 6 kVA, TTC, geldig sinds 1 augustus 2026',
               toelichting: 'Het abonnement (145,76 euro per jaar bij 3 kVA, 190,81 euro bij 6 kVA) komt er los bij; de tool rekent het niet mee.' },
  gas:       { waarde: 1.40, status: 'aanname', peilId: 'p.fr.energie.prijs_gas_prix_repere',
               bron: 'SDES/DGEC, gemiddelde huishoudprijs 2025, ongeveer 0,14 euro per kWh',
               toelichting: 'De omrekening naar euro per m³ (10 kWh per m³) is een aanname van de tool.' },
  fioul:     { waarde: 1.13, status: 'aanname', peilId: 'p.fr.energie.prijs_fioul',
               bron: 'SDES/DGEC, gemiddelde huishoudprijs 2025' },
  pellet:    { waarde: 0.40, status: 'aanname', peilId: 'p.fr.energie.prijs_pellets',
               bron: 'ADEME, prijzen 2024, geleverd los gestort, 85 euro per MWh' },
  wood:      { waarde: 90, status: 'aanname', peilId: 'p.fr.energie.prijs_hout',
               bron: 'ADEME, prijzen 2024, ongeveer 0,05 euro per kWh',
               toelichting: 'De omrekening naar euro per stère (1.800 kWh per stère) is een aanname van de tool.' },
  propaan:   { waarde: 1.80, status: 'aanname', peilId: 'p.fr.energie.prijs_propaan',
               bron: 'eigen schatting van de tool, geen overheidsbron' },
  petroleum: { waarde: 2.00, status: 'aanname', peilId: 'p.fr.energie.prijs_petroleum',
               bron: 'eigen schatting van de tool, geen overheidsbron' }
};
const PRICE_DEFAULTS_USER = { elec: PRIJS_INFO.elec.waarde, gas: PRIJS_INFO.gas.waarde, fioul: PRIJS_INFO.fioul.waarde, pellet: PRIJS_INFO.pellet.waarde, wood: PRIJS_INFO.wood.waarde, propaan: PRIJS_INFO.propaan.waarde, petroleum: PRIJS_INFO.petroleum.waarde };
const ENERGY_UNITS        = { elec: '€/kWh', gas: '€/m³', fioul: '€/L', pellet: '€/kg', wood: '€/stère', propaan: '€/L', petroleum: '€/L' };
const KWH_CONVERSION      = { elec: 1, gas: 10, fioul: 10, pellet: 5, wood: 1800, propaan: 7.1, petroleum: 10 };
// Tekst bij de prijzen, in gewone taal.
const PRIJS_UITLEG = 'Dit zijn standaardprijzen: pas ze aan naar uw factuur. Elektriciteit volgt het officiële gereguleerde tarief (tarif réglementé, CRE, sinds 1 augustus 2026); de overige prijzen zijn gemiddelden uit 2024 of 2025 en dus een aanname. Een abonnement rekent de tool niet mee: dat komt er los bij.';

// Apparaatverbruik per jaar: raming, gemiddelde volgens ADEME. Het verbruik van uw eigen apparaten kan afwijken.
// bron A: ADEME, "Électricité: quels appareils consomment le plus", bijgewerkt 7 mei 2026.
// bron B: ADEME, panel ElecDom, mediaan over de meetjaren 2019 tot 2024.
const APPARATEN_PEIL_ID = 'p.fr.energie.apparaatverbruik_per_jaar';
const APPARATEN_UITLEG = 'Gemiddeld volgens ADEME, uw verbruik kan afwijken. Waar een apparaat geen ADEME-cijfer heeft (IT en kleine verbruikers) is het een aanname.';
const DEFAULT_APPLIANCES = [
  { key: 'fridge',   label: 'Koelkast/vriezer',       kwh: 315, on: true,  scales: false, status: 'raming',  bron: 'ADEME 2026, koel-vriescombinatie' },
  { key: 'wash',     label: 'Wassen/drogen',          kwh: 265, on: true,  scales: true,  status: 'raming',  bron: 'ADEME 2026, wasmachine 85 plus droger 180' },
  { key: 'dish',     label: 'Vaatwasser',              kwh: 133, on: true,  scales: true,  status: 'raming',  bron: 'ADEME ElecDom, mediaan' },
  { key: 'it',       label: 'IT & randapparatuur',     kwh: 150, on: true,  scales: true,  status: 'aanname', bron: 'eigen schatting van de tool' },
  { key: 'tv',       label: 'TV & media',              kwh: 155, on: true,  scales: true,  status: 'raming',  bron: 'ADEME 2026, televisie' },
  { key: 'small',    label: 'Kleine verbruikers',      kwh: 150, on: true,  scales: true,  status: 'aanname', bron: 'eigen schatting van de tool' },
  { key: 'lighting', label: 'Verlichting (LED)',        kwh: 89,  on: true,  scales: true,  status: 'raming',  bron: 'ADEME ElecDom, mediaan' }
];

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

// U-waarden (W/m²K) per isolatieniveau. Bron: DPE-methode 3CL (arrêté van 31 maart 2021, annexe 1), standaardwaarden per bouwperiode, klimaatzone H2, woningen zonder elektrische verwarming.
// De methode kent geen isolatieniveaus maar bouwperiodes. De koppeling is een aanname van de tool: niet geïsoleerd = voor 1975, matig = 1983 tot 1988, goed = 2006 tot 2012, zeer goed = vanaf 2013.
// Dak: zolder (combles). Raam: de methode werkt per glastype en kozijn; enkel glas 4,9 en modern dubbelglas 1,6 zijn de waarden voor een PVC-kozijn, oud dubbelglas 2,8 en triple 1,0 zijn aannames.
const U_PEIL_ID = 'p.fr.energie.u_waarden_isolatieniveau';
const U_PRESETS = {
  wall:  { 'Niet geïsoleerd': 2.5, 'Matig (1983–88)': 0.84, 'Goed (2006–12)': 0.36, 'Zeer goed (vanaf 2013)': 0.23 },
  roof:  { 'Niet geïsoleerd': 2.5, 'Matig (1983–88)': 0.32, 'Goed (2006–12)': 0.20, 'Zeer goed (vanaf 2013)': 0.14 },
  floor: { 'Niet geïsoleerd': 2.0, 'Matig (1983–88)': 0.74, 'Goed (2006–12)': 0.27, 'Zeer goed (vanaf 2013)': 0.23 },
  win:   { 'Enkel glas': 4.9, 'Oud dubbelglas': 2.8, 'Modern HR(+)': 1.6, 'Triple HR++': 1.0 }
};
const U_UITLEG = 'Standaardwaarden uit de DPE-methode (3CL) per bouwperiode, klimaatzone H2. De methode kent geen isolatieniveaus: dat matig bij 1983–88 hoort, goed bij 2006–12 en zeer goed bij vanaf 2013 is een aanname van deze tool. Bij ramen hangt de waarde af van glastype en kozijn: enkel glas (4,9) en modern dubbelglas (1,6) gelden voor een PVC-kozijn, oud dubbelglas (2,8) en triple (1,0) zijn aannames.';

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
