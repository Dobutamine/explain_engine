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

      if (this._model.components['ECMOTUBINGIN'].vol > 0) {
          this.flow =  (this._model.components['ECMOTUBINGIN'].pres - this.centrifugal_pressure) / 3500

          // how much flow is possible
          if ((this.flow * t) > this._model.components['ECMOTUBINGIN'].vol ) {
            this.flow  = this._model.components['ECMOTUBINGIN'].vol / t
          }

          // remove blood in liters from comp1
          this._model.components['ECMOTUBINGIN'].volOut(this.flow * t);
        
          // add blood in liters to comp2
          this._model.components['ECMOPUMP'].volIn(this.flow * t, this._model.components['ECMOTUBINGIN'])
      }

    }

    if (this.ecmo_system === 'roller') {

      if (this._model.components['ECMOTUBINGIN'].vol > 0) {
          this.flow =  (this.roller_flow / 60)
    
          // how much flow is possible
          if ((this.flow * t) > this._model.components['ECMOTUBINGIN'].vol ) {
            this.flow  = this._model.components['ECMOTUBINGIN'].vol / t
          }
    
          // remove blood in liters from comp1
          this._model.components['ECMOTUBINGIN'].volOut(this.flow * t);
        
          // add blood in liters to comp2
          this._model.components['ECMOPUMP'].volIn(this.flow * t, this._model.components['ECMOTUBINGIN'])

      }
    }
  }
}
