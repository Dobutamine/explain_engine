/* eslint-disable */

// This is a dedicated web worker instance for the physiological model engine
// Web workers run in a separate thread for performance reasons and have no access to the DOM nor the window object
// The scope is defined by self and communication with the main thread by a message channel
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#web_workers_api

// Communication with the script which spawned the web worker takes place through a com channel 
// Messages are received in the onmessage event and are sent by the SendMessage function

// Explain message object :
/* {
  type:       <string> stating the type of message (set/get/cmd)
  target:     <string> stating the component of the model for which the message is intended (p.e. 'datalogger'/'interventions')
  action:     <string> stating the action name
  data:       <object> containing data to pass to the action
  return_tag: <string> if data is returned from the above action it is tagged with this string.
}
*/

// this is a good test

// import the helper functions
importScripts("./helpers/math_functions.js");

// define an object which is going to hold the entire model state and properties
let current_model = {};

// define an object which is going to hold the model definition as defined by a json definition file
let model_definition = {};

// model changes take place through an event called an intervention
// interventions are stored in an object which is defined here
let interventions = {};

// model data is logged by the datalogger, its's placeholder is defined here
let datalogger = {};

// define the main timer for the real-time modeling modes and set the realtime reporting interval
let main_timer;
let realtime_step = 0.03

// the onmessage function is an event handler handling messages posted to the model engine worker thread.
// e is a MessageEvent object wich contains a data field containing the message
onmessage = function (e) {
  
  switch (e.data.type) {
    // getting data from the model.
    case "get":
      if (e.data.target === "datalogger") {
        // getting data from the datalogger of the model
        sendMessage("data", e.data.return_tag, null, datalogger[e.data.action](e.data.data))
        sendMessage("mes", null, null, ['ready']);
      }
      if (e.data.target === 'model_definition') {
        sendMessage("data", e.data.return_tag, null, model_definition)
      }

      break;

    case "set": 
      if (e.data.target === "datalogger") {
        // setting data handled by the datalogger of the model
        datalogger[e.data.action](e.data.data)
      }
      
      if (e.data.target === "interventions") {
        // setters data handled by the interventions engine
        interventions[e.data.action](e.data.data)
      }
      break; 

    case "cmd":
      // execute commands in the engine
      switch (e.data.action) {
        case "load":
          loadModel(e.data.data);
          break;
        case "start":
          startModel();
          break;
        case "stop":
          stopModel();
          break;
        case "calculate":
          if (e.data.data === null) {
            // if no duration is supplied calculate 10 seconds
            calculateModel(10);
          } else {
            // calculate a number of seconds of the model
            calculateModel(e.data.data);
          }
          break;
        case "goto":
          fastForwardModel(e.data.data)
          break
        default:
          break;
      }
      break;
    
    default:
      // if the incoming message is nog recognized it is displayed on the console 
      this.console.log(
        "model received unknown command ",
        e.data.type,
        e.data.subtype,
        e.data.target,
        e.data.data
      );
      break;
  }
};

// routine to send messages to the main thread
const sendMessage = function (type, target, action, data, return_tag) {
  postMessage({
    type,
    target,
    action,
    data,
    return_tag
  });
};

// initialize the model from the JSON model_definition file
const initModel = function (model_definition) {
  if (model_definition) {
    // set the general properties as weight and name from the definition file
    current_model["weight"] = model_definition["weight"];
    current_model["name"] = model_definition["name"];
    current_model["description"] = model_definition["description"];

    // set the modeling stepsize of the model in seconds
    current_model["modeling_stepsize"] = model_definition["modeling_stepsize"];

    // set the model total running time and timestamp arrays to timestamp the data
    current_model["model_time_total"] = 0;

    // define the dictionary holding all model components in the current model instance
    current_model["components"] = {};

    // inject the acidbase and oxygenation models which are not classes
    importScripts("./components/acidbase.js");
    importScripts("./components/oxygenation.js");
    current_model["acidbase"] = calcAcidbaseFromTCO2;
    current_model["oxygenation"] = calcOxygenationFromTO2;

    // initialize all the components

    // initialize the blood compartments
    importScripts("./components/blood_compartment.js");
    initializeComponent("blood_compartment_definitions", BloodCompartment, true)

    // initialize the blood connectors
    importScripts("./components/blood_connector.js");
    initializeComponent("blood_connector_definitions", BloodConnector, true)

    // initializes the valves
    importScripts("./components/valve.js");
    initializeComponent("valve_definitions", Valve, true)

    // initialize the gas compartments
    importScripts("./components/gas_compartment.js");
    initializeComponent("gas_compartment_definitions", GasCompartment, true)

    // initialize the gas connectors
    importScripts("./components/gas_connector.js");
    initializeComponent("gas_connector_definitions", GasConnector, true)

    // initialize the containers
    importScripts("./components/container.js");
    initializeComponent("container_definitions", Container, true)

    // initialize the diffusors
    importScripts("./components/diffusor.js");
    initializeComponent("diffusor_definitions", Diffusor, true)

    // initialize the exchangers
    importScripts("./components/exchanger.js");
    initializeComponent("exchanger_definitions", Exchanger, true)

    // import and initialize the ecg model
    importScripts("./components/ecg.js");
    initializeComponent("ecg", ECG)

    // import and initialize the heart model
    importScripts("./components/heart.js");
    initializeComponent("heart", Heart)

    // import and initialize the lungs model
    importScripts("./components/lungs.js");
    initializeComponent("lungs", Lungs)

    // import and initialize the breathing model
    importScripts("./components/breathing.js");
    initializeComponent("breathing", Breathing)

    // import and initialize the ventilator model
    importScripts("./components/ventilator.js");
    initializeComponent("ventilator", Ventilator)

    // import and initialize the autonomic nervous system model
    importScripts("./components/ans.js");
    initializeComponent("ans", ANS)

    // import and initialize the av interaction model
    importScripts("./components/avinteraction.js");
    initializeComponent("avinteraction", AvInteraction)

    // import and initialize the brain model
    importScripts("./components/brain.js");
    initializeComponent("brain", Brain)

    // import and initialize the drugs model
    importScripts("./components/drugs.js");
    initializeComponent("drugs", Drugs)

    // import and initialize the kdineys model
    importScripts("./components/kidneys.js");
    initializeComponent("kidneys", Kidneys)

    // import and initialize the liver model
    importScripts("./components/liver.js");
    initializeComponent("liver", Liver)

    // import and initialize the placenta model
    importScripts("./components/placenta.js");
    initializeComponent("placenta", Placenta)

    // import and initialize the uterus model
    importScripts("./components/uterus.js");
    initializeComponent("uterus", Uterus)

    // import and initialize the birth model
    importScripts("./components/birth.js");
    initializeComponent("birth", Birth)

    // import and initialize the ecmo model
    importScripts("./components/ecmo.js");
    initializeComponent("ecmo", ECMO)

    // import and initialize the cvvh model
    importScripts("./components/cvvh.js");
    initializeComponent("cvvh", CVVH)

    // import and initialize the adaptation model
    importScripts("./components/adaptation.js");
    initializeComponent("adaptation", Adaptation)

    // import and initialize the metaboism model
    importScripts("./components/metabolism.js");
    initializeComponent("metabolism", Metabolism)

    // import and initialize the datalogger
    importScripts("./helpers/datalogger.js");
    datalogger = new Datalogger(current_model);

    // import and initialize the interventions engine
    importScripts("./helpers/interventions.js");
    interventions = new Interventions(current_model);

    sendMessage("mes", null, null, ["ready"]);
  }
};

const initializeComponent = function (name, class_type, grouped = false) {
  if (grouped === false) {
    current_model.components[name] = new class_type(current_model);
    Object.keys(model_definition[name]).forEach(function (key) {
      current_model.components[name][key] = model_definition[name][key];
    });
  } else {
      model_definition[name].forEach((element) => {
      let newComp = new class_type(current_model);
      Object.keys(element).forEach(function (key) {
        newComp[key] = element[key];
      });
      current_model.components[newComp.name] = newComp;
    });
  }
  
}

// load and initialize a new model from a json model definition object
const loadModel = function (json_model_definition) {
  model_definition = json_model_definition;

  // notify that the model is loaded
  sendMessage("mes", null, null, [`model engine loaded with '${json_model_definition.name}' definition.`]);
 
  // initialize the model with the just loaded model definition
  initModel(model_definition);
};

// dispose of the current model
const disposeModel = function () {
  // stop the main timer
  if (main_timer) {
    clearInterval(main_timer);
    clearTimeout(main_timer)
  }
  main_timer = null

  // erase the current model object
  current_model = {};

  sendMessage("mes", null, null, ["model disposed"]);
  sendMessage("mes", null, null, ['ready']);
};

// calculate a number of seconds of the model and storing data
const calculateModel = function (time_to_calculate) {

  // first switch off datalogger realtime mode
  datalogger.realtime = false;

  // calculate the number of steps needed for the time_to_calculate
  let no_needed_steps = parseInt(time_to_calculate / current_model.modeling_stepsize);

  // send starting messages for this model run
  sendMessage("mes", null, null, ['calculating']);
  sendMessage("mes", null, null, [`model clock at ${Math.round(current_model.model_time_total)} sec.`]);
  sendMessage("mes", null, null, [`calculating ${time_to_calculate} sec. in ${no_needed_steps} steps.`]);

  // reset the datalogger
  let total_step_execution_time = 0;
  if (model_definition) {
    for (let step = 0; step < no_needed_steps; step++) {
      // do the model step and increase the execution time as the modelstep returns the execution time
      total_step_execution_time += modelStep();
    }

    // calculate the performance metrics
    let average_model_step_time = (total_step_execution_time / no_needed_steps) * 1000;

    // send messages containing the performance metrics
    sendMessage("mes", null, null, [`ready in ${total_step_execution_time.toFixed(3)} sec.`]);
    sendMessage("mes", null, null, [`avg model step in ${average_model_step_time.toFixed(3)} ms.`]);
  }
  
  // stop the model which clears all timers 
  stopModel()
};

// calculate a number of seconds of the model without storing data
const fastForwardModel = function (time_to_calculate) {

  // calculate the number of steps needed for the time_to_calculate
  let no_needed_steps = parseInt(time_to_calculate / current_model.modeling_stepsize);

  // send starting messages for this model run
  sendMessage("mes", null, null, ['fast forwarding']);
  sendMessage("mes", null, null, [`calculating ${time_to_calculate} sec. in ${no_needed_steps} steps.`]);


  if (model_definition) {
    for (let step = 0; step < no_needed_steps; step++) {
      // do the model step and increase the execution time as the modelstep returns the execution time
      modelStepFastForward();
    }

    // send messages containing the performance metrics
    sendMessage("mes", null, null, ['fast forward ready']);
    sendMessage("mes", null, null, [`model clock at ${Math.round(current_model.model_time_total)} sec.`]);
  }
  
  // signal model is ready
  sendMessage("mes", null, null, ['ready']);
};

// start the realtime model
const startModel = function () {
  if (model_definition) {
    // first switch on datalogger realtime mode
     datalogger.realtime = true;

    // reset the main timer if it's already running
    if (main_timer) {
      clearInterval(main_timer)
      clearTimeout(main_timer)
    }

    // set the main timer to the modeling interval which is stored in the JSON model definition
    main_timer = setInterval(modelStepRealtime, realtime_step * 1000);

    // notify main that the model is started
    sendMessage("mes", null, null, ["started"]);
  } 
};

// stop the realtime model
const stopModel = function () {
  if (model_definition) {
    // stop the main timer
    if (main_timer) {
      clearInterval(main_timer);
      clearTimeout(main_timer)
    }
    main_timer = null
    // notify UI that the model has stopped
    sendMessage("mes", null, null, [`stopped at ${Math.round(current_model.model_time_total)} seconds.`]);
    // send the data object
    datalogger.sendData();
    // signal model is ready
    sendMessage("mes", null, null, ['ready']);
  } 
};

// model cycle loop which is called every x ms defined by the modeling stepsize in the model definition
const modelStep = function () {

  // model performance calculation start point
  let t0 = performance.now();

  // iterate over all components and do the modelstep. The actual modeling is done in this loop
  for (const key in current_model.components) {
    current_model.components[key].modelStep();
  }

  // update the intervention engine
  interventions.modelStep(current_model.model_time_total);

  // update the datalogger and inject the annotations from the interventions object
  datalogger.modelStep(current_model.model_time_total, interventions.getAnnotations());

  // process the annotations in the datalogger
  if (datalogger.annotations_processed) {
    // if all annotations are processed by the datalogger clear them from the interventions object
    datalogger.annotations_processed = false;
    interventions.clearAnnotations();
  }

  // increase the current modeltime
  current_model.model_time_total += current_model.modeling_stepsize;

  // calculate the model performance -> meaning how long did this model step take in ms
  return (performance.now() - t0) / 1000;

};

// realtime model cycle is called every x ms defined by the modeling stepsize in the model definition
const modelStepRealtime = function () {
  // this realtime model step has the purpose to calculate a model step in realtime, log the data and process interventions

   // model performance calculation start point
   let t0 = performance.now();

   // number of loops
   let no_loops = parseInt(realtime_step / current_model.modeling_stepsize);


   for (let i=0; i<no_loops; i++) {
     
     // iterate over all components and do the modelstep. The actual modeling is done in this loop
      for (const key in current_model.components) {
        current_model.components[key].modelStep();
      }
    
      // update the intervention engine
      interventions.modelStep(current_model.model_time_total);
    
       // update the datalogger and inject the annotations from the interventions object
       datalogger.modelStepRealtime(current_model.model_time_total, interventions.getAnnotations());
       
      // process the annotations in the datalogger
      if (datalogger.annotations_processed) {
        // if all annotations are processed by the datalogger clear them from the interventions object
        datalogger.annotations_processed = false;
        interventions.clearAnnotations();
      }
      // increase the current modeltime
      current_model.model_time_total += current_model.modeling_stepsize;     
   }


   // calculate the model performance -> meaning how long did this model step take in ms
   return (performance.now() - t0) / 1000;

}

// fast forward model cycle is called every x ms defined by the modeling stepsize in the model definition but does not store data
const modelStepFastForward = function () {
  // this fast forward step has the purpose of fast forwarding the model in time without doing any datalogging or intervention processing 
  // this function is realluy fast and can be used to jump to a period in the future of the model

   // iterate over all components and do the modelstep. The actual modeling is done in this loop
   for (const key in current_model.components) {
     current_model.components[key].modelStep();
   }
 
   // increase the current modeltime
   current_model.model_time_total += current_model.modeling_stepsize;
 

}

