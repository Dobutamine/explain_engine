/* eslint-disable */

class GasCompartment {

  // units of the gas compartment
  // pressure in mmHg
  // volume in litres
  // temperature in dgs C
  // concentration in mmol/l

  constructor(_model) {
    this._model = _model;

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

    // composition
    this.ctotal = 0;
    this.co2 = 0;
    this.cco2 = 0;
    this.cn2 = 0;
    this.cother = 0;
    this.ch2o = 0;
    this.to2 = 0;

    this.ftotal = 0;
    this.fo2 = 0;
    this.fweto2 = 0;
    this.fco2 = 0;
    this.fn2 = 0;
    this.fother = 0;
    this.fh2o = 0;

    this.ptotal = 0;
    this.po2 = 0;
    this.pco2 = 0;
    this.pn2 = 0;
    this.pother = 0;
    this.ph2o = 0;

  }

  calcElastance() {

    // calculate the base elastance
    let el_base = this.el_min * this.el_min_fac;

    // calculate the first nonlinear factor
    let nonlin_fac1 = this.el_k1 * this.el_k1_fac * (this.vol - this.vol_u);

    // calculate the seocnd nonlinear factor
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
     return (this.pres_recoil + this.pres_ext + this.pres_cont + this._model.components.metabolism["p_atm"]);
  }

  volIn(dvol, comp_from) {
    
    if (this.fixed_composition === false) {
       // change the volume
     this.vol += dvol;
     if (this.vol < 0) {
       this.vol = 0;
     }

      // calculate blood composition (handled by the blood model)
      this._model.components.gas.calcGasMixing(dvol, this, comp_from)
    }
  }

  volOut(dvol) {
    
    if (this.fixed_composition === false) {
      this.vol -= dvol;
      if (this.vol < 0) {
        this.vol = 0;
      }
    }
  }

  modelStep() {
    if (this.is_enabled) {
      // calculate the gas compartment composition
      this._model.components.gas.calcGasComposition(this)

      // calculate the pressure
      this.pres = this.calcPressure();
    }
  }
}
