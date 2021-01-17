/* eslint-disable */

class Kidneys {
  constructor(_model) {
    this._model = _model;

    this._d_raas = 0;
    this._effect_raas = 0;

    this.diuresis = 0; // in l/sec
  }

  modelStep() {
    if (this.is_enabled) {
      this.modelCycle();
    }
  }

  modelCycle() {

    // input : AR_KID
    // iets mee doen
    // effector site
    
    // // get the current model step time
    // let t = this._model.modeling_stepsize; // in sec

    // // get the activation curve value
    // this.a_raas = activationCurve(
    //   this._model.components["AR_KID"].real_flow,
    //   this.sa_raas,
    //   this.op_raas,
    //   this.th_raas
    // );

    // // process the time-constant
    // this._d_raas = timeConstant(this.a_raas, this._d_raas, this.tc_raas, t);

    // // process the gain
    // this.g_raas = 0.001;
    // this._effect_raas = this._d_raas * this.g_raas;

    // // effector site
    // // the effect raas is now the number of liters per stepsize which will be retained or removed

    // this._model.components["KID"].bloodOut(this._effect_raas);
    
  }
}
