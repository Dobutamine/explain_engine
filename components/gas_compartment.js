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

    this.gas_constant = 62.36367;
    this.temp = 20;

    this._first_run = true;

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
     

      let dco2 = dvol * (comp_from.co2 - this.co2);
      this.co2 = (this.co2 * this.vol + dco2) / this.vol;

      let dcco2 = dvol * (comp_from.cco2 - this.cco2);
      this.cco2 = (this.cco2 * this.vol + dcco2) / this.vol;

      let dcn2 = dvol * (comp_from.cn2 - this.cn2);
      this.cn2 = (this.cn2 * this.vol + dcn2) / this.vol;

      let dcother = dvol * (comp_from.cother - this.cother);
      this.cother =(this.cother * this.vol + dcother) / this.vol;

      let dch2o = dvol * (comp_from.ch2o - this.ch2o);
      this.ch2o = (this.ch2o * this.vol + dch2o) / this.vol;

      // calculate the new total
      this.ctotal = this.co2 + this.cco2 + this.cn2 + this.cother + this.ch2o;

      this.fo2 = this.co2 / this.ctotal;
      this.fco2 = this.cco2 / this.ctotal;
      this.fn2 = this.cn2 / this.ctotal;
      this.fh2o = this.ch2o / this.ctotal;
      this.fother = this.cother / this.ctotal;

      // update the partial pressures
      this.po2 = this.fo2 * this.pres;
      this.pco2 = this.fco2 * this.pres;
      this.pn2 = this.fn2 * this.pres;
      this.ph2o = this.fh2o * this.pres;
      this.pother = this.fother * this.pres;
    } 
      else 
    {
      this.calcCompositionFromFractions();
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

  calcCompositionFromFractions() {
    // calculate the wet o2 fraction.
    this.fweto2 = this.fo2 - this.fh2o;

    // calculate the concentration of all particles in the air at this pressure, volume and temperatuur in mmol/l.
    this.ctotal = ((this.pres * this.vol) / (this.gas_constant * (273.15 + this.temp)) / this.vol) * 1000;

    // calculate the partial pressures depending on the concentrations.
    // we need the concentrations to calculate the changes due to gas flows.
    this.co2 = this.fweto2 * this.ctotal;
    this.cco2 = this.fco2 * this.ctotal;
    this.cn2 = this.fn2 * this.ctotal;
    this.ch2o = this.fh2o * this.ctotal;
    this.cother = this.fother * this.ctotal;

    // calculate the partial pressures in mmHg.
    this.po2 = this.fweto2 * this.pres;
    this.pco2 = this.fco2 * this.pres;
    this.pn2 = this.fn2 * this.pres;
    this.ph2o = this.fh2o * this.pres;
    this.pother = this.fother * this.pres;
  }

  modelStep() {
    if (this.is_enabled) {
      this.pres = this.calcPressure();

      if (this._first_run) {
        this.calcCompositionFromFractions();
        this._first_run = false;
      }
    }
  }
}
