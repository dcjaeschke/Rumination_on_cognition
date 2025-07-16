var jsPsychHtmlVasResponse = (function (jspsych) {
  "use strict";

  const info = {
    name: "html-vas-response",
    parameters: {
      stimulus: {
        type: jspsych.ParameterType.HTML_STRING,
        pretty_name: "Stimulus",
        default: undefined,
      },
      labels: {
        type: jspsych.ParameterType.HTML_STRING,
        pretty_name: "Labels",
        default: [],
        array: true,
      },
      ticks: {
        type: jspsych.ParameterType.BOOL,
        pretty_name: "Ticks",
        default: false,
      },
      scale_width: {
        type: jspsych.ParameterType.INT,
        pretty_name: "VAS width",
        default: null
      },
      scale_height: {
        type: jspsych.ParameterType.INT,
        pretty_name: "VAS height",
        default: 40
      },
      scale_colour: {
        type: jspsych.ParameterType.STRING,
        pretty_name: "Scale colour",
        default: 'black'
      },
      scale_cursor: {
        type: jspsych.ParameterType.STRING,
        pretty_name: "Scale cursor",
        default: 'pointer'
      },
      marker_colour: {
        type: jspsych.ParameterType.STRING,
        pretty_name: "Marker colour",
        default: 'rgba(0, 0, 0, 0.5)'
      },
      tick_colour: {
        type: jspsych.ParameterType.STRING,
        pretty_name: "tick colour",
        default: 'black'
      },
      prompt: {
        type: jspsych.ParameterType.HTML_STRING,
        pretty_name: "Prompt",
        default: null
      },
      button_label: {
        type: jspsych.ParameterType.HTML_STRING,
        pretty_name: "Button label",
        default: 'Continue'
      },
      required: {
        type: jspsych.ParameterType.BOOL,
        pretty_name: "Response required",
        default: true
      },
      stimulus_duration: {
        type: jspsych.ParameterType.INT,
        pretty_name: "Stimulus duration",
        default: null
      },
      trial_duration: {
        type: jspsych.ParameterType.INT,
        pretty_name: "Trial duration",
        default: null
      },
      response_ends_trial: {
        type: jspsych.ParameterType.BOOL,
        pretty_name: "Response ends trial",
        default: true
      },
    },
  };
  class jsPsychHtmlVasResponsePlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }
    trial(display_element, trial) {

      // Initialize the button as disabled in the HTML string
    html += '<button id="jspsych-html-vas-response-next" class="jspsych-btn" disabled>' + trial.button_label + '</button>';


    // console.log()

          // Determine if the device is likely a mobile device based on screen width

          // var isMobile = window.innerWidth <= 800; // Example threshold for mobile devices
          // var scaleWidth = isMobile ? '90vw' : (trial.scale_width || '500px'); // Use viewport width for mobile
      
      // var isMobile = window.innerWidth <= 800; // Example threshold

      // Adjust scale width for mobile
      // var scaleWidth = isMobile ? window.innerWidth - 40 : trial.scale_width || 500;
      var fontSize = '1.3em'
      // Adjust font size for labels
      // var fontSize = isMobile ? '100%' : '200%';

      // Start building HTML
      var html = '<div id="jspsych-html-vas-response-wrapper" style="margin: 100px 0px;">';

      // half of the thumb width value from jspsych.css, used to adjust the label positions
      var half_thumb_width = 7.5;

      var html = '<div id="jspsych-html-vas-response-wrapper" style="margin: 100px 0px;">';
      html += '<div id="jspsych-html-vas-response-stimulus">' + trial.stimulus + "</div>"; // Increased bottom margin
      html +=
          '<div class="jspsych-html-vas-response-container" style="position:relative; margin: 0 auto 3em auto; ';
          

          // scale is 75% screen width
      html += "width: 75vw";

      html += '">';
      // Create clickable container for VAS
      html += '<div id="jspsych-html-vas-response-vas" style="position: relative; left: 0px; top: 0px; height: ' + trial.scale_height + 'px; width: 100%; ' +
        'cursor: ' + trial.scale_cursor + ';">';
      // Draw horizontal line in VAS container
      html += '<div style="position: relative; background: ' + trial.scale_colour + '; width: 100%; height: 2px; top: ' + (trial.scale_height/2 - 1) + 'px"></div>'
      // Draw selector 'circle'
      var radius = 30;
      html += '<div id="jspsych-html-vas-response-marker" style="visibility: hidden; position: absolute; left: 0px; background-color: ' + trial.marker_colour + '; height: '+radius+'px; width: '+radius+'px; border-radius: 50%; top: ' + (trial.scale_height/2 - radius/2) + 'px"></div>'
      html += "</div>";


      // html += '<div id="jspsych-html-vas-response-vline" style="visibility: hidden; position: absolute; left: 0px; background-color: ' + trial.marker_colour + '; height: ' + trial.scale_height + 'px; width: 2px; top: 0px"></div>'
      // html += "</div>";
      html += "<div>";

      for (var j = 0; j < trial.labels.length; j++) {
        var label_width_perc = 100 / (trial.labels.length - 1);
        var percent_of_range = j * (100 / (trial.labels.length - 1));
        var percent_dist_from_center = ((percent_of_range - 50) / 50) * 100;
        var offset = (percent_dist_from_center * half_thumb_width) / 100;
        var extraStyle = "";
    
        // Adjust alignment for the first label
        if (j === 0) {
            extraStyle = "left: 0%; transform: translateX(-50%);";
        } 
        // Adjust alignment for the last label
            // Adjust alignment for the last label
        else if (j === trial.labels.length - 1) {
            extraStyle = "right: 0%; transform: translateX(50%);"; // Move further to the right

        }
        // Alignment for all other labels
        else {
            extraStyle = "left:calc(" + percent_of_range + "% - (" + label_width_perc + "% / 2) - " + offset + "px);";
        }
    
        html +=
            '<div style="border: 1px solid transparent; display: inline-block; position: absolute; ' +
            extraStyle + // Add extra style for first, last, and other labels
            " text-align: center; width: " + label_width_perc + '%;">';
        html += '<span style="text-align: center; font-size: ' + fontSize + ';">' + trial.labels[j] + "</span>";
        html += "</div>";
    }
    
      
      html += "</div>";
      html += "</div>";
      html += "</div>";

      display_element.innerHTML = html;

      if (trial.prompt !== null) {
        html += trial.prompt;
      }

      // Submit button
      html +=
        '<button id="jspsych-html-vas-response-next" class="jspsych-btn" ' +
        (trial.required ? "disabled" : "") +
        ">" +
        trial.button_label +
        "</button>";

      display_element.innerHTML = html;

      var vas = document.getElementById('jspsych-html-vas-response-vas');
      var dragging = false;  // Flag to track when dragging starts and ends

      // Function to update marker position
      function updateMarkerPosition(clientX) {
        var vas_rect = vas.getBoundingClientRect();
        var circleRadius = radius / 2;
      
        // Ensure the X position is within the bounds of the scale
        // The circle's center should reach the beginning and end of the scale, so no extra radius should be added or subtracted
        var minX = vas_rect.left - radius / 2;
        var maxX = vas_rect.right + radius / 2;
        var boundedX = Math.max(minX, Math.min(clientX, maxX));
      
        var clickX = boundedX - vas_rect.left;
      
        // Adjust marker position and visibility
        var marker = document.getElementById('jspsych-html-vas-response-marker');
        
        // When at the ends of the scale, the circle should be centered on the line
        if(boundedX === minX){
          marker.style.left = '0px'; // Circle will be centered on the 0 line
        } else if(boundedX === maxX){
          marker.style.left = (vas_rect.width - radius) + 'px'; // Circle will be centered on the 100 line
        } else {
          marker.style.left = (clickX - circleRadius) + 'px';
        }
        
        marker.style.visibility = 'visible';
      
        // Normalize and clamp the click position
        var scaleEffectiveWidth = vas_rect.width - radius;
        var normalizedPosition = (clickX - circleRadius) / scaleEffectiveWidth;
        pct_tick = Math.max(0, Math.min(normalizedPosition, 1));
      }
      

// Mousedown event to start dragging
vas.addEventListener('mousedown', function(e) {
  dragging = true;
  updateMarkerPosition(e.clientX);
});

// Mousemove event to update position while dragging
document.addEventListener('mousemove', function(e) {
  if (dragging) {
    updateMarkerPosition(e.clientX);
  }
});

// Mouseup event to end dragging
document.addEventListener('mouseup', function() {
  dragging = false;
});

// for mobile
// Add touch event listeners
vas.addEventListener('touchstart', function(e) {
  e.preventDefault(); // Prevents additional actions like scrolling
  dragging = true;
  updateMarkerPosition(e.touches[0].clientX);
}, { passive: false });

document.addEventListener('touchmove', function(e) {
  if (dragging) {
    updateMarkerPosition(e.touches[0].clientX);
  }
}, { passive: false });

document.addEventListener('touchend', function() {
  dragging = false;
    // Enable the button after touch interaction
    var continueButton = document.getElementById('jspsych-html-vas-response-next');
    if (continueButton) {
      continueButton.disabled = false;
    }
});



      // Add minor ticks
      for (var j = 0; j < trial.labels.length; j++) {
        var label_width_pct = 100 / (trial.labels.length - 1);
        var pct_of_range = j * (100 / (trial.labels.length - 1));
        var mtick = document.createElement('div');
        mtick.style.position = 'absolute';
        mtick.style.height = (trial.scale_height/2) + 'px';
        mtick.style.width = '2px';
        mtick.style.top = (trial.scale_height/4) + 'px';
        mtick.style.background = trial.tick_colour;
        mtick.style.left = (pct_of_range/100 * vas.clientWidth - 1) + 'px';
        vas.appendChild(mtick);
      }

      // Function to move cursor
      var pct_tick = null;
      var vas_enabled = true;

      vas.onclick = function(e) {
        if (!vas_enabled) {
          return;
        }
        var vas = document.getElementById('jspsych-html-vas-response-vas');
        var vas_rect = vas.getBoundingClientRect();
        if (e.clientX <= vas_rect.right && e.clientX >= vas_rect.left) {
          var marker = document.getElementById('jspsych-html-vas-response-marker');
          var circleRadius = radius / 2;
          var clickX = e.clientX - vas_rect.left; // X position within the scale
      
          // Adjust the marker position to center it on the click
          marker.style.left = (clickX - circleRadius) + 'px'; 
          marker.style.visibility = 'visible';
      
          // Normalize the click position to get a value between 0 and 1
          // Adjust for circle radius at both ends
          var scaleEffectiveWidth = vas_rect.width;
          var normalizedPosition = (clickX) / scaleEffectiveWidth;
          pct_tick = Math.max(0, Math.min(normalizedPosition, 1)); // Clamp the value between 0 and 1
      
          console.log(pct_tick);
      
          var continue_button = document.getElementById('jspsych-html-vas-response-next');
          continue_button.disabled = false;
        }
      }
      
      
      
      var response = {
        rt: null,
        response: null,
      };

      function end_trial() {
        jsPsych.pluginAPI.clearAllTimeouts();

        // save data
        var trialdata = {
          rt: response.rt,
          stimulus: trial.stimulus,
          response: response.response,
        };

        display_element.innerHTML = "";

        // next trial
        jsPsych.finishTrial(trialdata);
      };

      var continue_button = document.getElementById('jspsych-html-vas-response-next');
      continue_button.onclick = function() {
        // measure response time
        var endTime = performance.now();
        response.rt = Math.round(endTime - startTime);
        response.response = pct_tick;
        if ((trial.response_ends_trial) && (pct_tick != null)) {
          end_trial();
        } else {
          vas_enabled = false;
        }
      }

      // hide stimulus if stimulus_duration is set
      if (trial.stimulus_duration !== null) {
        jspsych.pluginAPI.setTimeout(function() {
          var stim = document.getElementById('jspsych-html-vas-response-stimulus');
          stim.style.visibility = 'hidden';
        }, trial.stimulus_duration);
      }

      // end trial if trial_duration is set
      if (trial.trial_duration !== null) {
        jspsych.pluginAPI.setTimeout(end_trial, trial.trial_duration);
      }

      var startTime = performance.now();
    }
  }
  jsPsychHtmlVasResponsePlugin.info = info;

  return jsPsychHtmlVasResponsePlugin;
})(jsPsychModule);