/* eslint-disable */
class ECMO {
  constructor(_model) {
    this._model = _model;

    this._currentFactor = 0
    
  }

  modelStep() {
    if (this.is_enabled) {
      this.modelCycle();
    }
  }

  modelCycle() {
    const t = this._model["modeling_stepsize"];

    // set the ecmo mode (VA/VV)
    switch (this.ecmo_mode) {
      case 'VA':
        break
      case 'VV':
        break
      default:
        break
    }


    if (this.ecmo_system === 'centrifugal') {

      if (this._model.components['ECIN'].vol > 0) {
          this.flow =  (this._model.components['ECIN'].pres - this.centrifugal_pressure) / 3500

          // how much flow is possible
          if ((this.flow * t) > this._model.components['ECIN'].vol ) {
            this.flow  = this._model.components['ECIN'].vol / t
          }

          // remove blood in liters from comp1
          this._model.components['ECIN'].volOut(this.flow * t);
        
          // add blood in liters to comp2
          this._model.components['ECP'].volIn(this.flow * t, this._model.components['ECIN'])
      }

    }

    if (this.ecmo_system === 'roller') {

      if (this._model.components['ECIN'].vol > 0) {
          this.flow =  (this.roller_flow / 60)
    
          // how much flow is possible
          if ((this.flow * t) > this._model.components['ECIN'].vol ) {
            this.flow  = this._model.components['ECIN'].vol / t
          }
    
          // remove blood in liters from comp1
          this._model.components['ECIN'].volOut(this.flow * t);
        
          // add blood in liters to comp2
          this._model.components['ECP'].volIn(this.flow * t, this._model.components['ECIN'])

      }
    }
  }
}
