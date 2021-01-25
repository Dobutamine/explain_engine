/* eslint-disable */

class Diffusor {
  constructor(_model) {
    this._model = _model;

    this.flux_o2 = 0
  }

  modelStep() {
    if (this.is_enabled) {
      this.modelCycle();
    }
  }

  modelCycle() {}
}
