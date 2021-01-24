/* eslint-disable */

class Gas {
  constructor(_model) {
    this._model = _model;

    this.gas_constant = 62.36367;
    this._first_run = true
  }

  modelStep() {
    if (this.is_enabled) {
      this.modelCycle();
    }
  }

  modelCycle() {}

  firstRunSetUp () {
    Object.keys(this._model.components).forEach(key => {
      if (this._model.components[key].subtype === 'gas_compartment') {
        this.calcCompositionFromFractions(this._model.components[key])
      }
    })
    this._first_run = false
  }

  calcGasComposition(comp) {
    // check whether this is the first run of the model. Then we have to setup the blood compartments
    if (this._first_run) {
      this.firstRunSetUp()
    }

    if (comp.fixed_composition) {
      this.calcCompositionFromFractions(comp)
    }
  }

  calcGasMixing(dvol, comp_to, comp_from) {
    // this routines calculates what happens when a gas compartment gas blood from another gas compartment

     // calculate the change in oxygen and carbon dioxide concentration

    let dco2 = dvol * (comp_from.co2 - comp_to.co2);
    comp_to.co2 = (comp_to.co2 * comp_to.vol + dco2) / comp_to.vol;

    let dcco2 = dvol * (comp_from.cco2 - comp_to.cco2);
    comp_to.cco2 = (comp_to.cco2 * comp_to.vol + dcco2) / comp_to.vol;

    let dcn2 = dvol * (comp_from.cn2 - comp_to.cn2);
    comp_to.cn2 = (comp_to.cn2 * comp_to.vol + dcn2) / comp_to.vol;

    let dcother = dvol * (comp_from.cother - comp_to.cother);
    comp_to.cother =(comp_to.cother * comp_to.vol + dcother) / comp_to.vol;

    let dch2o = dvol * (comp_from.ch2o - comp_to.ch2o);
    comp_to.ch2o = (comp_to.ch2o * comp_to.vol + dch2o) / comp_to.vol;

    // calculate the new total
    comp_to.ctotal = comp_to.co2 + comp_to.cco2 + comp_to.cn2 + comp_to.cother + comp_to.ch2o;

    comp_to.fo2 = comp_to.co2 / comp_to.ctotal;
    comp_to.fco2 = comp_to.cco2 / comp_to.ctotal;
    comp_to.fn2 = comp_to.cn2 / comp_to.ctotal;
    comp_to.fh2o = comp_to.ch2o / comp_to.ctotal;
    comp_to.fother = comp_to.cother / comp_to.ctotal;

    // update the partial pressures
    comp_to.po2 = comp_to.fo2 * comp_to.pres;
    comp_to.pco2 = comp_to.fco2 * comp_to.pres;
    comp_to.pn2 = comp_to.fn2 * comp_to.pres;
    comp_to.ph2o = comp_to.fh2o * comp_to.pres;
    comp_to.pother = comp_to.fother * comp_to.pres;

  }

  calcCompositionFromFractions(comp) {
    // calculate the wet o2 fraction.
    comp.fweto2 = comp.fo2 - comp.fh2o;

    // calculate the concentration of all particles in the air at this pressure, volume and temperatuur in mmol/l.
    comp.ctotal = ((comp.pres * comp.vol) / (this.gas_constant * (273.15 + this.temp)) / comp.vol) * 1000;

    // calculate the partial pressures depending on the concentrations.
    // we need the concentrations to calculate the changes due to gas flows.
    comp.co2 = comp.fweto2 * comp.ctotal;
    comp.cco2 = comp.fco2 * comp.ctotal;
    comp.cn2 = comp.fn2 * comp.ctotal;
    comp.ch2o = comp.fh2o * comp.ctotal;
    comp.cother = comp.fother * comp.ctotal;

    // calculate the partial pressures in mmHg.
    comp.po2 = comp.fweto2 * comp.pres;
    comp.pco2 = comp.fco2 * comp.pres;
    comp.pn2 = comp.fn2 * comp.pres;
    comp.ph2o = comp.fh2o * comp.pres;
    comp.pother = comp.fother * comp.pres;
  }

}
