/* eslint-disable */
class Gas {
  constructor(_model) {
    // hold a reference to all the model components
    this._model = _model;

    // flag that is a first run of the gas model which means we have to do some setup at the first model step
    this._first_run = true

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
        // initialize all fractions, concentrations and partial pressures of gas (fh2o already exists)
        for (let i = 0; i < this.no_compounds; i++) {
          // get the dry air gas fractions
          comp[this.fractions[i]] = this.dry_air[this.fractions[i]]
          // process the water vapour pressure
          comp[this.fractions[i]] -= comp[this.fractions[i]] * comp['fh2o']
        } 

        // we now have the fractions so we can calculate the composition
        this.calcCompositionFromFractions(comp)

        // signal that this compartment has been initialized
        comp.initialized = true
      }
  }

  calcCompositionFromFractions(comp) {

    // calculate the concentration of all particles in the air at this pressure, volume and temperatuur in mmol/l.
    comp.ctotal = ((comp.pres * comp.vol) / (this.gas_constant * (273.15 + this.temp)) / comp.vol) * 1000;

    // calculate the concentrations and partial pressures as we already have the gas fractions
    for (let i = 0; i < this.no_compounds; i++) {
      comp[this.concentrations[i]] = comp[this.fractions[i]] * comp.ctotal
      comp[this.partialpressures[i]] = comp[this.fractions[i]] * comp.pres
    }
  }


  calcGasComposition(comp) {
    // check whether this is the first run of the model. Then we have to setup the blood compartments
    if (!comp.initialized) {
      this.initializeGasCompartment(comp)
    }

    if (comp.fixed_composition) {
      this.calcCompositionFromFractions(comp)
    } else {
      for (let i = 0; i < this.no_compounds; i++) {
        comp[this.fractions[i]] = comp[this.concentrations[i]] / comp.ctotal
        comp[this.partialpressures[i]] = comp[this.fractions[i]] * comp.pres
      }
    }
  }

  calcGasMixing(dvol, comp_to, comp_from) {
    if (comp_to.initialized & comp_from.initialized) {
      comp_to.ctotal = 0
      for (let i = 0; i < this.no_compounds; i++) {
        const inflow = dvol * (comp_from[this.concentrations[i]] - comp_to[this.concentrations[i]])
        comp_to[this.concentrations[i]] = (comp_to[this.concentrations[i]] * comp_to.vol + inflow) / comp_to.vol
        comp_to.ctotal += comp_to[this.concentrations[i]]
      }
    }
  }

}
