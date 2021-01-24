/* eslint-disable */

class Gas {
  constructor(_model) {
    this._model = _model;
  }

  modelStep() {
    if (this.is_enabled) {
      this.modelCycle();
    }
  }

  modelCycle() {}

  calcGasComposition(component) {
   
  }

  calcGasMixing(dvol, comp_to, comp_from) {

  }

}
