/* eslint-disable */
class Gas {
  constructor(_model) {
    // hold a reference to all the model components
    this._model = _model;

    // declare a standard gas temperature for when it can't be found in the metabolism model
    this.temp = 20

    // declare the arrays holding the different gas compound property names (e.g. fo2, co2, po2)
    this.fractions = []
    this.concentrations = []
    this.partialpressures = []

    // some housekeeping properties
    this._no_compounds = 0

    // when instantiated flag that the gas model is not initialized yet
    this.initialized = false

    this.counter = 0
  }

  modelStep() {
    if (this.is_enabled) {
      // if enabled do a model step. This does not do anything at this point as most routines of this model are actually called by the gas compartments
      this.modelCycle();
    }
  }

  modelCycle() {}

  initializeGasCompartment (comp) {
    // the gas model is being initialized here
    // build the compound tables
    if (!this.initialized) {
      Object.keys(this.dry_air).forEach( compound => {
        this.fractions.push(compound)
        const concentration = compound.replace('f','c')
        this.concentrations.push(concentration)
        const partialpressure = compound.replace('f','p')
        this.partialpressures.push(partialpressure)
      })
      this._no_compounds = this.fractions.length
    }

    // initialize all gas compartments by calculating their inital composition 
      if (comp.subtype === "gas_compartment") {
        // calculate the gas composition in the compartment using the inital gas composition values of the gas model
        this.calcGasCompositionFromFractions(comp)
        // signal that this compartment has been initialized
        comp.initialized = true
      }

    // signal that the gas model is initialized
    this.initialized = true
  }

  calcGasCompositionFromFractions(comp) {

    // determine the temperature of the compartment depending on the setting in the gas compartment
    this.temp = this.getTemperature(comp)   

    // calculate the concentration of all particles in the air at this pressure, volume and temperatuur in mmol/l.
    comp.ctotal = ((comp.pres * comp.vol) / (this.gas_constant * (273.15 + this.temp)) / comp.vol) * 1000;

    // from the h2o fraction stored in the gas compartment properties we can calculate the concentration and partial pressure of h2o
    comp['ch2o'] = comp['fh2o'] * comp.ctotal
    comp['ph2o'] = comp['fh2o'] * comp.pres

    // we now have to calcuate the new fractions of wet air of the other compounds (eg o2, co2, argon, n2) 
    // as we only have the fractions when in dry air

    // iterate over all gas compounds (e.g. o2, co2, argon, n2)
    for (let i = 0; i < this._no_compounds; i++) {
      // convert the dry air fractions to wet air fractions
      comp[this.fractions[i]] = this.dry_air[this.fractions[i]] - (this.dry_air[this.fractions[i]] * comp['fh2o'])
    }

    // calculate the concentrations and partial pressures from the pressure, ctotal and wet air fractions of the gas compounds
    for (let i = 0; i < this._no_compounds; i++) {
      comp[this.concentrations[i]] = comp[this.fractions[i]] * comp.ctotal
      comp[this.partialpressures[i]] = comp[this.fractions[i]] * comp.pres
    }

  }

  calcGasComposition(comp) {

    // this routine is called by the model step routine of every gas comprtment (comp)

    // check whether this gas compartment is initialized if not we have to initialize the compartment
    if (this.is_enabled) {
      if (!comp.initialized) {
        this.initializeGasCompartment(comp)
      }
  
      // if the gas compartment has a fixed composition (e.g. outside air or ventilator compartment) then determine the 
      // composition only from the stored fractions
      if (comp.fixed_composition) {
        // determine fixed composition
        this.calcGasCompositionFromFractions(comp)
      } else {
        // determine the temperature of the compartment
        this.temp = this.getTemperature(comp)   

        // calculate the concentration of all particles in the air at this pressure, volume and temperatuur in mmol/l
        comp.ctotal = ((comp.pres * comp.vol) / (this.gas_constant * (273.15 + this.temp)) / comp.vol) * 1000;

         // from the h2o fraction stored in the gas compartment properties we can calculate the concentration and partial pressure of h2o
        comp['ch2o'] = comp['fh2o'] * comp.ctotal
        comp['ph2o'] = comp['fh2o'] * comp.pres

        // iterate over all the other gas compounds to calculate the fractions and partial pressures
        // as we know the concentrations which were determined by gas mixing and gas exchange in the calcGasMixing routine and
        // the exchanger models

        for (let i = 0; i < this._no_compounds; i++) {
          // calculate the dry gas fractions
          comp[this.fractions[i]] = comp[this.concentrations[i]] / comp.ctotal
          // convert the dry air fractions to wet air fractions
          comp[this.fractions[i]] = comp[this.fractions[i]] - (comp[this.fractions[i]] * comp['fh2o'])
          // calculate the partial pressures
          comp[this.partialpressures[i]] = comp[this.fractions[i]] * comp.pres 
        }
      }
    }
  }

  calcGasMixing(dvol, comp_to, comp_from) {
    // this routine is called by the gas compartment volIn routine and can only run when all the involved gas compartments are initialized
    if (comp_to.initialized & comp_from.initialized && this.is_enabled) {
      // calculate the new concentrations of all gas compounds depdening on the inflow
      for (let i = 0; i < this._no_compounds; i++) {
        const inflow = dvol * (comp_from[this.concentrations[i]] - comp_to[this.concentrations[i]])
        comp_to[this.concentrations[i]] = (comp_to[this.concentrations[i]] * comp_to.vol + inflow) / comp_to.vol
      }
    }
  }

  getTemperature (comp) {
    // get the temperature depending on the temp_source setting of the gas compartment
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
