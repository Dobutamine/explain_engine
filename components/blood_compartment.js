/* eslint-disable */

class BloodCompartment {
  
  // units of the gas compartment
  // pressure in mmHg
  // volume in litres
  // concentration in mmol/l

  constructor(_model) {
    // declare a reference to the global model which is injected in this class
    this._model = _model;

    // declare the state variables which are not in the model definition file
    this.pres = 0;
    this.pres_recoil = 0;
    this.pres_ext = 0;
    this.pres_cont = 0;

    // elastances
    this.el = 0;
    this.el_max_fac = 1;
    this.el_min_fac = 1;
    this.vol_u_fac= 1;
    this.el_k1_fac = 1;
    this.el_k2_fac = 1;
    this.el_act = 0
    
  }

  calcElastance() {

    // calculate the base elastance
    let el_base = this.el_min * this.el_min_fac;

    

    // calculate the first nonlinear factor
    let nonlin_fac1 = this.el_k1 * this.el_k1_fac * (this.vol - this.vol_u);

    // calculate the second nonlinear factor
    let nonlin_fac2 = this.el_k2 * this.el_k2_fac * Math.pow((this.vol - this.vol_u), 2);
    
    // calculate the contraction (=varying elastance) factor
    let el_cont = this.el_max * this.el_max_fac * this.el_act;

    // return the sum of all factors
    return el_base + nonlin_fac1 + nonlin_fac2 + el_cont;

  }

  calcPressure() {

    // calculate the current elastance
    this.el = this.calcElastance()



    // return the current pressure as a sum of the recoil pressure, the external and container pressure
    this.pres_recoil = (this.vol - (this.vol_u * this.vol_u_fac)) * this.el

    // return the sum of all the pressures
    return (this.pres_recoil + this.pres_ext + this.pres_cont);

  }

  volIn(dvol, comp_from) {

    // add blood from the compartment stored in comp_from
    this.vol += dvol;

    // guard against negative volumes
    if (this.vol < 0) {
      this.vol = 0;
    }

    // calculate the change in oxygen and carbon dioxide concentration
    let o2_infow = (comp_from.to2 - this.to2) * dvol;
    let co2_infow = (comp_from.tco2 - this.tco2) * dvol;

    // guard against division by zero
    if (this.vol > 0) {
      this.to2 = (this.to2 * this.vol + o2_infow) / this.vol;
      this.tco2 = (this.tco2 * this.vol + co2_infow) / this.vol;
    } else {
      this.to2 = 0;
      this.tco2 = 0;
    }
    
    // guard against negative concentrations
    if (this.to2 < 0) {
      this.to2 = 0;
    }
    
    if (this.tco2 < 0) {
      this.tco2 = 0;
    }
  }

  volOut(dvol) {

    // guard against negative volumes
    this.vol -= dvol;
    if (this.vol < 0) {
      this.vol = 0;
    }

  }

  modelStep() {
    if (this.is_enabled) {
      // if the metabolism model is enabled do the energy balance
      if (this._model.components.metabolism.is_enabled) {
        this._model.components.metabolism.calcMetabolism(this, this.fvatp)
      }
      this.pres = this.calcPressure();
    }
  }
}
