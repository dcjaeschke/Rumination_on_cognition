// do not forget to add the following to the html header:
//   <link rel="stylesheet" href="https://static.psyact.org/jatos_append/jquery-ui.css"/>
//   <script src="https://static.psyact.org/jatos_append/jquery-ui.min.js"></script>
//   <script src="https://static.psyact.org/jatos_append/jquery.min.js"></script>

// and this to the html body:
//<div id="dialog" title="Connection Error" style="display: none;">
// <p>Your internet connection has dropped.</p>
// <button id="checkAgain">Check Connection Again</button>
// </div>
function append_data_to_jatos(data, callback) { 
  jatos.onLoad(function () {
    console.log("append start")
    var flag_offline = false;
    var disconnected_trial_time_start;

    function showConnectionDialog() {
      console.log("showDialog start")
      var dialogBox = document.getElementById('dialog');
      console.log(document.getElementById('dialog'));
      console.log(dialogBox);
      //if (dialogBox) {
        //dialogBox.style.display = 'block'; // Show the dialog box
      //} else {
        alert("Your internet connection has dropped. Reconnect and try again.");
      //}

      /* Create div for dialog box
      var dialogBox = document.createElement("div");
      dialogBox.id = "dialog";
      dialogBox.style.display = "none";
      dialogBox.innerHTML = "<p>Your internet connection has dropped.</p>";

      // Create buttons and append them to the dialog box
      var buttonRetry = document.createElement("button");
      buttonRetry.id = "checkAgain";
      buttonRetry.innerHTML = "Check Connection Again";
      dialogBox.appendChild(buttonRetry);

      var buttonCancel = document.createElement("button");
      buttonCancel.id = "cancel";
      buttonCancel.innerHTML = "Cancel (this will end the experiment)";
      dialogBox.appendChild(buttonCancel);

      // Append dialog box to body
      document.body.appendChild(dialogBox);
    
      $(dialogBox).dialog({
        modal: true,
        draggable: false,
        resizable: false,
        width: 400,
        closeOnEscape: false,
        open: function (event, ui) {
          $(".ui-dialog-titlebar-close", ui.dialog || ui).hide();
        },
      });

      $("#checkAgain").click(function () {
        if (navigator.onLine) {
          trySaveData();
        } else {
          alert("Connection still not restored. Please check again.");
        }
      });

      $("#cancel").click(function () {
        $(dialogBox).dialog("close");
        jatos.endStudy(data); // End the study without saving further data
      });
      */
    }

    function trySaveData() {
      console.log("trySaveData")
      if (navigator.onLine) {
        jatos.appendResultData(data);
        if (callback) 
          callback();// Invoke the callback when data is saved
        console.log("callback"); 
        flag_offline = false;
      } else {
        console.log("offline");
        if (!flag_offline) {
          disconnected_trial_time_start = Date.now();
          console.log("time for offline");
        }
          flag_offline = true;
          console.log("tries to connect again");
          showConnectionDialog(); // Show the dialog only when connection is first lost
        // Retry saving data every 3 seconds until connection is restored
        setTimeout(trySaveData, 3000);
      }
    }
    // Initial attempt to save data
    trySaveData();
  })}
