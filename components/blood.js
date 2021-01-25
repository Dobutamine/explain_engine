/* eslint-disable */

class Blood {
  constructor(_model) {
    // hold a reference to all the model components
    this._model = _model;
  }

  modelStep() {
    if (this.is_enabled) {
      // if enabled do a model step. This does not do anything at this point as most routines of this model are actually called by the blood compartments
      this.modelCycle();
    }
  }

  modelCycle() {}

  calcBloodComposition(comp) {
    // check whether the blood compartment is already initialized, if not we have to that first. 
    if (this.is_enabled) {
      if (!comp.initialized) {
        this.initializeBloodCompartment(comp)
      } else {
         // calculate the energy use which changes to blood composition (TO2 and TCO2)
        this.calcEnergyUse(comp)
      }
    }
  }

  initializeBloodCompartment (comp) {
    // in this routine we initialize a the blood compartments with the compounds stored in the blood model
    if (this.is_enabled) {
      // iterate over all the compounds names stored in the blood model
      Object.keys(this.compounds).forEach( compound => {
        // set the initial concentrations of the compounds as properties of the blood compartment
        comp[compound] = this.compounds[compound]
      })
      // flag that the blood compartment is initialized
      comp.initialized = true
    }
  }

  calcBloodMixing(dvol, comp_to, comp_from) {

    // this routines calculates what happens when a blood compartment receieves blood from another blood compartment
    // in terms of concentration changes of the compounds
    if (this.is_enabled) {
      if (comp_to.initialized && comp_from.initialized)
      {
        // iterate over all compound names stored in the blood model
        Object.keys(this.compounds).forEach (compound => {
          // calculate the inflow of the compound
          const inflow = (comp_from[compound] - comp_to[compound]) * dvol
          // calculate the new concentration of the compound
          comp_to[compound] = (comp_to[compound] * comp_to.vol + inflow) / comp_to.vol
          // guard against zero
          if (comp_to[compound] < 0) {
            comp_to[compound] = 0
          }
          })
      }
    }
  }

  calcEnergyUse(comp) {

    const fvatp = comp.fvatp
    
      // get the local ATP need in molecules per second
      let atp_need = fvatp * this._model.components.metabolism.atp_need;

      // new we need to know how much molecules ATP we need in this step
      let atp_need_step = atp_need * this._model.modeling_stepsize;

      // get the number of oxygen molecules available in this compartment
      let o2_molecules_available = comp.to2 * comp.vol;

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
      comp.to2 = o2_molecules_available / comp.vol;
      if (comp.to2 < 0) {
        comp.to2 = 0;
      }

      // we now know how much o2 molecules we've burnt so we also know how much co2 we generated depending on the respiratory quotient
      let co2_molecules_produced = o2_burned * this._model.components.metabolism.resp_q;

      // add the co2 molecules to the total co2 molecules
      comp.tco2 = (comp.tco2 * comp.vol + co2_molecules_produced) / comp.vol;
      if (comp.tco2 < 0) {
        comp.tco2 = 0;
      }
  }

}
