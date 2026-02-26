// engine/tool-spec.js — gestructureerde veldspecificatie (single source of truth)
// Gebruikt door UI én conversational AI intake voor labels, defaults en validatie.

const TOOL_SPEC = {
  meta: {
    name:        'Energie- & Kostencalculator Frankrijk',
    version:     '1.0.0',
    description: 'Berekent jaarlijkse energiekosten en warmtevraag voor woningen in Frankrijk.'
  },

  fields: [
    // ── Klimaat & Woning ──────────────────────────────────────────────────────
    {
      id:       'zone',
      label:    'Klimaatzone',
      type:     'select',
      default:  'paris',
      options:  ['med', 'ouest', 'paris', 'centre', 'est', 'mont'],
      optionLabels: {
        med:    'Méditerranée (zacht)',
        ouest:  'Zuid‑West / Atlantisch',
        paris:  'Noord / Parijs (Île‑de‑France)',
        centre: 'Centraal / Bourgogne',
        est:    'Oost / Elzas‑Lotharingen',
        mont:   'Bergen (koel)'
      },
      validate: (v) => ['med','ouest','paris','centre','est','mont'].includes(v) || 'Onbekende zone.'
    },
    {
      id:       'setpoint',
      label:    'Binnen temperatuur',
      unit:     '°C',
      type:     'number',
      default:  20,
      min:      10,
      max:      30,
      validate: (v) => (v >= 10 && v <= 30) || 'Setpoint moet tussen 10 en 30 °C liggen.'
    },
    {
      id:       'volume',
      label:    'Verwarmd volume',
      unit:     'm³',
      type:     'number',
      default:  250,
      min:      20,
      max:      5000,
      validate: (v) => (v >= 20 && v <= 5000) || 'Volume moet tussen 20 en 5000 m³ liggen.'
    },
    {
      id:       'ach',
      label:    'Luchtwisseling (n)',
      unit:     '1/uur',
      type:     'number',
      default:  0.5,
      min:      0.1,
      max:      5,
      validate: (v) => (v >= 0.1 && v <= 5) || 'ACH moet tussen 0,1 en 5 liggen.'
    },
    {
      id:       'ventType',
      label:    'Ventilatie',
      type:     'select',
      default:  'natural',
      options:  ['natural', 'mech', 'hrv'],
      optionLabels: { natural: 'Natuurlijk', mech: 'Mechanisch', hrv: 'WTW/HRV' },
      validate: (v) => ['natural','mech','hrv'].includes(v) || 'Onbekend ventilatietype.'
    },
    {
      id:       'hrvEta',
      label:    'HRV rendement',
      unit:     'η',
      type:     'number',
      default:  0.75,
      min:      0,
      max:      0.95,
      relevantWhen: { ventType: 'hrv' },
      validate: (v) => (v >= 0 && v <= 0.95) || 'HRV rendement moet tussen 0 en 0,95 liggen.'
    },
    {
      id:       'presentDays',
      label:    'Aanwezigheidsdagen/jaar',
      unit:     'dagen',
      type:     'number',
      default:  260,
      min:      0,
      max:      365,
      validate: (v) => (v >= 0 && v <= 365) || 'Aanwezigheidsdagen moeten tussen 0 en 365 liggen.'
    },
    {
      id:       'awaySetpoint',
      label:    'Afwezig-setpoint',
      unit:     '°C',
      type:     'number',
      default:  12,
      min:      5,
      max:      20,
      validate: (v) => (v >= 5 && v <= 20) || 'Afwezig-setpoint moet tussen 5 en 20 °C liggen.'
    },

    // ── Isolatie ──────────────────────────────────────────────────────────────
    {
      id:       'wallA',
      label:    'Muur oppervlakte',
      unit:     'm²',
      type:     'number',
      default:  120,
      min:      0,
      max:      2000,
      validate: (v) => (v >= 0 && v <= 2000) || 'Muuroppervlakte moet tussen 0 en 2000 m² liggen.'
    },
    {
      id:       'wallU',
      label:    'Muur U-waarde',
      unit:     'W/m²K',
      type:     'number',
      default:  0.5,
      min:      0.05,
      max:      6,
      validate: (v) => (v >= 0.05 && v <= 6) || 'Muur U-waarde moet tussen 0,05 en 6 W/m²K liggen.'
    },
    {
      id:       'roofA',
      label:    'Dak oppervlakte',
      unit:     'm²',
      type:     'number',
      default:  100,
      min:      0,
      max:      2000,
      validate: (v) => (v >= 0 && v <= 2000) || 'Dakoppervlakte moet tussen 0 en 2000 m² liggen.'
    },
    {
      id:       'roofU',
      label:    'Dak U-waarde',
      unit:     'W/m²K',
      type:     'number',
      default:  0.25,
      min:      0.05,
      max:      6,
      validate: (v) => (v >= 0.05 && v <= 6) || 'Dak U-waarde moet tussen 0,05 en 6 W/m²K liggen.'
    },
    {
      id:       'floorA',
      label:    'Vloer oppervlakte',
      unit:     'm²',
      type:     'number',
      default:  100,
      min:      0,
      max:      2000,
      validate: (v) => (v >= 0 && v <= 2000) || 'Vloeroppervlakte moet tussen 0 en 2000 m² liggen.'
    },
    {
      id:       'floorU',
      label:    'Vloer U-waarde',
      unit:     'W/m²K',
      type:     'number',
      default:  0.35,
      min:      0.05,
      max:      6,
      validate: (v) => (v >= 0.05 && v <= 6) || 'Vloer U-waarde moet tussen 0,05 en 6 W/m²K liggen.'
    },
    {
      id:       'winA',
      label:    'Ramen oppervlakte',
      unit:     'm²',
      type:     'number',
      default:  20,
      min:      0,
      max:      500,
      validate: (v) => (v >= 0 && v <= 500) || 'Ramenoppervlakte moet tussen 0 en 500 m² liggen.'
    },
    {
      id:       'winU',
      label:    'Ramen U-waarde',
      unit:     'W/m²K',
      type:     'number',
      default:  1.6,
      min:      0.5,
      max:      6,
      validate: (v) => (v >= 0.5 && v <= 6) || 'Ramen U-waarde moet tussen 0,5 en 6 W/m²K liggen.'
    },

    // ── Verwarming ────────────────────────────────────────────────────────────
    {
      id:       'mainType',
      label:    'Hoofdverwarming',
      type:     'select',
      default:  'hp',
      options:  ['elec', 'hp', 'gas', 'fioul', 'pellet', 'wood'],
      optionLabels: {
        elec:   'Elektrisch (direct)',
        hp:     'Warmtepomp (SCOP)',
        gas:    'Aardgas (ketel η)',
        fioul:  'Fioul/mazout (η)',
        pellet: 'Houtpellets‑CV (η)',
        wood:   'Hout‑CV (η)'
      },
      validate: (v) => ['elec','hp','gas','fioul','pellet','wood'].includes(v) || 'Onbekend verwarmingstype.'
    },
    {
      id:           'mainScop',
      label:        'SCOP Hoofd-WP',
      type:         'number',
      default:      3.2,
      min:          1,
      max:          7,
      relevantWhen: { mainType: 'hp' },
      validate:     (v) => (v >= 1 && v <= 7) || 'SCOP moet tussen 1 en 7 liggen.'
    },
    {
      id:           'mainEta',
      label:        'Rendement η Hoofd',
      type:         'number',
      default:      0.9,
      min:          0.5,
      max:          1,
      relevantWhen: { mainType: ['gas', 'fioul', 'pellet', 'wood'] },
      validate:     (v) => (v >= 0.5 && v <= 1) || 'Rendement moet tussen 0,5 en 1 liggen.'
    },
    {
      id:       'auxType',
      label:    'Bijverwarming',
      type:     'select',
      default:  'none',
      options:  ['none', 'inverter', 'elec', 'pellet', 'wood', 'petroleum'],
      optionLabels: {
        none:      'Geen bijverwarming',
        inverter:  'Inverter‑airco (SCOP)',
        elec:      'Elektrisch (direct)',
        pellet:    'Houtpelletkachel (η)',
        wood:      'Houtkachel (η)',
        petroleum: 'Petroleumkachel (η)'
      },
      validate: (v) => ['none','inverter','elec','pellet','wood','petroleum'].includes(v) || 'Onbekend bijverwarmingstype.'
    },
    {
      id:           'auxSharePreset',
      label:        'Aandeel bijverwarming',
      type:         'select',
      default:      '25',
      options:      ['10', '25', '50', '70', 'custom'],
      optionLabels: { '10': 'Incidenteel (~10%)', '25': 'Regelmatig (~25%)', '50': 'Vaak (~50%)', '70': 'Bijna dagelijks (~70%)', custom: 'Zelf invullen…' },
      relevantWhen: { auxType: ['inverter', 'elec', 'pellet', 'wood', 'petroleum'] }
    },
    {
      id:           'auxShareCustom',
      label:        'Eigen aandeel bijverwarming',
      unit:         '%',
      type:         'number',
      default:      25,
      min:          0,
      max:          90,
      relevantWhen: { auxSharePreset: 'custom' },
      validate:     (v) => (v >= 0 && v <= 90) || 'Aandeel moet tussen 0 en 90% liggen.'
    },
    {
      id:           'auxScop',
      label:        'SCOP Bij‑WP (Airco)',
      type:         'number',
      default:      3.2,
      min:          1,
      max:          7,
      relevantWhen: { auxType: 'inverter' },
      validate:     (v) => (v >= 1 && v <= 7) || 'SCOP moet tussen 1 en 7 liggen.'
    },
    {
      id:           'auxEta',
      label:        'Rendement η Bij',
      type:         'number',
      default:      0.85,
      min:          0.5,
      max:          1,
      relevantWhen: { auxType: ['pellet', 'wood', 'petroleum'] },
      validate:     (v) => (v >= 0.5 && v <= 1) || 'Rendement moet tussen 0,5 en 1 liggen.'
    },

    // ── Tapwater ──────────────────────────────────────────────────────────────
    {
      id:       'persons',
      label:    '# personen',
      type:     'number',
      default:  2,
      min:      1,
      max:      20,
      validate: (v) => (v >= 1 && v <= 20) || 'Aantal personen moet tussen 1 en 20 liggen.'
    },
    {
      id:       'showersPerPerson',
      label:    'Douches per persoon/dag',
      type:     'number',
      default:  1,
      min:      0,
      max:      5,
      validate: (v) => (v >= 0 && v <= 5) || 'Douches per persoon moet tussen 0 en 5 liggen.'
    },
    {
      id:       'litersPer',
      label:    'Liters per douche',
      unit:     'L',
      type:     'number',
      default:  55,
      min:      5,
      max:      200,
      validate: (v) => (v >= 5 && v <= 200) || 'Liters per douche moet tussen 5 en 200 liggen.'
    },
    {
      id:       'dhwType',
      label:    'Type tapwater systeem',
      type:     'select',
      default:  'hp',
      options:  ['elec', 'gas', 'hp', 'solar'],
      optionLabels: {
        elec:  'Boiler elektrisch',
        gas:   'Gasgeiser/ketel (η)',
        hp:    'WP‑boiler (SCOP)',
        solar: 'Zonneboiler'
      },
      validate: (v) => ['elec','gas','hp','solar'].includes(v) || 'Onbekend tapwatersysteem.'
    },
    {
      id:           'dhwScop',
      label:        'SCOP WP‑boiler',
      type:         'number',
      default:      2.5,
      min:          1,
      max:          5,
      relevantWhen: { dhwType: 'hp' },
      validate:     (v) => (v >= 1 && v <= 5) || 'SCOP moet tussen 1 en 5 liggen.'
    },
    {
      id:           'dhwEta',
      label:        'Rendement η tapwater',
      type:         'number',
      default:      0.9,
      min:          0.5,
      max:          1,
      relevantWhen: { dhwType: 'gas' },
      validate:     (v) => (v >= 0.5 && v <= 1) || 'Rendement moet tussen 0,5 en 1 liggen.'
    },

    // ── PV & AC ───────────────────────────────────────────────────────────────
    {
      id:       'pvKwp',
      label:    'PV Systeem',
      unit:     'kWp',
      type:     'number',
      default:  3,
      min:      0,
      max:      100,
      validate: (v) => (v >= 0 && v <= 100) || 'PV vermogen moet tussen 0 en 100 kWp liggen.'
    },
    {
      id:       'pvSelfUse',
      label:    'Eigenverbruik',
      unit:     '%',
      type:     'number',
      default:  60,
      min:      0,
      max:      100,
      validate: (v) => (v >= 0 && v <= 100) || 'Eigenverbruik moet tussen 0 en 100% liggen.'
    },
    {
      id:       'pvExportMode',
      label:    'Exportvergoeding',
      type:     'select',
      default:  'nvt',
      options:  ['nvt', 'vente', 'custom'],
      optionLabels: {
        nvt:    'NVT (geen verkoop)',
        vente:  'Vente du surplus ≤9 kWc (Q3 2025)',
        custom: 'Custom tarief…'
      },
      validate: (v) => ['nvt','vente','custom'].includes(v) || 'Onbekende exportmodus.'
    },
    {
      id:           'pvExportTariff',
      label:        'Tarief export',
      unit:         '€/kWh',
      type:         'number',
      default:      0.04,
      min:          0,
      max:          1,
      relevantWhen: { pvExportMode: 'custom' },
      validate:     (v) => (v >= 0 && v <= 1) || 'Exporttarief moet tussen 0 en 1 €/kWh liggen.'
    },
    {
      id:       'acOn',
      label:    'AC actief?',
      type:     'boolean',
      default:  false
    },
    {
      id:           'seer',
      label:        'SEER (seizoensrendement)',
      type:         'number',
      default:      4.0,
      min:          2.5,
      max:          10,
      relevantWhen: { acOn: true },
      validate:     (v) => (v >= 2.5 && v <= 10) || 'SEER moet tussen 2,5 en 10 liggen.'
    },

    // ── EV ────────────────────────────────────────────────────────────────────
    {
      id:       'evKmWeek',
      label:    'Kilometers per week (EV)',
      unit:     'km',
      type:     'number',
      default:  100,
      min:      0,
      max:      5000,
      validate: (v) => (v >= 0 && v <= 5000) || 'Kilometers per week moet tussen 0 en 5000 km liggen.'
    },
    {
      id:       'evKwh100',
      label:    'Verbruik EV',
      unit:     'kWh/100km',
      type:     'number',
      default:  18,
      min:      5,
      max:      50,
      validate: (v) => (v >= 5 && v <= 50) || 'Verbruik moet tussen 5 en 50 kWh/100km liggen.'
    },
    {
      id:       'evLoss',
      label:    'Laadverlies EV',
      unit:     '%',
      type:     'number',
      default:  10,
      min:      0,
      max:      30,
      validate: (v) => (v >= 0 && v <= 30) || 'Laadverlies moet tussen 0 en 30% liggen.'
    },

    // ── Zwembad ───────────────────────────────────────────────────────────────
    {
      id:       'poolHas',
      label:    'Zwembad aanwezig?',
      type:     'boolean',
      default:  false
    },
    {
      id:           'poolVol',
      label:        'Zwembad volume',
      unit:         'm³',
      type:         'number',
      default:      30,
      min:          1,
      max:          500,
      relevantWhen: { poolHas: true },
      validate:     (v) => (v >= 1 && v <= 500) || 'Volume moet tussen 1 en 500 m³ liggen.'
    },
    {
      id:           'poolTargetT',
      label:        'Doel temperatuur zwembad',
      unit:         '°C',
      type:         'number',
      default:      27,
      min:          15,
      max:          35,
      relevantWhen: { poolHas: true },
      validate:     (v) => (v >= 15 && v <= 35) || 'Temperatuur moet tussen 15 en 35 °C liggen.'
    },
    {
      id:           'poolSeason',
      label:        'Zwembadseizoen',
      unit:         'maanden',
      type:         'number',
      default:      5,
      min:          1,
      max:          12,
      relevantWhen: { poolHas: true },
      validate:     (v) => (v >= 1 && v <= 12) || 'Seizoen moet tussen 1 en 12 maanden liggen.'
    },
    {
      id:           'poolHeatType',
      label:        'Zwembadverwarming',
      type:         'select',
      default:      'hp',
      options:      ['none', 'elec', 'gas', 'hp'],
      optionLabels: { none: 'Geen verwarming', elec: 'Elektrisch', gas: 'Gas (η)', hp: 'Warmtepomp (SCOP)' },
      relevantWhen: { poolHas: true },
      validate:     (v) => ['none','elec','gas','hp'].includes(v) || 'Onbekend type zwembadverwarming.'
    },
    {
      id:           'poolHpScop',
      label:        'SCOP WP zwembad',
      type:         'number',
      default:      4,
      min:          1,
      max:          8,
      relevantWhen: { poolHas: true, poolHeatType: 'hp' },
      validate:     (v) => (v >= 1 && v <= 8) || 'SCOP moet tussen 1 en 8 liggen.'
    },
    {
      id:           'poolPumpW',
      label:        'Pomp vermogen',
      unit:         'W',
      type:         'number',
      default:      450,
      min:          50,
      max:          5000,
      relevantWhen: { poolHas: true },
      validate:     (v) => (v >= 50 && v <= 5000) || 'Pompvermogen moet tussen 50 en 5000 W liggen.'
    },
    {
      id:           'poolPumpH',
      label:        'Pomp uren/dag',
      unit:         'uur',
      type:         'number',
      default:      8,
      min:          0,
      max:          24,
      relevantWhen: { poolHas: true },
      validate:     (v) => (v >= 0 && v <= 24) || 'Pompuren moeten tussen 0 en 24 uur liggen.'
    },
    {
      id:           'poolCover',
      label:        'Afdekking zwembad',
      type:         'select',
      default:      'true',
      options:      ['true', 'false'],
      optionLabels: { 'true': 'Ja', 'false': 'Nee' },
      relevantWhen: { poolHas: true }
    },
    {
      id:           'poolWind',
      label:        'Windfactor zwembad',
      type:         'number',
      default:      1,
      min:          0.5,
      max:          3,
      relevantWhen: { poolHas: true },
      validate:     (v) => (v >= 0.5 && v <= 3) || 'Windfactor moet tussen 0,5 en 3 liggen.'
    },

    // ── Energieprijzen ────────────────────────────────────────────────────────
    {
      id:       'price_elec',
      label:    'Elektriciteitsprijs',
      unit:     '€/kWh',
      type:     'number',
      default:  0.25,
      min:      0,
      max:      5,
      validate: (v) => (v >= 0 && v <= 5) || 'Elektriciteitsprijs moet tussen 0 en 5 €/kWh liggen.'
    },
    {
      id:       'price_gas',
      label:    'Gasprijs',
      unit:     '€/m³',
      type:     'number',
      default:  1.20,
      min:      0,
      max:      10,
      validate: (v) => (v >= 0 && v <= 10) || 'Gasprijs moet tussen 0 en 10 €/m³ liggen.'
    },
    {
      id:       'price_fioul',
      label:    'Fioulprijs',
      unit:     '€/L',
      type:     'number',
      default:  1.15,
      min:      0,
      max:      5,
      validate: (v) => (v >= 0 && v <= 5) || 'Fioulprijs moet tussen 0 en 5 €/L liggen.'
    },
    {
      id:       'price_pellet',
      label:    'Houtpellets prijs',
      unit:     '€/kg',
      type:     'number',
      default:  0.60,
      min:      0,
      max:      5,
      validate: (v) => (v >= 0 && v <= 5) || 'Pelletprijs moet tussen 0 en 5 €/kg liggen.'
    },
    {
      id:       'price_wood',
      label:    'Stookhoutprijs',
      unit:     '€/stère',
      type:     'number',
      default:  85,
      min:      0,
      max:      500,
      validate: (v) => (v >= 0 && v <= 500) || 'Stookhoutprijs moet tussen 0 en 500 €/stère liggen.'
    },
    {
      id:       'price_propaan',
      label:    'Propaanprijs',
      unit:     '€/L',
      type:     'number',
      default:  1.80,
      min:      0,
      max:      10,
      validate: (v) => (v >= 0 && v <= 10) || 'Propaanprijs moet tussen 0 en 10 €/L liggen.'
    },
    {
      id:       'price_petroleum',
      label:    'Petroleumprijs',
      unit:     '€/L',
      type:     'number',
      default:  2.00,
      min:      0,
      max:      10,
      validate: (v) => (v >= 0 && v <= 10) || 'Petroleumprijs moet tussen 0 en 10 €/L liggen.'
    }
  ],

  /**
   * Valideer een volledig state-object.
   * Geeft een array van { id, message } terug voor elk veld met een fout.
   */
  validate(state) {
    const errors = [];
    for (const field of this.fields) {
      if (!field.validate) continue;
      const value = state[field.id] !== undefined ? state[field.id]
                  : (field.id.startsWith('price_') && state.userPrices)
                    ? state.userPrices[field.id.replace('price_', '')]
                    : undefined;
      if (value === undefined) continue;
      const result = field.validate(value);
      if (result !== true) errors.push({ id: field.id, message: result });
    }
    return errors;
  },

  /**
   * Geeft een default state-object terug op basis van alle field defaults.
   */
  defaultState() {
    const state = {};
    const prices = {};
    for (const field of this.fields) {
      if (field.id.startsWith('price_')) {
        prices[field.id.replace('price_', '')] = field.default;
      } else {
        state[field.id] = field.default;
      }
    }
    state.userPrices = prices;
    return state;
  }
};
