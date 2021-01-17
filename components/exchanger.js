/* eslint-disable */

class Exchanger {
  constructor(_model) {
    this._model = _model;
  }

  modelStep() {
    if (this.is_enabled) {
      this.modelCycle();
    }
  }

  modelCycle() {
    // calculate the flux
    // diff = mmol / mmHg * sec
    // flux is in mmol !!!

    this._model.acidbase(this._model.components[this.comp_blood], this._model);
    this._model.oxygenation(this._model.components[this.comp_blood], this._model);

    let blood_compartment = this._model.components[this.comp_blood];
    let gas_compartment = this._model.components[this.comp_gas];

    this.flux_o2 = (blood_compartment.po2 - gas_compartment.po2) * (this.dif_o2) * this._model.modeling_stepsize;

    // in blood the pco2 is in kPa and in the gas in mmHg
    this.flux_co2 = (blood_compartment.pco2 - gas_compartment.pco2) * (this.dif_co2) * this._model.modeling_stepsize;

    if (Number.isNaN(this.flux_o2)) {
      this.flux_o2 = 0;
    }

    if (Number.isNaN(this.flux_co2)) {
      this.flux_co2 = 0;
    }

    if (blood_compartment.is_enabled) {
      if (blood_compartment.vol > 0) {
        blood_compartment.to2 = (blood_compartment.to2 * blood_compartment.vol - this.flux_o2) / blood_compartment.vol;

        if (blood_compartment.to2 < 0) {
          blood_compartment.to2 = 0.0;
        }

        blood_compartment.tco2 = (blood_compartment.tco2 * blood_compartment.vol - this.flux_co2) / blood_compartment.vol;

        if (blood_compartment.tco2 < 0) {
          blood_compartment.tco2 = 0.0;
        }
      }
    }

    if (gas_compartment.is_enabled) {
      if (gas_compartment.vol > 0) {
        gas_compartment.ctotal = (gas_compartment.ctotal * gas_compartment.vol + this.flux_o2 + this.flux_co2) / gas_compartment.vol;

        gas_compartment.co2 = (gas_compartment.co2 * gas_compartment.vol + this.flux_o2) / gas_compartment.vol;

        if (gas_compartment.co2 < 0) {
          gas_compartment.co2 = 0;
        }

        gas_compartment.cco2 =
          (gas_compartment.cco2 * gas_compartment.vol + this.flux_co2) / gas_compartment.vol;

        if (gas_compartment.cco2 < 0) {
          gas_compartment.cco2 = 0;
        }

        gas_compartment.fo2 = gas_compartment.co2 / gas_compartment.ctotal;
        gas_compartment.fco2 = gas_compartment.cco2 / gas_compartment.ctotal;

        gas_compartment.po2 = gas_compartment.fo2 * (gas_compartment.pres - gas_compartment.pres * gas_compartment.fh2o);
        gas_compartment.pco2 = gas_compartment.fco2 * (gas_compartment.pres - gas_compartment.pres * gas_compartment.fh2o);
      }
    }
  }
}
