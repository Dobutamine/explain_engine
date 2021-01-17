/* eslint-disable */

brentAccuracy = 1e-8;
maxIterations = 100;
lefto2 = 0;
righto2 = 1000;
alpha_o2p = 0.0095;
mmoltoml = 22.2674; // convert mmol to ml  (1 mmol of gas occupies 22.2674 ml)

to2 = 0;
so2 = 0;
co2p = 0;
po2 = 0;
ph_odc = 7.4;
be_odc = 0.0;
temp_odc = 37.0;
dpg_odc = 5.0;

calcOxygenationFromTO2 = function(comp, current_model) {
  // get the to2 from the compartment
  to2 = comp.to2;

  // ODC variables
  ph_odc = Math.abs(comp.ph) > 0.0 ? comp.ph : 7.4;
  be_odc = Math.abs(comp.be) > 0.0 ? comp.be : 0.0;
  temp_odc = current_model.components.metabolism['body_temp']
  dpg_odc = current_model.components.metabolism['dpg']
  hb_odc = current_model.components.metabolism['hemoglobin']

  // find the po2 where the difference between the to2 and the target to2 is zero mmol/l and the pO2 in kPa
  result = brent(Dto2, lefto2, righto2, brentAccuracy, maxIterations);

  // change the referring compartment only if no error has occured
  if (!result.error) {
    calcOxygenation(to2, result.result);
    po2 = result.result * 7.50061683; // convert to mmHg
    comp.po2 = po2;
    comp.co2p = co2p;
    comp.so2 = so2;
  } else {
    console.log('error in oxy calcuations');
  }
};

calcOxygenation = function(to2, po2) {
  co2p = po2 * alpha_o2p;
  so2 = Odc(po2);
};

Odc = function(po2) {
  let a = 1.04 * (7.4 - ph_odc) + 0.005 * be_odc + 0.07 * (dpg_odc - 5.0);
  let b = 0.055 * (temp_odc + 273.15 - 310.15);
  let y0 = 1.875; // was 1.875
  let x0 = 1.875 + a + b; // was 1.946
  let h0 = 3.5 + a; // was 3.5
  let k = 0.5343;
  let x = Math.log(po2, Math.E);
  let y = x - x0 + h0 * Math.tanh(k * (x - x0)) + y0;

  return 1.0 / (Math.pow(Math.E, -y) + 1.0);
};

Dto2 = function(po2) {
  so2 = Odc(po2);
  to2_new_estimate = (0.02325 * po2 + 1.36 * (hb_odc / 0.6206) * so2) * 10.0; // in ml O2 per liter
  dto2 = to2 - to2_new_estimate / mmoltoml; // to2 in ml O2/l needs to be converted to mmol/l

  return dto2;
};
