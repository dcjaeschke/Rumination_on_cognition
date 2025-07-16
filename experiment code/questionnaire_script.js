jatos.onLoad(() => {
  jatos.studySessionData;
  let warn_n = 0;
  let bonus_warn_n = 0;
  let warning_n;
  let warn = false;

    if (jatos.studySessionData && jatos.studySessionData.warning_n !== undefined) {
        warn_n = jatos.studySessionData.warning_n;
    }

    if (jatos.studySessionData && jatos.studySessionData.bonus_warning !== undefined) {
      bonus_warn_n = jatos.studySessionData.bonus_warning;
  }

  console.log("warn_n", warn_n)

  // get arguments from jatos
  let {
    questions_with_reversed_score,
    attention_questions,
    attention_expected_choice,
    risky_questions,
    risk_threshold,
    score: optionScores,
    options,
    questions,
    welcome_screen,
    button_text,
    button_submit_text,
    review_screen,
    risk_support_message,
    rtl = false, // if rtl not specified set it's value to false
    didnt_choose_option_msg,
    didnt_scroll_down_msg,
    key_code_to_start_experiment,
    questionnaire_name,
    is_horizontal = true, // question's options direction
    review_page_disabled = true,
  } = jatos.componentJsonInput;

  // flag
  var is_unique_options = false;

  // attention questions and their relative expected answers will be stored in a dictionary:
  if (attention_expected_choice.length != attention_questions.length) {
    alert("Error with questionnaire input!");
    throw new Error(
      "\nError with questionnaire input!\nattention_expected_choice.length != attention_questions.length\n"
    );
  }
  let expected_choices_dict = {};
  for (let i = 0; i < attention_expected_choice.length; i++) {
    const expected_choice = attention_expected_choice[i];
    // get the corresponding attention question number
    question_number = attention_questions[i];
    expected_choices_dict[question_number] = expected_choice;
  }

  // in case each question has unique set of options
  if (options.length > 0 && options[0] instanceof Array) {
    // each question has a unique set of available option
    if (options.length != questions.length) {
      alert("Error with questionnaire input!");
      throw new Error(
        "\nError with questionnaire input!\noptions is array of arrays but options.length != questions.length\n"
      );
    }
    is_unique_options = true;
    if (options.length != optionScores.length) {
      alert("Error with questionnaire input!");
      throw new Error(
        "\nError with questionnaire input!\noptions is array of arrays but options.length != score.length\n"
      );
    } 

    for (let i = 0; i < questions.length; i++) {
      if (options[i].length != optionScores[i].length) {
        alert("Error with questionnaire input!");
        throw new Error(
          `\nError with questionnaire input!\noptions is array of arrays but options[${i}].length != questions[${i}].length\n`
        );
      } 
    }
  }else{
    if (options.length != optionScores.length) {
      alert("Error with questionnaire input!");
      throw new Error(
        "\nError with questionnaire input!\noptions.length != score.length\n"
      );
    } 
  }

  // original_text
  const original_text = { questions: [], options: [] };
  original_text.questions = questions.map((q, i) => {
    return {
      question_number: i + 1,
      question_text: encodeURIComponent(`${q.question}`),
    };
  });
  if (is_unique_options) {
    original_text.options = options.map((options_set, j) => {
      return {
        options_set_num: j + 1,
        option_set: options_set.map((o, i) => {
          return {
            option_number: i + 1,
            option_text: encodeURIComponent(`${o}`),
          };
        }),
      };
    });
    console.log(options);
    console.log(optionScores);
  } else {
    original_text.options = options.map((o, i) => {
      return { option_number: i + 1, option_text: encodeURIComponent(`${o}`) };
    });
  }

  // results
  const results = {
    timestamp_started_questionnaire: null,
    time_started_questionnaire: null,
    questionnaire_name: questionnaire_name,
    timestamp_final_submit: null,
    Score: 0,
    encoded_text: original_text,
    answers_data: questions,
    warning: null,
    warning_n: 0,
  };

  /* 
  example: 
  answers_data = [
    {
      question_number: 1,
      question_text: "",
      final_choice: 0,
      choice_text: "",
      timestamp_submit: null,
      selection_history: [			{"1694520249025":3}		],
      "selection_history_review_page":			[		]
      question_score: null,
    }

  ] */

  var userScore = 0;
  var userScrolledAllTheWayDown = false;
  var userCanProceed = false;
  var flag_risk_screen = false;

  // add fields to the questions object
  questions = questions.map((q, i) => {
    return {
      question_number: i + 1,
      ...q,
      question_text: questions[i].question,
      final_choice: null,
      choice_text: "",
      question_score: null,
      selection_history_first_appearence: [], // [{ 1694520249025: 3 }]
      timestamp_submit: null,
      selection_history_review_pages: [], // [{ 1694520249025: 3 }]
      isRisky: risky_questions.includes(i + 1),
      isAttention: attention_questions.includes(i + 1),
      isScoringReveresed: questions_with_reversed_score.includes(i + 1),
      //
      userAnswer: null,
    };
  });

  // vars:
  let currentQuestionIndex = 0;
  const startPageElement = document.querySelector(".start-page");
  const questionPageElement = document.querySelector(".question-page");
  const reviewPageElement = document.getElementById("review-page");
  const SupportPageElement = document.getElementById("risk_support_page");

  // add text to components
  $("#welcome_screen").html(`<bdi>${welcome_screen}</bdi>`);
  $("#question-submit-button").html(`<bdi>${button_text}</bdi>`);
  $("#review-submit-button").html(`<bdi>${button_submit_text}</bdi>`);
  $("#risk-support-btn").html(`<bdi>${button_submit_text}</bdi>`);
  $("#review-text").html(`<bdi>${review_screen}</bdi>`);
  $("#risk_support_message").html(`<bdi>${risk_support_message}</bdi>`);
  $("#question-submit-button").on("click", submitAnswer);

  // create option buttons
  if (!is_unique_options) {
    create_option_buttons(
      $("#options"),
      options,
      (option_classname = "option"),
      (onclickFunc = (i) => selecetOption(i))
    );
  }

  function create_option_buttons(
    parent,
    array_of_options,
    option_classname,
    onclickFunc
  ) {
    parent.empty();

    let array_of_buttons = array_of_options.map((op, i) => {
      const button = document.createElement("bdi");
      button.classList.add(option_classname);
      if (!is_horizontal)
        button.classList.add(option_classname + "-horizontal");
      button.onclick = () => onclickFunc(i);

      button.textContent = op;
      return button;
    });

    parent.append(array_of_buttons);
  }

  if (!is_horizontal) {
    $("#options").css({ flexDirection: "column" });
  }

  if (rtl) {
    //change text-align to Right!
    if (is_horizontal) {
      $("#options").css("flexDirection", "row-reverse");
    }
    $(".review-question").css("textAlign", "right");
    // $("#question").css("textAlign", "right");
    $("#question").css("textAlign", "center");
    $("#review-text").css("textAlign", "right");
    $("#risk_support_message").css("textAlign", "right");
  }

  // start screen
  if (typeof key_code_to_start_experiment == "number") {
    // add key press listener
    function questionnaire_start(event) {
      if (event.keyCode === key_code_to_start_experiment) {
        if (currentQuestionIndex === 0) {
          results.timestamp_started_questionnaire = Date.now();
          results.time_started_questionnaire = Date().toString();
          startPageElement.style.display = "none";
          questionPageElement.style.display = "flex";
          displayQuestion(currentQuestionIndex);
          document.removeEventListener("keydown", questionnaire_start);
        }
      }
    }
    document.addEventListener("keydown", questionnaire_start);
  } else {
    // add button
    const button = document.createElement("div");
    button.textContent = key_code_to_start_experiment;
    button.classList.add("submit-button");
    button.onclick = () => {
      // start questionnaire
      results.timestamp_started_questionnaire = Date.now();
      results.time_started_questionnaire = Date().toString();
      startPageElement.style.display = "none";
      questionPageElement.style.display = "flex";
      displayQuestion(currentQuestionIndex);
    };
    $(".start-page").append(button);
  }

  function displayQuestion(index) {
    userCanProceed = false; // Flag to track if the user can proceed to the next question
    $("#question-number").text(`${index + 1}/${questions.length}`);
    $("#question").html(`<bdi>${questions[index].question}</bdi>`);
    $(".option").removeClass("selected-option");
    if (is_unique_options) {
      create_option_buttons(
        $("#options"),
        options[index],
        (option_classname = "option"),
        (onclickFunc = (i) => selecetOption(i))
      );
    }
    $("#question-submit-button").removeClass("can_submit");
  }

  function selecetOption(selectedIndex) {
    // Clear the previous selection
    $(".option").removeClass("selected-option");
    // Change the selected answer's style to green
    $(".option").eq(selectedIndex).addClass("selected-option");

    questions[currentQuestionIndex].userAnswer = selectedIndex;
    questions[currentQuestionIndex].selection_history_first_appearence.push({
      time: Date.now(),
      option: selectedIndex + 1,
    });

    // Allow the user to proceed to the next question
    userCanProceed = true;
    $("#question-submit-button").addClass("can_submit");
  }

  function submitAnswer() {
    questions[currentQuestionIndex].timestamp_submit = Date.now();
    if (userCanProceed) {
      currentQuestionIndex++;
      if (currentQuestionIndex < questions.length) {
        displayQuestion(currentQuestionIndex);
      } else {
        if (!review_page_disabled) {
          displayReviewPage();
        } else {
          submitFinalAnswers();
        }
      }
    } else {
      alert(didnt_choose_option_msg);
    }
  }

  function displayReviewPage() {
    questionPageElement.style.display = "none";
    reviewPageElement.style.display = "block";

    $("#review-submit-button").on("click", submitFinalAnswers);

    questions.forEach((question, index) => {
      var reviewQuestionContainer = $("<div>", {
        class: "review-question-container",
      });
      $("#box_for_review").append(reviewQuestionContainer);

      const aligned_number_and_question = document.createElement("div");
      reviewQuestionContainer.append(aligned_number_and_question);
      aligned_number_and_question.classList.add("aligned_number_and_question");

      const questionNumber = document.createElement("div");
      questionNumber.textContent = `${index + 1}) `;
      if (rtl) {
        questionNumber.textContent = ` (${index + 1}`;
      }
      questionNumber.classList.add("review-question-number");

      const questionText = document.createElement("div");
      questionText.innerHTML = `<bdi>${questions[index].question}</bdi>`;
      questionText.classList.add("review-question");

      const optionsList = $("<div>", {
        class: "review-options",
      });
      let q_options = is_unique_options ? options[index] : options;
      // add all options
      create_option_buttons(
        optionsList,
        q_options,
        "review-option",
        (onclickFunc = (i) => changeAnswer(index, i))
      );

      optionsList
        .children()
        [question.userAnswer].classList.add("selected-review-option");

      aligned_number_and_question.appendChild(questionNumber);
      aligned_number_and_question.appendChild(questionText);

      reviewQuestionContainer.append(optionsList);
    });

    if (!is_horizontal) {
      $(".review-options").css({ flexDirection: "column" });
    }

    if (rtl) {
      if (is_horizontal) {
        $(".review-options").css("flexDirection", "row-reverse");
      }
      $(".aligned_number_and_question").css("textAlign", "right");
      $(".aligned_number_and_question").css("flexDirection", "row-reverse");
    }

    // make sure user scrolled all the way down
    make_sure_user_scrolled($("#review-questions"), $("#review-submit-button"));
  }

  function make_sure_user_scrolled(component, btn) {
    userScrolledAllTheWayDown = false;
    if (
      component.scrollTop() + component.height() >=
      component[0].scrollHeight - 100
    ) {
      // no need to scroll
      userScrolledAllTheWayDown = true;
      if (btn) btn.addClass("finished-scrolling");
      component.unbind();
    } else {
      // add scroll event listener
      component.on("scroll", () => {
        if (
          component.scrollTop() + component.height() >=
          component[0].scrollHeight - 100
        ) {
          // scrolled all the way down
          userScrolledAllTheWayDown = true;
          if (btn) btn.addClass("finished-scrolling");
          component.unbind();
        }
      });
    }
  }

  function changeAnswer(questionIndex, newAnswerIndex) {
    questions[questionIndex].userAnswer = newAnswerIndex;
    questions[questionIndex].selection_history_review_pages.push({
      time: Date.now(),
      option: newAnswerIndex + 1,
    });

    // Update the displayed answer on the review page
    const reviewQuestion = document.querySelectorAll(
      ".review-question-container"
    )[questionIndex];

    const optionItems = reviewQuestion.querySelectorAll(".review-option");

    optionItems.forEach((item, i) => {
      if (i === newAnswerIndex) {
        item.classList.add("selected-review-option");
      } else {
        item.classList.remove("selected-review-option");
      }
    });
  }

  function submitFinalAnswers() {
    if (review_page_disabled || userScrolledAllTheWayDown) {
      // Calculae score
      for (let i = 0; i < questions.length; i++) {
        if (is_unique_options) {
          var Options = options[i];
          var OptionScores = optionScores[i];
        } else {
          var Options = options;
          var OptionScores = optionScores;
        }

        Q = questions[i];
        Q.final_choice = Q.userAnswer + 1;
        Q.choice_text = Options[Q.userAnswer];
        if (OptionScores.length < Options.length) {
          // more options than score_options
          Q.question_score = null;
        } else {
          Q.question_score = OptionScores[Q.userAnswer];
          if (Q.isScoringReveresed) {
            Q.question_score =
              OptionScores[OptionScores.length - 1 - Q.userAnswer];
          }
        }

        if (Q.isRisky && Q.question_score > Math.min(...OptionScores)) {
          flag_risk_screen = true;
        }

        if (Q.isAttention) {
          if (Q.final_choice !== expected_choices_dict[i + 1]) {
            Q.question_score = 0;
            warn = true;
            warn_n++;
            bonus_warn_n++;
          } else {
            Q.question_score = 1;
          }
        } else {
          userScore += Q.question_score;
        }
      }

      // Submission of answers
      results.timestamp_final_submit = Date.now();
      results.Score = userScore;
      results.warning = warn;
      results.warning_n = warn_n;
      results.bonus_warning = bonus_warn_n;
      warning_n = warn_n;
      jatos.studySessionData.warning_n = warn_n;
      jatos.studySessionData.bonus_warning = bonus_warn_n;

      results.answers_data = questions.map((q) => {
        let { userAnswer, question, ...rest } = q;
        return rest;
      });

      if (userScore >= risk_threshold || flag_risk_screen) {
        // Show risk_support_message
        questionPageElement.style.display = "none";
        reviewPageElement.style.display = "none";
        SupportPageElement.style.display = "flex";

        make_sure_user_scrolled(
          $("#risk_support_message"),
          $("#risk-support-btn")
        );
        $("#risk-support-btn").on("click", continue_study_after_warning);
      } else {
        console.log("warning_n", warning_n)
        if (warn_n >= 2) {
          append_data_to_jatos(JSON.stringify(results),
          jatos.startComponentByTitle("exit_page"));
        }  else { 
          append_data_to_jatos(JSON.stringify(results), jatos.startNextComponent);
          }      }
    } else {
      alert(didnt_scroll_down_msg);
    }
  }

  function continue_study_after_warning() {
    if (userScrolledAllTheWayDown) {
      if (warn_n >= 2) {
        append_data_to_jatos(JSON.stringify(results),
        jatos.startComponentByTitle("exit_page"));
      }  else { 
        append_data_to_jatos(JSON.stringify(results), 
        jatos.startNextComponent);
        }
    } else {
      alert(didnt_scroll_down_msg);
    }
  }
});
