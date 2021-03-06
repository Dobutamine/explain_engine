/* eslint-disable */

class GasConnector {
  constructor(_model) {
    this._model = _model;

    this.comp1 = null;
    this.comp2 = null;

    // declare the state variables which are not in the model definition file
    this.res = 0;
    this.flow = 0;
    this.real_flow = 0;
    this.prev_flow = 0;
    this.average_flow = 0;

    this.r_for_fac = 1;
    this.r_back_fac = 1;
    this.r_k1_fac = 1;
    this.r_k2_fac = 1;
  }


  calcResistance() {
     // calculate the flow dependent parts
     let nonlinear_fac1 = this.r_k1 * this.r_k1_fac * this.flow;
     let nonlinear_fac2 = this.r_k2 * this.r_k2_fac * Math.pow(this.flow, 2);
 
     if (this.comp1.pres > this.comp2.pres) 
     {
       // resistance if forward flow
       return this.r_for * this.r_for_fac + nonlinear_fac1 + nonlinear_fac2;
     } 
       else 
     {
       // resistance if backward flow
       return this.r_back * this.r_back_fac + nonlinear_fac1 + nonlinear_fac2
     }
  }


  modelStep() {

    if (this.is_enabled && !this.no_flow) {
      const t = this._model["modeling_stepsize"]
      // find a reference to the compartments which are connected by this connector
      this.comp1 = this._model.components[this.comp_from];
      this.comp2 = this._model.components[this.comp_to];

      // calculate the current resistance
      this.res = this.calcResistance();

      // find the flow direction
      if (this.comp1.pres > this.comp2.pres) {
        // calculate the flow with direction from comp1 to comp2
        this.flow = (this.comp1.pres - this.comp2.pres) / this.res;
        // remove blood in liters from comp1
        this.comp1.volOut(this.flow * t);
        // add blood in liters to comp2
        this.comp2.volIn(this.flow * t, this.comp1);
        // store the real flow
        this.real_flow = this.flow;
      } else {
        // if no backflow allowed set the flow to zero
        if (this.no_backflow) {
          this.flow = 0;
          this.real_flow = 0;
        } else {
          // calculate the flow with direction from comp2 to comp1 
          this.flow =(this.comp2.pres - this.comp1.pres) / this.res;
          // add blood to comp1 in liters
          this.comp1.volIn(this.flow * t, this.comp2);
          // remove blood from comp2 in lieters
          this.comp2.volOut(this.flow * t);
          // store the real flow (flip th sign as the real flow is backwards)
          this.real_flow = -this.flow;
        }
      }
      this.average_flow = this.average_flow + this._alpha * (this.real_flow * 60 - this.average_flow);
    } else {
      this.flow = 0;
      this.real_flow = 0;
      this.average_flow = 0;
    }
  }

}
