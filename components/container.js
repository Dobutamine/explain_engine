/* eslint-disable */

class Container {
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

  calcVolume() {

    let total_volume = 0;
    this.comps.forEach((comp) => {
      total_volume += this._model.components[comp].vol;
    });
    return total_volume;

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

  changeVolume(dvol) {

    this.vol += dvol;
    if (this.vol < 0) {
      this.vol = 0;
    }
  }

  calcPressure() {

    // calculate the current elastance
    this.el = this.calcElastance()

    // return the current pressure as a sum of the recoil pressure, the external and container pressure
    this.pres_recoil = (this.vol - (this.vol_u * this.vol_u_fac)) * this.el

    // return the sum of all the pressures
    return (this.pres_recoil + this.pres_ext + this.pres_cont);

  }

  modelStep() {

    if (this.is_enabled) {
      // add the enclosed compartment volumes to the volume of the container
      this.vol = this.calcVolume();

      // calculate the recoil pressure of the container
      this.pres = this.calcPressure();

      // transfer the recoil pressure to the enclosed compartments
      this.comps.forEach((comp) => {
        this._model.components[comp].pres_cont = this.pres;
      });
    }

  }
}
