// Controle van de waarden in de tool tegen peil/waarden.json, de kopie van de waarden uit Peil (het parameterregister van Communities Abroad).
// Draaien: node tests/peil.test.mjs (geen netwerk, geen afhankelijkheden). Faalt bij elke afwijking.
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const lees = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");
const require = createRequire(import.meta.url);
const WAARDEN = JSON.parse(lees("peil", "waarden.json"));
const PIN = JSON.parse(lees("peil", "engine-hash.json"));
const UITLEG_URL = "https://infofrankrijk.com/ons-manifest-hoe-wij-werken/";
const fouten = [];
const fout = (m) => fouten.push(m);
const gelijk = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const nl = (n) => String(n).replace(".", ",");

// ---- engine.js laden: de constanten staan als const, dus ze worden via een hulpregel zichtbaar gemaakt
const engineCode = lees("engine", "engine.js");
const ctx = { Intl, Math, Number, Object, console };
vm.createContext(ctx);
vm.runInContext(engineCode + "\n;this.__W = { PEIL_WAARDEN_STAND, PRIJS_INFO, PRICE_DEFAULTS_USER, KWH_CONVERSION, PRIJS_UITLEG, APPARATEN_UITLEG, DEFAULT_APPLIANCES, U_PRESETS, U_UITLEG, computeResults };", ctx);
const W = ctx.__W;

// ---- 1. Datum en standen
if (!/^\d{4}-\d{2}-\d{2}$/.test(WAARDEN.stand)) fout(`stand in peil/waarden.json (${WAARDEN.stand}) is geen datum als JJJJ-MM-DD.`);
if (W.PEIL_WAARDEN_STAND !== WAARDEN.stand) fout(`PEIL_WAARDEN_STAND in engine.js is ${W.PEIL_WAARDEN_STAND}, peil/waarden.json heeft ${WAARDEN.stand}.`);
const perId = new Map((WAARDEN.parameters || []).map((p) => [p.id, p]));
const param = (id) => { const p = perId.get(id); if (!p) fout(`${id} staat niet in peil/waarden.json.`); return p || {}; };

// ---- 4. Elektriciteitsprijs (TRVE) overal gelijk aan Peil
{
  const p = param("p.fr.energie.prijs_elektriciteit_trve");
  const abx = (kva) => ((new RegExp(kva + " kVA (\\d+,\\d+)").exec(p.waarde_weergave || "") || [])[1]); // abonnement per jaar uit waarde_weergave, bijv. "3 kVA 145,76"
  const ab = { "3_kva": abx(3), "6_kva": abx(6) };
  if (!ab["3_kva"] || !ab["6_kva"]) fout("waarde_weergave van de elektriciteitsprijs noemt het abonnement voor 3 en 6 kVA niet.");
  if (p.status) fout("De elektriciteitsprijs moet in Peil vastgesteld zijn (geen status in de kopie), nu " + p.status + ".");
  if (W.PRIJS_INFO.elec.waarde !== p.waarde) fout(`Elektriciteitsprijs in PRIJS_INFO: ${W.PRIJS_INFO.elec.waarde}, Peil ${p.waarde}.`);
  if (W.PRICE_DEFAULTS_USER.elec !== p.waarde) fout(`PRICE_DEFAULTS_USER.elec: ${W.PRICE_DEFAULTS_USER.elec}, Peil ${p.waarde}.`);
  if (W.PRIJS_INFO.elec.status !== "vastgesteld") fout("Elektriciteitsprijs moet als vastgesteld zijn gemarkeerd.");
  const t = W.PRIJS_INFO.elec.toelichting;
  if (!t.includes(nl(ab["3_kva"])) || !t.includes(nl(ab["6_kva"]))) fout("De uitleg bij de elektriciteitsprijs noemt het abonnement niet met de bedragen uit Peil.");
  if (!/komt er los bij/.test(W.PRIJS_UITLEG + W.PRIJS_INFO.elec.toelichting)) fout("De uitleg moet zeggen dat het abonnement er los bij komt.");
  const spec = lees("engine", "tool-spec.js");
  const specWaarde = (id) => parseFloat((new RegExp(`id:\\s*'${id}',[\\s\\S]*?default:\\s*([0-9.]+)`).exec(spec) || [])[1]);
  for (const k of Object.keys(W.PRIJS_INFO)) {
    if (W.PRICE_DEFAULTS_USER[k] !== W.PRIJS_INFO[k].waarde) fout(`PRICE_DEFAULTS_USER.${k} wijkt af van PRIJS_INFO.`);
    if (specWaarde("price_" + k) !== W.PRIJS_INFO[k].waarde) fout(`tool-spec.js price_${k}: ${specWaarde("price_" + k)}, verwacht ${W.PRIJS_INFO[k].waarde}.`);
  }
  if (/0\.25\b|0\.194\b/.test(W.PRIJS_UITLEG) || /elec:\s*0\.25\b/.test(engineCode)) fout("De oude elektriciteitsprijs (0,25 of 0,194) staat nog in de tool.");
}

// ---- 5. Overige prijzen: aannames met bron en zichtbaar in de tool
{
  // Het register geeft de brandstofprijzen per kWh (hout en pellets per kWh PCI, gas per kWh PCS) of per liter (fioul); de tool rekent met een prijs per eenheid
  // (gas per m3, pellets per kg, hout per stère). De test rekent de toolwaarde terug met de omrekening die de tool zelf gebruikt (KWH_CONVERSION in de tool):
  // toolprijs per kWh = toolwaarde / KWH_CONVERSION[soort], en vergelijkt die met de registerwaarde. Voorbeeld pellets: tool 0,40 euro per kg / 5 kWh per kg = 0,080 euro per kWh, register 0,085.
  // Afrondingsmarge: de tool toont ronde standaardprijzen en rondt de prijs per kWh af op 0,01 euro. De afwijking mag daarom hooguit een halve afrondstap zijn,
  // 0,005 euro per kWh (grens inbegrepen, met 1e-9 voor floating point). Binnen die marge is het een afronding, daarbuiten een echte afwijking die gemeld moet worden.
  // Fioul staat in het register per liter en in de tool ook per liter, zonder omrekening; dezelfde marge van 0,005 euro per liter.
  const MARGE = 0.005 + 1e-9;
  const soorten = {
    gas:    { id: "p.fr.energie.prijs_gas_prix_repere", status: undefined, eenheid: "per kWh PCS, tool per m3" },
    fioul:  { id: "p.fr.energie.prijs_fioul",           status: undefined, eenheid: "per liter, tool per liter", direct: true },
    pellet: { id: "p.fr.energie.prijs_pellets",         status: "raming",   eenheid: "per kWh PCI, tool per kg" },
    wood:   { id: "p.fr.energie.prijs_hout",            status: "raming",   eenheid: "per kWh PCI, tool per stère" }
  };
  for (const [k, s] of Object.entries(soorten)) {
    const p = param(s.id), i = W.PRIJS_INFO[k];
    if (i.peilId !== s.id) fout(`PRIJS_INFO.${k}.peilId is ${i.peilId}, verwacht ${s.id}.`);
    if (typeof p.waarde !== "number") { fout(`${s.id}: Peil heeft geen getal als waarde (${p.waarde}).`); continue; }
    if (p.status !== s.status) fout(`${s.id}: status in Peil is ${p.status || "vastgesteld"}, verwacht ${s.status || "vastgesteld"}; bekijk of de tool dit nog juist toont.`);
    if (i.status !== "aanname") fout(`PRIJS_INFO.${k}: de tool toont dit als aanname (de omrekening en de afronding zijn van de tool), nu ${i.status}.`);
    if (!i.bron) fout(`PRIJS_INFO.${k} heeft geen bron.`);
    const inh = s.direct ? 1 : W.KWH_CONVERSION[k];
    const perKwh = i.waarde / inh;
    if (Math.abs(perKwh - p.waarde) > MARGE) fout(`${s.id}: tool ${i.waarde} (= ${perKwh.toFixed(4)} ${s.direct ? "per liter" : "per kWh"} bij ${inh} ${s.direct ? "" : "kWh per eenheid"}), Peil ${p.waarde} ${s.eenheid}; verschil groter dan de afrondingsmarge van 0,005.`);
  }
  // Propaan en petroleum: in Peil nog geen waarde (te_verifieren); de tool toont eigen schattingen als aanname.
  for (const [k, id] of Object.entries({ propaan: "p.fr.energie.prijs_propaan", petroleum: "p.fr.energie.prijs_petroleum" })) {
    const p = param(id), i = W.PRIJS_INFO[k];
    if (i.peilId !== id) fout(`PRIJS_INFO.${k}.peilId is ${i.peilId}, verwacht ${id}.`);
    if (p.status !== "te_verifieren" || p.waarde !== null) fout(`${id}: Peil heeft nu status ${p.status} en waarde ${p.waarde}; vergelijk de tool (${i.waarde}) met die waarde en pas deze test aan.`);
    if (i.status !== "aanname" || !i.bron) fout(`PRIJS_INFO.${k} moet een aanname met bron zijn.`);
  }
  if (!/aanname/.test(W.PRIJS_UITLEG)) fout("PRIJS_UITLEG zegt niet dat de overige prijzen aannames zijn.");
  const st = param("p.fr.energie.standaardprijzen_invoer");
  if (st.status !== "te_verifieren" || st.waarde !== null) fout("standaardprijzen_invoer: Peil heeft nu status " + st.status + " en waarde " + st.waarde + "; pas deze test aan.");
}

// ---- 6. U-waarden per bouwperiode (3CL), apparaatverbruik (ADEME)
{
  const u = param("p.fr.energie.u_waarden_isolatieniveau"), w = u.waarde || {};
  const vals = (o) => Object.values(o);
  if (!gelijk(vals(W.U_PRESETS.wall), w.muur)) fout(`Muur-U-waarden: tool ${JSON.stringify(vals(W.U_PRESETS.wall))}, Peil ${JSON.stringify(w.muur)}.`);
  if (!gelijk(vals(W.U_PRESETS.roof), w.dak)) fout(`Dak-U-waarden: tool ${JSON.stringify(vals(W.U_PRESETS.roof))}, Peil ${JSON.stringify(w.dak)}.`);
  if (!gelijk(vals(W.U_PRESETS.floor), w.vloer)) fout(`Vloer-U-waarden: tool ${JSON.stringify(vals(W.U_PRESETS.floor))}, Peil ${JSON.stringify(w.vloer)}.`);
  // Raam: het register noemt enkel glas en modern dubbelglas (PVC-kozijn) in waarde_weergave; oud dubbelglas (2,8) en triple (1,0) zijn aannames van de tool en staan als zodanig in U_UITLEG.
  { const rw = (re) => parseFloat(((re.exec(u.waarde_weergave || "") || [])[1] || "").replace(",", "."));
    const w = vals(W.U_PRESETS.win);
    if (w[0] !== rw(/enkel glas ([\d,]+)/)) fout(`Raam enkel glas: tool ${w[0]}, Peil ${rw(/enkel glas ([\d,]+)/)}.`);
    if (w[2] !== rw(/modern dubbelglas ([\d,]+)/)) fout(`Raam modern dubbelglas: tool ${w[2]}, Peil ${rw(/modern dubbelglas ([\d,]+)/)}.`);
    if (!W.U_UITLEG.includes("2,8") || !W.U_UITLEG.includes("1,0")) fout("U_UITLEG noemt de aannames 2,8 (oud dubbelglas) en 1,0 (triple) niet."); }
  if (vals(W.U_PRESETS.roof).includes(3) || vals(W.U_PRESETS.win).includes(5.5)) fout("Dak 3,0 en raam 5,5 komen in de methode niet voor en moeten vervallen zijn.");
  if (!/aanname/.test(W.U_UITLEG) || !/1983/.test(W.U_UITLEG)) fout("U_UITLEG zegt niet dat de koppeling aan bouwperiodes een aanname is.");
  const a = param("p.fr.energie.apparaatverbruik_per_jaar"), aw = a.waarde || {};
  const kwh = Object.fromEntries(W.DEFAULT_APPLIANCES.map((x) => [x.key, x]));
  const koppel = { fridge: "koel_vriescombinatie", wash: "wasmachine_plus_droger", dish: "vaatwasser", tv: "televisie", lighting: "verlichting" };
  for (const [k, pk] of Object.entries(koppel)) {
    if (kwh[k].kwh !== aw[pk]) fout(`Apparaat ${k}: tool ${kwh[k].kwh} kWh, Peil ${aw[pk]} kWh.`);
    if (kwh[k].status !== "raming") fout(`Apparaat ${k} moet als raming zijn gemarkeerd.`);
  }
  for (const k of ["it", "small"]) if (kwh[k].status !== "aanname") fout(`Apparaat ${k} moet als aanname zijn gemarkeerd.`);
  if (a.status !== "raming") fout("apparaatverbruik_per_jaar moet in Peil raming zijn.");
  if (!/ADEME/.test(W.APPARATEN_UITLEG) || !/kan afwijken/.test(W.APPARATEN_UITLEG)) fout("APPARATEN_UITLEG zegt niet 'gemiddeld volgens ADEME, uw verbruik kan afwijken'.");
}

// ---- 7. Het waardenblok blijft gelijk aan dat in energieportaal en if-mobiel (pin in peil/engine-hash.json, in alle drie de repo's hetzelfde)
{
  const begin = engineCode.indexOf("// ===== Waarden uit Peil"), eind = engineCode.indexOf("// ===== Helpers");
  const blokTekst = begin >= 0 && eind > begin ? engineCode.slice(begin, eind) : "";
  const sha = crypto.createHash("sha256").update(blokTekst).digest("hex");
  if (!blokTekst) fout("engine.js mist het blok '// ===== Waarden uit Peil' tot '// ===== Helpers'.");
  else if (sha !== PIN.waardenblok) fout("Het waardenblok in engine/engine.js wijkt af van energieportaal en if-mobiel (peil/engine-hash.json). Wijzig de waarden in alle drie de repo's en werk de hash overal bij.");
  const zus = path.join(root, "..", "energieportaal", "engine", "engine.js");
  if (fs.existsSync(zus)) {
    const z = fs.readFileSync(zus, "utf8");
    const zb = z.slice(z.indexOf("// ===== Waarden uit Peil"), z.indexOf("// ===== Helpers"));
    if (zb !== blokTekst) fout("Het waardenblok verschilt van ../energieportaal/engine/engine.js.");
  }
  // De rekenmotor zelf is niet byte-identiek aan die van energieportaal (andere dagverdeling); alleen het blok wordt bewaakt.
}

if (fouten.length) {
  console.log(`${fouten.length} afwijking(en) tussen de tool en peil/waarden.json:`);
  fouten.forEach((m) => console.log("FOUT " + m));
  process.exit(1);
}
console.log(`Alle Peil-controles geslaagd (stand ${WAARDEN.stand}, ${perId.size} parameters in peil/waarden.json).`);
