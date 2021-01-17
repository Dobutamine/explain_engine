/* eslint-disable */

class Interventions {
  constructor(_model) {
    // declare a reference to the global model which is injected in this class
    this._model = _model;

    // declare a list which containes all current interventions
    this.propertyChanges = [];

    // declare an annotations object to display the interventions in the datalogger
    this.annotations = {};

    // current model time
    this._current_model_time = 0;
  }

  SendMessage = function (type_mes, subtype_mes, target_mes, data_mes) {
    postMessage({
      id: null,
      type: type_mes,
      subtype: subtype_mes,
      target: target_mes,
      data: data_mes,
    });
  };

  clearAnnotations() {
    this.annotations = {};
  }

  clearPropertyChanges() {
    this.propertyChanges = [];
  }

  addPropertyChange(_propertyChange) {
    let models = _propertyChange.model;
    if (typeof _propertyChange.model != "object") {
      models = [_propertyChange.model];
    }

    models.forEach((m_name) => {
      let new_property = {};
      let model_name = m_name;
      let prop_name = _propertyChange.property;

      Object.assign(new_property, _propertyChange);
      new_property.property = prop_name;
      new_property.model = m_name;
      new_property.property_type = -1;
      new_property.property_loc = "none";
      new_property.started = false;
      new_property.completed = false;
      new_property.at_time = _propertyChange.at_time + this._current_model_time;

      // to determine the property type we have to find the propert
      try {
        if (this._model.components[model_name][prop_name] != undefined) {
          // found the property in models and
          new_property.property_loc = "components";
          new_property.property_type = typeof this._model.components[
            model_name
          ][prop_name];
        }
      } catch (err) {}

      try {
        if (this._model[prop_name] != undefined) {
          // found the property in models and
          new_property.property_loc = "general";
          new_property.property_type = typeof this._model[prop_name];
        }
      } catch (err) {}

      // add the intervention to the list
      this.propertyChanges.push(new_property);

      //console.log(new_property)
      let message = `${new_property.model}.${new_property.property} changes to ${new_property.target} in ${new_property.in_time.toFixed(0)} sec. at ${new_property.at_time.toFixed(0)} sec.`
      SendMessage("mes", null, null, [message])
      SendMessage("mes", null, null, ['ready']);

    });
  }

  getAnnotations() {
    return this.annotations;
  }

  modelStep(_current_model_time) {
    // store the model time
    this._current_model_time = _current_model_time;

    // iterate over all interventions
    this.propertyChanges.forEach((intervention) => {
      this.processIntervention(intervention, _current_model_time);
    });
  }

  startPropertyChange(_intervention, _current_model_time) {
    // set the started flag to true
    _intervention["started"] = true;

    switch (_intervention.property_type) {
      case "string":
        // switch the boolean as this is an on or off phenomena
        this._model[_intervention.property_loc][_intervention.model][_intervention.property] = _intervention.target;
        _intervention.completed = true;
        this.annotations["text"] = "start " + _intervention.label;

        this.SendMessage("mes", null, null, [`switched ${_intervention.model}.${_intervention.property} to ${_intervention.target} at ${Math.round(_current_model_time)} sec.`]);
        break;
      case "boolean":
        // switch the boolean as this is an on or off phenomena
        this._model[_intervention.property_loc][_intervention.model][_intervention.property] = _intervention.target;
        _intervention.completed = true;
        this.annotations["text"] = "start " + _intervention.label;

        this.SendMessage("mes", null, null, [`switched ${_intervention.model}.${_intervention.property} to ${_intervention.target} at ${Math.round(_current_model_time)} sec.`,]);
        break;

      case "number":
        // if the target is a relative change (default) then calculate the new target value
        let target = 0;
        switch (_intervention.mode) {
          case "rel":
            // define the target 
            _intervention.target = this._model[_intervention.property_loc][_intervention.model][_intervention.property] * _intervention.target;

            // calculate the stepsize for change of this target
            _intervention["stepsize"] =((_intervention.target - this._model[_intervention.property_loc][_intervention.model][_intervention.property]) /_intervention.in_time) * this._model.modeling_stepsize;
            break;
          case "abs":
            // calculate the stepsize for change of this target
            _intervention["stepsize"] = ((_intervention.target - this._model[_intervention.property_loc][_intervention.model][_intervention.property]) / _intervention.in_time) * this._model.modeling_stepsize;
            break;
          default:
            console.log('no intervention mode set')
            break;
        }

        _intervention["no_steps"] = _intervention.in_time / this._model.modeling_stepsize;

        this.SendMessage("mes", null, null, [`start intervention on ${_intervention.model}.${_intervention.property} at ${Math.round(_current_model_time)} sec.`]);
        this.annotations["text"] = "start " + _intervention.label;
        break;
      default:
        console.log(_intervention.property_type)
        break;
    }
  }

  processPropertyChange(_intervention, _current_model_time) {
    // apply the intervention
    if (_intervention.started & !_intervention.completed) {
      this._model[_intervention.property_loc][_intervention.model][_intervention.property] += _intervention.stepsize;

      // diminish no of steps
      _intervention.no_steps -= 1;

      if (_intervention.no_steps <= 0) {
        _intervention.completed = true;
        _intervention.stepsize = 0;

        this.SendMessage("mes", null, null, [`finished intervention on ${_intervention.model}.${_intervention.property} at ${Math.round(_current_model_time)} sec.`,]);
        this.annotations["text"] = "end " + _intervention.label;
      }
    }
  }

  processIntervention(_intervention, _current_model_time) {
    // check whether it is time to start this intervention

    if (
      (_current_model_time >= _intervention["at_time"]) & !_intervention["started"]) {
      this.startPropertyChange(_intervention, _current_model_time);
    }

    this.processPropertyChange(_intervention, _current_model_time);
  }
}
