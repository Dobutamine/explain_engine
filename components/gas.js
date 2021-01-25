/* eslint-disable */
class Gas {
  constructor(_model) {
    // hold a reference to all the model components
    this._model = _model;

    this.fractions = []
    this.concentrations = []
    this.partialpressures = []
    this.no_compounds = 0

    this.temp = 20
    this.initialized = false
  }

  modelStep() {
    if (this.is_enabled) {
      this.modelCycle();
    }
  }

  modelCycle() {}

  initializeGasCompartment (comp) {

    // build the compound tables if not alredady done
    if (!this.initialized) {
      Object.keys(this.dry_air).forEach( compound => {
        this.fractions.push(compound)
        const concentration = compound.replace('f','c')
        this.concentrations.push(concentration)
        const partialpressure = compound.replace('f','p')
        this.partialpressures.push(partialpressure)
      })
      this.no_compounds = this.fractions.length
      this.initialized = true
    }

    // initialize all gas compartments
      if (comp.subtype === "gas_compartment") {
        // we now have the fractions so we can calculate the composition
        this.calcCompositionFromFractions(comp)
        // signal that this compartment has been initialized
        comp.initialized = true
      }
  }

  calcCompositionFromFractions(comp) {

    // determine the temperature of the compartment
    this.temp = this.getTemperature(comp)   

    // calculate the concentration of all particles in the air at this pressure, volume and temperatuur in mmol/l.
    comp.ctotal = ((comp.pres * comp.vol) / (this.gas_constant * (273.15 + this.temp)) / comp.vol) * 1000;

    // this total concentration consists of o2, co2, argon, n2 and h2o
    // we assume the fh2o is stable so then we can calculate the rest of the h2o 
    comp['ch2o'] = comp['fh2o'] * comp.ctotal
    comp['ph2o'] = comp['fh2o'] * comp.pres

    // we now have to calcuate the new fractions of wet air of the other compounds as we only have the fractions when in dry air
    for (let i = 0; i < this.no_compounds; i++) {
      // process the water vapour pressure
      comp[this.fractions[i]] = this.dry_air[this.fractions[i]] - (this.dry_air[this.fractions[i]] * comp['fh2o'])
    }

    // calculate the concentrations and partial pressures as we already have the gas fractions
    for (let i = 0; i < this.no_compounds; i++) {
      comp[this.concentrations[i]] = comp[this.fractions[i]] * comp.ctotal
      comp[this.partialpressures[i]] = comp[this.fractions[i]] * comp.pres
    }

  }

  calcGasComposition(comp) {
    // check whether this is the first run of the model. Then we have to setup the blood compartments

    if (this.is_enabled) {
      if (!comp.initialized) {
        this.initializeGasCompartment(comp)
      }
  
      if (comp.fixed_composition) {
        this.calcCompositionFromFractions(comp)
      } else {
        // determine the temperature of the compartment
        this.temp = this.getTemperature(comp)   

        // calculate the concentration of all particles in the air at this pressure, volume and temperatuur in mmol/l
        comp.ctotal = ((comp.pres * comp.vol) / (this.gas_constant * (273.15 + this.temp)) / comp.vol) * 1000;

        // this total concentration consists of o2, co2, argon, n2 and h2o
        // we assume the fh2o is stable so then we can calculate the rest of the h2o 
        comp['ch2o'] = comp['fh2o'] * comp.ctotal
        comp['ph2o'] = comp['fh2o'] * comp.pres

        for (let i = 0; i < this.no_compounds; i++) {
          // calculate the dry gas fractions
          comp[this.fractions[i]] = comp[this.concentrations[i]] / comp.ctotal
          // calculate the wet gas fractions
          comp[this.fractions[i]] = comp[this.fractions[i]] - (comp[this.fractions[i]] * comp['fh2o'])
          // calculate the partial pressures
          comp[this.partialpressures[i]] = comp[this.fractions[i]] * comp.pres 
        }
      }
    }
  }

  calcGasMixing(dvol, comp_to, comp_from) {
    if (comp_to.initialized & comp_from.initialized && this.is_enabled) {
      comp_to.ctotal = 0
      for (let i = 0; i < this.no_compounds; i++) {
        const inflow = dvol * (comp_from[this.concentrations[i]] - comp_to[this.concentrations[i]])
        comp_to[this.concentrations[i]] = (comp_to[this.concentrations[i]] * comp_to.vol + inflow) / comp_to.vol
        comp_to.ctotal += comp_to[this.concentrations[i]]
      }
    }
  }

  getTemperature (comp) {
    let temp = 20
    switch (comp.temp_source) {
      case "room":
        temp = this._model.components.metabolism.outside_temp
        break;
      case "body":
        temp = this._model.components.metabolism.body_temp
        break;
    }

    return temp
  }

}
