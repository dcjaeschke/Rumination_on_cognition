var jsPsych = initJsPsych({
  on_finish: function() {
    // jsPsych.data.displayData();
    jatos.onLoad(function() {
      jsPsych.data.addProperties({
        // subject: jatos.urlQueryParameters.PID,
        time: new Date(),
        timestamp: Date.now()
      });
      jatos.startNextComponent(jsPsych.data.get())
      // jatos.endStudy(jsPsych.data.get())
    });
  }
});

jatos.onLoad(function() {
  var statements = jatos.componentJsonInput.statements;
  var labels = jatos.componentJsonInput.labels;

  // Ensure data consistency and length compatibility
  // if (!statements || !labels || statements.length !== labels.length) {
  //   console.error("Error: Inconsistent data lengths in statements and labels!");
  //   return; // Exit if data has issues
  // }

  // Dynamically create trials using a loop
  var trialLoop = [];
  for (var i = 0; i < statements.length; i++) {
      // Create a temporary variable to hold the modified statement
    // var modifiedStatement = '<span style="direction: rtl;">' + statements[i] + '&#160;?</span>';
    var modifiedStatement = '<span style="direction: rtl;">' + statements[i] +'</span>';
    

    trialLoop.push({
      type: jsPsychHtmlVasResponse,
      stimulus: modifiedStatement,
      // stimulus: statements[i],
      ticks: false,
      scale_width: 500,
      scale_colour: 'black',
      labels: labels[i]
    });
  }

  jsPsych.run(trialLoop);
});
