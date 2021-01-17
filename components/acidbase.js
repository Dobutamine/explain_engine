/* eslint-disable */

brent_accuracy = 1e-8;
max_iterations = 100.0;

left_hp = Math.pow(10.0, -8.0) * 1000.0;
right_hp = Math.pow(10.0, -6.0) * 1000.0;
alpha_co2p = 0.03067;
kw = Math.pow(10.0, -13.6) * 1000.0;
kc = Math.pow(10.0, -6.1) * 1000.0;
kd = Math.pow(10.0, -10.22) * 1000.0;

ph = 0;
pco2 = 0;
tco2 = 0;
tco2co2 = 0;
cco2p = 0;
hco3p = 0;
co3p = 0;
ohp = 0;
be = 0;
alb_base = 0;
phos_base = 0;

ab_comp = null;

calcPlasmaNetcharge = function(hp) {
  ph = -Math.log10(hp / 1000.0);
  tco2 = ab_comp.tco2;
  tco2co2 = 1.0 + kc / hp + (kc * kd) / Math.pow(hp, 2.0);
  cco2p = ab_comp.tco2 / tco2co2;
  hco3p = (kc * cco2p) / hp;
  co3p = (kd * hco3p) / hp;
  ohp = kw / hp;
  alb_base = ab_comp.albumin * (0.378 / (1.0 + Math.pow(10.0, 7.1 - ph)));
  phos_base = ab_comp.phosphates / (1.0 + Math.pow(10.0, 6.8 - ph));
  pco2 = cco2p / alpha_co2p; // in mmHg
  be =
    (hco3p - 24.4 + (2.3 * ab_comp.hemoglobin + 7.7) * (ph - 7.4)) *
    (1.0 - 0.023 * ab_comp.hemoglobin); // mmol/l -> van Slyke equation to determine the base excess

  return hp + ab_comp.sid - hco3p - 2.0 * co3p - ohp - alb_base - phos_base;
};

calcAcidbaseFromTCO2 = function(comp, current_model) {
  // try to find the hydrogen ion concentration where the netcharge of the plasma is zero from the total co2 concentration
  // and plasma composition (sid, albumin, phosphates, hemoglobin) using a brent rootfinding algorithm

  // get the properties from the compartment which determine the acidbase

  ab_comp = {
    tco2: comp.tco2,
    hemoglobin: current_model.components.metabolism['hemoglobin'],
    albumin: current_model.components.metabolism['albumin'],
    phosphates: current_model.components.metabolism['phosphates'],
    sid: current_model.components.metabolism['sid'],
  };

  // find the new [H], tis routine returns an object containing the new [H], iterations used, error code
  result = brent(
    calcPlasmaNetcharge,
    left_hp,
    right_hp,
    brent_accuracy,
    max_iterations
  );

  // change the referring compartment only if no error has occured
  if (!result.error) {
    comp.ph = ph;
    comp.pco2 = pco2;
    comp.cco2p = cco2p;
    comp.tco2 = tco2;
    comp.hco3p = hco3p;
    comp.be = be;
  } else {
    console.log('error in acidbase calcuations');
  }

  return result
};
