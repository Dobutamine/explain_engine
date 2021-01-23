/* eslint-disable */

class Metabolism {
  constructor(_model) {
    this._model = _model;

  }

  modelStep() {
    if (this.is_enabled) {
        this.modelCycle();
    }
  }

  modelCycle() {
  
  }

  calcMetabolism(component, fvatp) {

    if (component.vol > 0) {

      // get the local ATP need in molecules per second
      let atp_need = fvatp * this.atp_need;

      // new we need to know how much molecules ATP we need in this step
      let atp_need_step = atp_need * this._model.modeling_stepsize;

      // get the number of oxygen molecules available in this compartment
      let o2_molecules_available = component.to2 * component.vol;

      // we state that 80% of these molecules are available for use
      let o2_molecules_available_for_use = 0.8 * o2_molecules_available;

      // how many molecules o2 do we need to burn in this step as 1 molecule of o2 gives 5 molecules of ATP
      let o2_to_burn = atp_need_step / 5.0;

      // how many needed ATP molecules can't be produced by aerobic respiration
      let anaerobic_atp = (o2_to_burn - o2_molecules_available_for_use / 4.0) * 5.0;

      // if negative then there are more o2 molecules available than needed and shut down anaerobic fermentation
      if (anaerobic_atp < 0) {
        anaerobic_atp = 0;
      }

      let o2_burned = o2_to_burn;
      // if we need to burn more than we have then burn all available o2 molecules
      if (o2_to_burn > o2_molecules_available_for_use) {
        // burn all available o2 molecules
        o2_burned = o2_molecules_available_for_use;
      }

      // as we burn o2 molecules we have to substract them from the total number of o2 molecules
      o2_molecules_available -= o2_burned;

      // calculate the new TO2
      component.to2 = o2_molecules_available / component.vol;
      if (component.to2 < 0) {
        component.to2 = 0;
      }

      // we now know how much o2 molecules we've burnt so we also know how much co2 we generated depending on the respiratory quotient
      let co2_molecules_produced = o2_burned * this.resp_q;

      // add the co2 molecules to the total co2 molecules
      component.tco2 = (component.tco2 * component.vol + co2_molecules_produced) / component.vol;
      if (component.tco2 < 0) {
        component.tco2 = 0;
      }

    }
  }
}
