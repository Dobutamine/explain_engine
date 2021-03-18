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

    this.initialized = false
    
  }

  calcElastance() {
    
    // calculate the base elastance
    let el_base = this.el_min * this.el_min_fac;

    // calculate the first nonlinear factor
    let nonlin_fac1 = this.el_k1 * this.el_k1_fac * (this.vol - this.vol_u);

    // calculate the second nonlinear factor
    let nonlin_fac2 = this.el_k2 * this.el_k2_fac * Math.pow((this.vol - this.vol_u), 2);
    
    // calculate the contraction (=varying elastance) factor
    let el_cont = (this.el_max * this.el_max_fac * this.el_act)

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

    // calculate blood mixing (handled by the blood model)
    this._model.components.blood.calcBloodMixing(dvol, this, comp_from)

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
      
      // calculate the new blood compartment composition
      this._model.components.blood.calcBloodComposition(this)
      
      // calculate the pressure
      this.pres = this.calcPressure();
    }
  }
}
