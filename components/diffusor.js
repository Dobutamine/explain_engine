/* eslint-disable */

class Diffusor {
  constructor(_model) {
    this._model = _model;
  }

  modelStep() {
    if (this.is_enabled) {
      this.modelCycle();
    }
  }

  modelCycle() {}
}
