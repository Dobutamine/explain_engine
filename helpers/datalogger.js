/* eslint-disable */

class Datalogger {
  constructor(_model) {
    // declare a reference to the global model which is injected in this class
    this._model = _model;

    this._datalogger_timer = 0;
    this.update_interval = 0.015
    this.annotations_processed = false;

    this.realtime = false;
    this.realtime_timer = 0
    this.realtime_timer_interval = 0.015

    this.data = []
    this.data_rt = []
    this.watched_models = ["AA","LV","LA","RV","RA","monitor"]
    this.watched_models_rt = ["AA","LV","LA","RV","RA","LA_LV","RA_RV","monitor"]


  }

  // routine to send messages to the main thread
  sendMessage = (type, target, action, data, return_tag) => {
    postMessage({
      type,
      target,
      action,
      data,
      return_tag
    });
  };


  getModelProperty = (model, property) => {
    let model_state = {}
    if (this._model.components[model]) {
      model_state = this._model.components[model][property]
    }
    return model_state;
  }

  getModelProps = (model) => {
    let model_state = {}

    if (!model)
    {
      // iterate over all model components
      Object.keys(this._model.components).forEach((component) => {
        model_state[component] = {};
        Object.keys(this._model.components[component]).forEach((prop) => {
          if ((prop.substring(0,1) !== '_') & (prop !== 'pv') & (prop !== 'flows') & (this._model.components[component][prop] !== null)){
            if (typeof this._model.components[component][prop] === 'object') {
              if (this._model.components[component][prop].length > 0) {
                model_state[component][prop] = this._model.components[component][prop].join(',')
              } 
            } else {
              model_state[component][prop] = this._model.components[component][prop]
            }
          }
        })
      });

      return model_state;
    
    } else {
  
      if (this._model.components[model]) {
        let newObj = {}
        Object.keys(this._model.components[model]).forEach(prop => {
          if (typeof this._model.components[model][prop] !== 'object') {
            newObj[prop] = this._model.components[model][prop]
          }
        })
        
        return newObj
      }     
    }
  }

  removeDuplicates(data) {
    return data.filter((value, index) => data.indexOf(value) === index)
  }

  setWatchedModelsRT = (models_to_watch) => {
    let watched_models_rt = []
    this.watched_models_rt = []
    if (typeof models_to_watch === "string") {
      watched_models_rt.push(models_to_watch)
    } else {
      watched_models_rt = models_to_watch
    }
    watched_models_rt.forEach(modelToWatch => {
      this.watched_models_rt.push(modelToWatch)
    })

    this.watched_models_rt.push('monitor')
    
    this.watched_models_rt = this.removeDuplicates(this.watched_models_rt)

    // sendMessage("mes", null, null, [`realtime logger watching ${this.watched_models_rt}`] );
  }

  setWatchedModels = (models_to_watch) => {
    let watched_models = []
    this.watched_models = []
    if (typeof models_to_watch === "string") {
      watched_models.push(models_to_watch)
    } else {
      watched_models = models_to_watch
    }
    watched_models.forEach(modelToWatch => {
      this.watched_models.push(modelToWatch)
    })

    this.watched_models.push('monitor')
    
    this.watched_models = this.removeDuplicates(this.watched_models)

    // sendMessage("mes", null, null, [`logger watching ${this.watched_models}`] );
  }

  setUpdateInterval = (update_interval) => {
    this.update_interval = update_interval;
    sendMessage("mes", null, null, [`logger interval is ${update_interval} s.`] );
  }

  setModelState(new_state) {
    this._model.name = new_state.name
    this._model.description = new_state.description
    this._model.weight = new_state.weight
    this._model.model_time_total = new_state.model_time_total
    this._model.modeling_stepsize = new_state.modeling_stepsize
  
    Object.keys(new_state).forEach( (key) => {
      if (typeof new_state[key] === 'object') {
        Object.keys(new_state[key]).forEach( (prop) => {
          this._model.components[key][prop] = new_state[key][prop]
        })
      }
    })

    sendMessage("mes",null,null,['new state processed'])
    sendMessage("mes",null,null,['ready'])
    console.log(this._model)
  }
  
  getModelStateFull() {
    let model_state = {
      name: this._model.name,
      description: this._model.description,
      weight: this._model.weight,
      model_time_total: this._model.model_time_total,
      modeling_stepsize: this._model.modeling_stepsize,
      ncc_ventricular: this._model.components.ecg.ncc_ventricular
    }

    Object.keys(this._model.components).forEach((key) => {

      // shallow copy the component
      let newObj = Object.assign({}, this._model.components[key]);

      // delete the associated referenced model (creates a circular copy) and other objects
      delete newObj._model;
      delete newObj.model;
      delete newObj.comp1;
      delete newObj.comp2;


      // store the copy into the model_state
      model_state[newObj.name] = newObj;
    });
    sendMessage("mes", null, null, [`datalogger took a snapshot of the current model state`]);
    return model_state
  }

  getModelStateWatched = (_current_model_time, watched_models, annotation = "") => {
    let model_state = {
      time: _current_model_time,
      ncc_ventricular: this._model.components.ecg.ncc_ventricular,
    }

    model_state["annotation"] = annotation;

    // iterate over all components
    watched_models.forEach((key) => {

      // shallow copy the component
      let newObj = Object.assign({}, this._model.components[key]);

      // delete the associated referenced model (creates a circular copy) and other objects
      delete newObj._model;
      delete newObj.model;
      delete newObj.comp1;
      delete newObj.comp2;


      // store the copy into the model_state
      model_state[newObj.name] = newObj;
    });


    return model_state;
  }

  sendModelState = (_current_model_time, annotations) => {
        this.sendMessage(
          "data",
          "state",
          null,
          this.getModelStateWatched(_current_model_time, annotations)
        );
       
  };

  resetData() {
    this.data = [];
  }

  sendData() {
    // send the data to the main thread
    this.sendMessage(
        "data",
        "datalogger_output",
        null,
        this.data
    )

    // remove the data from memory
    this.data = null;
  }

  modelStepRealtime = (_current_model_time, annotations) => {

    // has the datalogger time interval elapsed? then get a model snapshot
    if (this._datalogger_timer >= this.update_interval) {
      if (this.data_rt === null) {
        this.data_rt = []
      }
      if (this.data === null) {
        this.data = []
      }
      this._datalogger_timer = 0;

      // save the modeldata to the data object

      let current_data_frame = this.getModelStateWatched(_current_model_time, this.watched_models_rt, annotations)
      this.data_rt.push(current_data_frame);
      
      // signal that the annotations have been processed
      this.annotations_processed = true;
    }


    if (this.realtime_timer >= this.realtime_timer_interval) {
      this.sendMessage(
        "rt",
        null,
        null,
        this.data_rt
      )
      this.realtime_timer = 0
      this.data_rt = null
    }

    // increase the datalogger timer with the modeling_stepsize
    this._datalogger_timer += this._model.modeling_stepsize;

    this.realtime_timer += this._model.modeling_stepsize;
  };

  modelStep = (_current_model_time, annotations) => {

    // has the datalogger time interval elapsed? then get a model snapshot
    if (this._datalogger_timer >= this.update_interval) {
      if (this.data === null) {
        this.data = []
      }
      this._datalogger_timer = 0;

      // save the modeldata to the data object
      this.data.push(this.getModelStateWatched(_current_model_time, this.watched_models, annotations));
      
      // signal that the annotations have been processed
      this.annotations_processed = true;
    }

    // increase the datalogger timer with the modeling_stepsize
    this._datalogger_timer += this._model.modeling_stepsize;
  };
}
